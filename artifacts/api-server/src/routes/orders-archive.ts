/**
 * Data & Storage: date-filtered order archive (ZIP download) and guarded
 * cleanup (delete) so the owner can move old orders to a hard drive and free
 * database + file-storage space.
 *
 * Safety model:
 *  - all three endpoints are admin-only (processing staff blocked);
 *  - deleting additionally requires the two-partner settings unlock AND a
 *    fresh "export receipt" issued with the ZIP download for the exact same
 *    filter — nothing can be deleted that wasn't just archived;
 *  - only finished orders (delivered / returned / cancelled) are ever
 *    deleted; anything still in flight is skipped automatically.
 */
import { Router, type IRouter, type Request, type Response } from "express";
// archiver v8 is pure ESM with named exports (no default / callable factory).
import { ZipArchive } from "archiver";
import { and, asc, inArray } from "drizzle-orm";
import {
  db,
  ordersTable,
  paymentVerificationsTable,
  settingsChangeHistoryTable,
  type Order,
  type PaymentVerification,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { hasSettingsUnlock, getPartnerEmails } from "../lib/settingsOtp";
import { sendSettingsChangedEmail } from "../lib/email";
import { deleteFromStorage, listStorageFileSizes, storageReadStream } from "../lib/storage";
import {
  parseArchiveFilter,
  archiveFilterConditions,
  isDeletableStatus,
  DELETABLE_STATUSES,
  countByStatus,
  orderFileRefs,
  buildOrdersCsv,
  buildFamilyCardsCsv,
  buildVerificationsCsv,
  deletableFingerprint,
  createArchiveReceipt,
  verifyArchiveReceipt,
  sourceLabel,
  formatBytes,
  ORDERS_CLEANUP_HISTORY_FIELD,
  ARCHIVE_RECEIPT_TTL_SECONDS,
  type ArchiveFilter,
} from "../lib/orderArchive";

const router: IRouter = Router();

const CONFIRM_WORD = "DELETE";

async function loadOrdersForFilter(filter: ArchiveFilter): Promise<Order[]> {
  return db
    .select()
    .from(ordersTable)
    .where(and(...archiveFilterConditions(filter)))
    .orderBy(asc(ordersTable.createdAt), asc(ordersTable.id));
}

async function loadVerificationsForOrders(orderIds: number[]): Promise<PaymentVerification[]> {
  const out: PaymentVerification[] = [];
  for (let i = 0; i < orderIds.length; i += 500) {
    const chunk = orderIds.slice(i, i + 500);
    out.push(
      ...(await db
        .select()
        .from(paymentVerificationsTable)
        .where(inArray(paymentVerificationsTable.orderId, chunk)))
    );
  }
  return out;
}

// ── GET /admin/orders/archive/preview ───────────────────────────────────────
router.get("/admin/orders/archive/preview", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const parsed = parseArchiveFilter(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { filter } = parsed;

    const rows = await loadOrdersForFilter(filter);
    const deletable = rows.filter((r) => isDeletableStatus(r.status));
    const skipped = rows.filter((r) => !isDeletableStatus(r.status));

    // One storage listing gives every file size; if it fails the preview
    // still works, just without byte estimates.
    let sizes: Map<string, number> | null = null;
    try {
      sizes = await listStorageFileSizes();
    } catch (err) {
      req.log.warn({ err }, "Archive preview: storage listing failed; sizes unknown");
    }

    const tally = (orders: Order[]) => {
      let files = 0;
      let bytes = 0;
      for (const o of orders) {
        for (const ref of orderFileRefs(o)) {
          if (sizes && !sizes.has(ref.key)) continue; // missing in storage — nothing to count
          files += 1;
          bytes += sizes?.get(ref.key) ?? 0;
        }
      }
      return { files, bytes };
    };

    const deletableFiles = tally(deletable);
    const allFiles = tally(rows);

    res.json({
      filter,
      total: rows.length,
      byStatus: countByStatus(rows),
      deletable: { count: deletable.length, files: deletableFiles.files, bytes: deletableFiles.bytes },
      skipped: { count: skipped.length, byStatus: countByStatus(skipped) },
      archive: { files: allFiles.files, bytes: allFiles.bytes },
      sizesKnown: sizes !== null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to build archive preview");
    res.status(500).json({ error: "Failed to check this date range" });
  }
});

// ── GET /admin/orders/archive/export ────────────────────────────────────────
router.get("/admin/orders/archive/export", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const parsed = parseArchiveFilter(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { filter } = parsed;

    const rows = await loadOrdersForFilter(filter);
    if (rows.length === 0) {
      res.status(404).json({ error: "No orders in this date range — nothing to download" });
      return;
    }
    const verifications = await loadVerificationsForOrders(rows.map((r) => r.id));

    const deletable = rows.filter((r) => isDeletableStatus(r.status));

    // Which stored files actually exist (single listing, also gives sizes).
    // FAIL CLOSED: if the listing is unavailable while this range has uploaded
    // files, the ZIP would silently miss every upload — refuse to issue a
    // receipt that could then authorize deleting files that were never saved.
    const anyFileRefs = rows.some((o) => orderFileRefs(o).length > 0);
    let sizes: Map<string, number>;
    let listingOk = true;
    try {
      sizes = await listStorageFileSizes();
    } catch (err) {
      if (anyFileRefs) {
        req.log.error({ err }, "Archive export: storage listing failed; refusing export with uploads pending");
        res.status(503).json({
          error:
            "File storage is not reachable right now, so the ZIP would be missing the uploaded files. Try again in a minute.",
          code: "STORAGE_UNAVAILABLE",
        });
        return;
      }
      req.log.warn({ err }, "Archive export: storage listing failed; range has no uploaded files, continuing");
      sizes = new Map();
      listingOk = false;
    }

    // Receipt is only minted once we know the uploads can be archived.
    const receipt = createArchiveReceipt(filter, deletableFingerprint(deletable), deletable.length);

    type PlannedFile = { key: string; zipPath: string; orderNumber: string };
    const planned: PlannedFile[] = [];
    const missing: PlannedFile[] = [];
    for (const o of rows) {
      for (const ref of orderFileRefs(o)) {
        const target = { key: ref.key, zipPath: ref.zipPath, orderNumber: o.orderNumber };
        if (sizes.has(ref.key)) planned.push(target);
        else missing.push(target);
      }
    }

    const zipName = `orders-archive_${filter.fromDate}_${filter.toDate}_${filter.source}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    res.setHeader("Cache-Control", "no-store");
    // The export receipt unlocks the delete step client-side.
    res.setHeader("X-Archive-Receipt", receipt);
    res.setHeader("X-Archive-Deletable", String(deletable.length));

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("warning", (warn: Error) => req.log.warn({ warn }, "Archive export warning"));
    archive.on("error", (err: Error) => {
      req.log.error({ err }, "Archive export failed mid-stream");
      res.destroy(err);
    });
    archive.pipe(res);

    archive.append(buildOrdersCsv(rows), { name: "orders.csv" });
    archive.append(buildFamilyCardsCsv(rows), { name: "family-cards.csv" });
    archive.append(buildVerificationsCsv(verifications), { name: "payment-verifications.csv" });

    const manifest = {
      generatedAt: new Date().toISOString(),
      filter,
      totals: { orders: rows.length, byStatus: countByStatus(rows), paymentVerifications: verifications.length },
      deletable: {
        count: deletable.length,
        note: "Only these finished orders (delivered/returned/cancelled) can be deleted from the server.",
        orderNumbers: deletable.map((o) => o.orderNumber),
      },
      files: {
        included: planned.length,
        missingFromStorage: missing.map((m) => ({ order: m.orderNumber, file: m.key })),
        sizesKnown: listingOk,
      },
      receiptValidMinutes: Math.round(ARCHIVE_RECEIPT_TTL_SECONDS / 60),
    };
    archive.append(Buffer.from(JSON.stringify(manifest, null, 2), "utf8"), { name: "manifest.json" });

    for (const f of planned) {
      // GCS read streams are lazy (no connection until read), so queueing all
      // of them up-front is safe; archiver consumes them one at a time.
      archive.append(storageReadStream(f.key), { name: f.zipPath });
    }

    req.log.info(
      { adminEmail: admin.email, orders: rows.length, files: planned.length, filter },
      "Order archive export started"
    );
    await archive.finalize();
  } catch (err) {
    req.log.error({ err }, "Failed to export order archive");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to build the archive. Try again." });
    } else {
      res.destroy(err as Error);
    }
  }
});

// ── POST /admin/orders/archive/delete ───────────────────────────────────────
router.post("/admin/orders/archive/delete", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const parsed = parseArchiveFilter(body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const { filter } = parsed;

    if (body.confirmText !== CONFIRM_WORD) {
      res.status(400).json({ error: `Type ${CONFIRM_WORD} to confirm`, code: "CONFIRM_REQUIRED" });
      return;
    }
    const receiptToken = typeof body.receipt === "string" ? body.receipt : "";
    const receipt = verifyArchiveReceipt(receiptToken, filter);
    if (!receipt.ok) {
      res.status(receipt.code === "RECEIPT_FILTER_MISMATCH" ? 409 : 400).json({ error: receipt.error, code: receipt.code });
      return;
    }

    const rows = await loadOrdersForFilter(filter);
    const deletable = rows.filter((r) => isDeletableStatus(r.status));
    const skipped = rows.filter((r) => !isDeletableStatus(r.status));

    if (deletable.length === 0) {
      res.status(400).json({ error: "No finished orders to delete in this range", code: "NOTHING_DELETABLE" });
      return;
    }
    // The orders must be byte-for-byte the set that was archived: any new,
    // changed or removed order voids the receipt.
    if (deletableFingerprint(deletable) !== receipt.fingerprint) {
      res.status(409).json({
        error: "Orders changed since your download. Download a fresh archive, then delete straight after.",
        code: "RECEIPT_STALE",
      });
      return;
    }

    let sizes: Map<string, number> | null = null;
    try {
      sizes = await listStorageFileSizes();
    } catch {
      sizes = null; // freed-bytes estimate becomes 0; deletion still proceeds
    }

    // Per-chunk transactions with LOCK-FIRST sequencing: each order's status is
    // re-checked under a row lock BEFORE any of its files are touched, so an
    // order re-opened mid-cleanup keeps both its row AND its files. Files are
    // then removed while the rows stay locked (no flip can sneak in), and only
    // orders whose files are fully gone have their rows deleted. Storage
    // deletes are irreversible, so cross-chunk all-or-nothing is impossible —
    // instead every kept order is reported per-order in failedOrders.
    const failed: { orderNumber: string; error: string }[] = [];
    let deletedFiles = 0;
    let freedBytes = 0;
    let deletedOrderCount = 0;

    const CHUNK = 50; // small chunks keep each lock-holding transaction short
    for (let i = 0; i < deletable.length; i += CHUNK) {
      const chunk = deletable.slice(i, i + CHUNK);
      let chunkCleaned = 0;
      try {
        await db.transaction(async (tx) => {
          chunkCleaned = 0;
          const lockedRows = await tx
            .select({ id: ordersTable.id })
            .from(ordersTable)
            .where(
              and(
                inArray(ordersTable.id, chunk.map((o) => o.id)),
                inArray(ordersTable.status, [...DELETABLE_STATUSES])
              )
            )
            .for("update");
          const lockedIds = new Set(lockedRows.map((r) => r.id));

          const fullyCleaned: number[] = [];
          for (const order of chunk) {
            if (!lockedIds.has(order.id)) {
              failed.push({
                orderNumber: order.orderNumber,
                error: "Status changed during clean-up — order and its files were kept",
              });
              continue;
            }
            let fileError: string | null = null;
            for (const ref of orderFileRefs(order)) {
              try {
                const outcome = await deleteFromStorage(ref.key);
                if (outcome === "deleted") {
                  deletedFiles += 1;
                  freedBytes += sizes?.get(ref.key) ?? 0;
                }
              } catch (err) {
                fileError = `Could not delete file ${ref.key}`;
                req.log.error(
                  { err, orderNumber: order.orderNumber, key: ref.key },
                  "Archive cleanup: file delete failed"
                );
                break;
              }
            }
            if (fileError) {
              failed.push({
                orderNumber: order.orderNumber,
                error: `${fileError} — order kept (any files already removed are in your ZIP)`,
              });
            } else {
              fullyCleaned.push(order.id);
            }
          }

          if (fullyCleaned.length > 0) {
            await tx.delete(paymentVerificationsTable).where(inArray(paymentVerificationsTable.orderId, fullyCleaned));
            await tx.delete(ordersTable).where(inArray(ordersTable.id, fullyCleaned));
            chunkCleaned = fullyCleaned.length;
          }
        });
        // Only count rows once the transaction actually committed.
        deletedOrderCount += chunkCleaned;
      } catch (err) {
        req.log.error({ err }, "Archive cleanup: transaction failed; orders in this chunk were kept");
        for (const order of chunk) {
          if (!failed.some((f) => f.orderNumber === order.orderNumber)) {
            failed.push({
              orderNumber: order.orderNumber,
              error: "Deleting failed part-way — order kept (any files already removed are in your ZIP). Try again.",
            });
          }
        }
      }
    }

    const summaryOld = `${deletable.length} finished orders · ${filter.fromDate} → ${filter.toDate} · ${sourceLabel(filter.source)}`;
    const summaryNew = `Deleted ${deletedOrderCount} orders and ${deletedFiles} uploaded files (${formatBytes(freedBytes)} freed) after archive download`;
    // Audit + partner email only when something was actually destroyed.
    if (deletedOrderCount > 0 || deletedFiles > 0) {
      try {
        // The cleanup already happened — an audit-trail hiccup must not turn a
        // successful deletion into a reported failure.
        await db.insert(settingsChangeHistoryTable).values({
          field: ORDERS_CLEANUP_HISTORY_FIELD,
          oldValue: summaryOld,
          newValue: summaryNew,
          changedBy: admin.email,
        });
      } catch (err) {
        req.log.error({ err }, "Archive cleanup: failed to write history row");
      }

      // Notify both partners — fire-and-forget so email issues never block the cleanup.
      void sendSettingsChangedEmail(
        getPartnerEmails(),
        {
          fieldLabel: "Order data cleanup",
          oldValue: summaryOld,
          newValue: summaryNew,
          changedBy: admin.email,
          changedAt: new Date(),
        },
        req.log
      ).catch(() => {});
    }
    req.log.info(
      { adminEmail: admin.email, deletedOrders: deletedOrderCount, deletedFiles, freedBytes, failed: failed.length, filter },
      "Order archive cleanup completed"
    );

    res.json({
      deletedOrders: deletedOrderCount,
      deletedFiles,
      freedBytes,
      skipped: { count: skipped.length, byStatus: countByStatus(skipped) },
      failedOrders: failed,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to delete archived orders");
    res.status(500).json({
      error:
        "Deleting could not finish — the orders are still on the website (some of their files may already be removed; they are in your downloaded ZIP). Try again.",
    });
  }
});

export default router;
