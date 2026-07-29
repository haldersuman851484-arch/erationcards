import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Readable } from "stream";

// Shared mutable state the hoisted db mock reads at query time.
const h = vi.hoisted(() => ({
  orders: [] as unknown[],
  verifications: [] as unknown[],
  /** Rows the in-transaction SELECT ... FOR UPDATE returns; null → all deletable h.orders. */
  txLockRows: null as { id: number }[] | null,
  /** When true, row deletes reject to simulate a DB failure inside the transaction. */
  deleteRejects: false,
}));

// ── DB mock must be declared before any import that pulls in @workspace/db ──
vi.mock("@workspace/db", () => {
  // One chain object per select() call. Three terminal shapes are used by the
  // archive routes + auth path:
  //   select().from().where().orderBy()  → orders list
  //   await select().from().where()      → payment verifications (thenable)
  //   select().from().where().limit(1)   → settings lookup (processing auth)
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => Promise.resolve(h.orders));
    chain.limit = vi.fn(() => Promise.resolve([]));
    // select().from().where().for("update") → locked rows inside the delete transaction.
    chain.for = vi.fn(() =>
      Promise.resolve(
        h.txLockRows ??
          (h.orders as Array<{ id: number; status: string }>)
            .filter((o) => ["delivered", "returned", "cancelled"].includes(o.status))
            .map((o) => ({ id: o.id })),
      ),
    );
    (chain as { then: unknown }).then = (
      onF: (v: unknown) => unknown,
      onR: (e: unknown) => unknown,
    ) => Promise.resolve(h.verifications).then(onF, onR);
    return chain;
  };
  const selectFn = vi.fn(() => makeChain());

  const valuesReturn = Object.assign(Promise.resolve(undefined), {
    onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
  });
  const valuesFn = vi.fn(() => valuesReturn);
  const insertFn = vi.fn(() => ({ values: valuesFn }));

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const updateFn = vi.fn(() => updateChain);

  const deleteWhereFn = vi.fn(() =>
    h.deleteRejects ? Promise.reject(new Error("db down")) : Promise.resolve(undefined),
  );
  const deleteFn = vi.fn(() => ({ where: deleteWhereFn }));

  // The transaction callback gets a tx that shares the same mock fns as db, so
  // existing assertions on db.select / db.delete cover in-transaction calls too.
  const transactionFn = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({ select: selectFn, insert: insertFn, update: updateFn, delete: deleteFn }),
  );

  return {
    db: { select: selectFn, insert: insertFn, update: updateFn, delete: deleteFn, transaction: transactionFn },
    settingsTable: {},
    settingsChangeHistoryTable: {},
    ordersTable: {},
    paymentVerificationsTable: {},
    operatorsTable: {},
    FamilyCardsSchema: { safeParse: (v: unknown) => ({ success: true, data: v ?? [] }) },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL"],
  };
});

vi.mock("../lib/storage", () => ({
  uploadToStorage: vi.fn().mockResolvedValue("/api/uploads/mock.jpg"),
  serveFromStorage: vi.fn().mockResolvedValue(undefined),
  deleteFromStorage: vi.fn().mockResolvedValue("deleted"),
  listStorageFileSizes: vi.fn().mockResolvedValue(new Map()),
  storageReadStream: vi.fn(),
}));

vi.mock("../lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/email")>();
  return { ...actual, sendSettingsChangedEmail: vi.fn().mockResolvedValue(undefined) };
});

process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["MERCHANT_UPI_ID"] = "envdefault@okbank";

const { default: app } = await import("../app.js");
const { db, ordersTable, paymentVerificationsTable, settingsChangeHistoryTable } = await import("@workspace/db");
const { deleteFromStorage, listStorageFileSizes, storageReadStream } = await import("../lib/storage");
const { sendSettingsChangedEmail } = await import("../lib/email");
const {
  createArchiveReceipt,
  deletableFingerprint,
  verifyArchiveReceipt,
  storageKeyFromUploadUrl,
  orderFileRefs,
  parseArchiveFilter,
  toCsvBuffer,
  buildOrdersCsv,
} = await import("../lib/orderArchive");

const TEST_SECRET = "test-secret-for-unit-tests";
const UNLOCK_HEADER = "x-settings-unlock";

function makeAdminToken(email = "admin@test.com", role = "admin"): string {
  return jwt.sign({ email, role }, TEST_SECRET, { expiresIn: "1h" });
}

function makeUnlockToken(): string {
  return jwt.sign({ scope: "settings_unlock", email: "admin@test.com" }, TEST_SECRET, { expiresIn: "15m" });
}

const FILTER = { fromDate: "2025-01-01", toDate: "2025-01-31", source: "both" } as const;

let idSeq = 1;
function makeOrder(over: Record<string, unknown> = {}) {
  const id = (over.id as number | undefined) ?? idSeq++;
  return {
    id,
    orderNumber: `10000000${String(id).padStart(2, "0")}`,
    status: "delivered",
    createdAt: new Date("2025-01-10T10:00:00"),
    updatedAt: new Date("2025-01-15T10:00:00"),
    submittedAt: new Date("2025-01-10T10:05:00"),
    operatorId: null,
    paymentStatus: "confirmed",
    amount: "500",
    quantity: 1,
    cardType: "PHH",
    customerName: "Test Customer",
    customerPhone: "9876543210",
    customerEmail: null,
    rationCardNumber: "RC12345",
    deliveryName: null,
    address: "12 Test Road",
    postOffice: null,
    district: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    paymentMethod: "upi",
    trackingNumber: null,
    courierName: null,
    notes: null,
    familyCards: [],
    rationCardPdfs: [],
    paymentScreenshotUrl: null,
    welcomeLetterUrl: null,
    ...over,
  };
}

/** Collect a binary (zip) response body as a Buffer. */
const binaryParser = ((res: NodeJS.ReadableStream, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
  // supertest's .parse() overload types don't cover binary collectors.
}) as unknown as (str: string) => unknown;

beforeEach(() => {
  vi.clearAllMocks();
  h.orders = [];
  h.verifications = [];
  h.txLockRows = null;
  h.deleteRejects = false;
  vi.mocked(listStorageFileSizes).mockResolvedValue(new Map());
  vi.mocked(deleteFromStorage).mockResolvedValue("deleted");
  vi.mocked(storageReadStream).mockImplementation(() => Readable.from(Buffer.from("filedata")) as never);
});

// ═════════════════════════════ Auth guards ═════════════════════════════

describe("archive endpoints — authentication", () => {
  it("preview rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/admin/orders/archive/preview").query(FILTER);
    expect(res.status).toBe(401);
  });

  it("preview rejects processing-staff tokens (admin only)", async () => {
    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken("staff@test.com", "processing")}`);
    expect(res.status).toBe(403);
  });

  it("export rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/admin/orders/archive/export").query(FILTER);
    expect(res.status).toBe(401);
  });

  it("delete rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/admin/orders/archive/delete").send({ ...FILTER });
    expect(res.status).toBe(401);
  });

  it("delete rejects processing-staff tokens even with an unlock header", async () => {
    const res = await request(app)
      .post("/api/admin/orders/archive/delete")
      .set("Authorization", `Bearer ${makeAdminToken("staff@test.com", "processing")}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ ...FILTER, receipt: "x", confirmText: "DELETE" });
    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════ Preview ═════════════════════════════

describe("GET /api/admin/orders/archive/preview", () => {
  it("rejects malformed dates", async () => {
    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query({ fromDate: "2025-1-1", toDate: "2025-01-31" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
  });

  it("rejects from-date after to-date", async () => {
    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query({ fromDate: "2025-02-01", toDate: "2025-01-01" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
  });

  it("rejects an unknown source", async () => {
    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query({ ...FILTER, source: "weird" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
  });

  it("counts totals, deletable and skipped orders with file sizes", async () => {
    h.orders = [
      makeOrder({
        id: 1,
        status: "delivered",
        paymentScreenshotUrl: "/api/uploads/shot1.jpg",
        rationCardPdfs: [{ cardIndex: 0, pdfUrl: "/api/uploads/card-pdfs/1000000001/0/card.pdf", originalFilename: "card.pdf", downloaded: true }],
      }),
      makeOrder({ id: 2, status: "cancelled" }),
      makeOrder({ id: 3, status: "processing", paymentScreenshotUrl: "/api/uploads/shot3.jpg" }),
    ];
    vi.mocked(listStorageFileSizes).mockResolvedValue(
      new Map([
        ["shot1.jpg", 1000],
        ["card-pdfs/1000000001/0/card.pdf", 2000],
        ["shot3.jpg", 400],
      ]),
    );

    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.byStatus).toEqual({ delivered: 1, cancelled: 1, processing: 1 });
    expect(res.body.deletable).toEqual({ count: 2, files: 2, bytes: 3000 });
    expect(res.body.skipped).toEqual({ count: 1, byStatus: { processing: 1 } });
    expect(res.body.archive).toEqual({ files: 3, bytes: 3400 });
    expect(res.body.sizesKnown).toBe(true);
  });

  it("still answers (sizesKnown=false) when the storage listing fails", async () => {
    h.orders = [makeOrder({ id: 1, paymentScreenshotUrl: "/api/uploads/shot1.jpg" })];
    vi.mocked(listStorageFileSizes).mockRejectedValue(new Error("gcs down"));

    const res = await request(app)
      .get("/api/admin/orders/archive/preview")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.sizesKnown).toBe(false);
    expect(res.body.total).toBe(1);
    // Files are still counted (existence unknown, assume present), bytes are 0.
    expect(res.body.archive).toEqual({ files: 1, bytes: 0 });
  });
});

// ═════════════════════════════ Export ═════════════════════════════

describe("GET /api/admin/orders/archive/export", () => {
  it("404s when the range holds no orders", async () => {
    h.orders = [];
    const res = await request(app)
      .get("/api/admin/orders/archive/export")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(404);
  });

  it("streams a ZIP with receipt + deletable-count headers", async () => {
    h.orders = [
      makeOrder({ id: 1, status: "delivered", paymentScreenshotUrl: "/api/uploads/shot1.jpg" }),
      makeOrder({ id: 2, status: "processing" }),
    ];
    h.verifications = [];
    vi.mocked(listStorageFileSizes).mockResolvedValue(new Map([["shot1.jpg", 1000]]));

    const res = await request(app)
      .get("/api/admin/orders/archive/export")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/zip");
    expect(res.headers["content-disposition"]).toContain("orders-archive_2025-01-01_2025-01-31_both.zip");
    expect(res.headers["x-archive-deletable"]).toBe("1");

    // Receipt is valid for this exact filter and carries the deletable fingerprint.
    const receipt = res.headers["x-archive-receipt"];
    expect(receipt).toBeTruthy();
    const check = verifyArchiveReceipt(receipt!, { ...FILTER });
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.fingerprint).toBe(deletableFingerprint([h.orders[0] as { id: number; updatedAt: Date }]));
      expect(check.count).toBe(1);
    }

    // Body is a real ZIP (PK signature) containing the streamed upload.
    expect((res.body as Buffer).subarray(0, 2).toString("latin1")).toBe("PK");
    expect(vi.mocked(storageReadStream)).toHaveBeenCalledWith("shot1.jpg");
  });

  it("skips files missing from storage instead of failing", async () => {
    h.orders = [
      makeOrder({
        id: 1,
        paymentScreenshotUrl: "/api/uploads/exists.jpg",
        welcomeLetterUrl: "/api/uploads/gone.pdf",
      }),
    ];
    vi.mocked(listStorageFileSizes).mockResolvedValue(new Map([["exists.jpg", 10]]));

    const res = await request(app)
      .get("/api/admin/orders/archive/export")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(vi.mocked(storageReadStream)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storageReadStream)).toHaveBeenCalledWith("exists.jpg");
  });

  it("fails closed (503, no receipt) when the storage listing fails and uploads exist", async () => {
    h.orders = [makeOrder({ id: 1, status: "delivered", paymentScreenshotUrl: "/api/uploads/shot1.jpg" })];
    vi.mocked(listStorageFileSizes).mockRejectedValue(new Error("gcs down"));

    const res = await request(app)
      .get("/api/admin/orders/archive/export")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`);

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("STORAGE_UNAVAILABLE");
    expect(res.headers["x-archive-receipt"]).toBeUndefined();
  });

  it("still exports (with receipt) on listing failure when the range has no uploads", async () => {
    h.orders = [makeOrder({ id: 1, status: "delivered" })];
    vi.mocked(listStorageFileSizes).mockRejectedValue(new Error("gcs down"));

    const res = await request(app)
      .get("/api/admin/orders/archive/export")
      .query(FILTER)
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers["x-archive-receipt"]).toBeTruthy();
    expect((res.body as Buffer).subarray(0, 2).toString("latin1")).toBe("PK");
  });
});

// ═════════════════════════════ Delete ═════════════════════════════

function deletableRows() {
  return [
    makeOrder({
      id: 1,
      status: "delivered",
      paymentScreenshotUrl: "/api/uploads/shot1.jpg",
      rationCardPdfs: [{ cardIndex: 0, pdfUrl: "/api/uploads/card-pdfs/1000000001/0/card.pdf", originalFilename: "card.pdf", downloaded: true }],
    }),
    makeOrder({ id: 2, status: "cancelled" }),
    makeOrder({ id: 3, status: "processing" }),
  ];
}

function receiptFor(rows: unknown[]): string {
  const deletable = (rows as Array<{ status: string; id: number; updatedAt: Date }>).filter((r) =>
    ["delivered", "returned", "cancelled"].includes(r.status),
  );
  return createArchiveReceipt({ ...FILTER }, deletableFingerprint(deletable), deletable.length);
}

function del() {
  return request(app)
    .post("/api/admin/orders/archive/delete")
    .set("Authorization", `Bearer ${makeAdminToken()}`)
    .set(UNLOCK_HEADER, makeUnlockToken());
}

describe("POST /api/admin/orders/archive/delete", () => {
  it("403s with SETTINGS_LOCKED when the two-partner unlock is missing", async () => {
    h.orders = deletableRows();
    const res = await request(app)
      .post("/api/admin/orders/archive/delete")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });

  it("requires the typed DELETE confirmation word", async () => {
    h.orders = deletableRows();
    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "delete" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CONFIRM_REQUIRED");
  });

  it("rejects a garbage receipt", async () => {
    h.orders = deletableRows();
    const res = await del().send({ ...FILTER, receipt: "not-a-jwt", confirmText: "DELETE" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("RECEIPT_INVALID");
  });

  it("rejects a receipt with the wrong scope (e.g. a settings unlock token)", async () => {
    h.orders = deletableRows();
    const res = await del().send({ ...FILTER, receipt: makeUnlockToken(), confirmText: "DELETE" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("RECEIPT_INVALID");
  });

  it("rejects an expired receipt", async () => {
    h.orders = deletableRows();
    const expired = jwt.sign(
      { scope: "orders_archive_receipt", fk: "2025-01-01|2025-01-31|both", fp: "abc", n: 2 },
      TEST_SECRET,
      { expiresIn: -10 },
    );
    const res = await del().send({ ...FILTER, receipt: expired, confirmText: "DELETE" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("RECEIPT_EXPIRED");
  });

  it("409s when the receipt was issued for a different filter", async () => {
    h.orders = deletableRows();
    const otherFilter = { fromDate: "2024-01-01", toDate: "2024-12-31", source: "both" as const };
    const deletable = deletableRows().filter((r) => r.status !== "processing");
    const receipt = createArchiveReceipt(otherFilter, deletableFingerprint(deletable as never), 2);
    const res = await del().send({ ...FILTER, receipt, confirmText: "DELETE" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("RECEIPT_FILTER_MISMATCH");
  });

  it("409s RECEIPT_STALE when orders changed after the download", async () => {
    h.orders = deletableRows();
    // Receipt built from the same ids but an older updatedAt → fingerprint differs.
    const stale = deletableRows().map((r) => ({ ...r, updatedAt: new Date("2024-12-01T00:00:00") }));
    const res = await del().send({ ...FILTER, receipt: receiptFor(stale), confirmText: "DELETE" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("RECEIPT_STALE");
    expect(vi.mocked(db.delete as never)).not.toHaveBeenCalled();
  });

  it("400s NOTHING_DELETABLE when every order in range is still in progress", async () => {
    h.orders = [makeOrder({ id: 7, status: "printed" }), makeOrder({ id: 8, status: "dispatched" })];
    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("NOTHING_DELETABLE");
    expect(vi.mocked(db.delete as never)).not.toHaveBeenCalled();
  });

  it("deletes files then rows for finished orders only, records an audit row and emails partners", async () => {
    h.orders = deletableRows();
    vi.mocked(listStorageFileSizes).mockResolvedValue(
      new Map([
        ["shot1.jpg", 1000],
        ["card-pdfs/1000000001/0/card.pdf", 2000],
      ]),
    );

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(2);
    expect(res.body.deletedFiles).toBe(2);
    expect(res.body.freedBytes).toBe(3000);
    expect(res.body.skipped).toEqual({ count: 1, byStatus: { processing: 1 } });
    expect(res.body.failedOrders).toEqual([]);

    // Storage deletions used the exact stored keys.
    expect(vi.mocked(deleteFromStorage)).toHaveBeenCalledWith("shot1.jpg");
    expect(vi.mocked(deleteFromStorage)).toHaveBeenCalledWith("card-pdfs/1000000001/0/card.pdf");

    // Verifications are removed before orders, both via the mocked delete().
    const deleteMock = vi.mocked(db.delete as unknown as ReturnType<typeof vi.fn>);
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(deleteMock.mock.calls[0][0]).toBe(paymentVerificationsTable);
    expect(deleteMock.mock.calls[1][0]).toBe(ordersTable);

    // Audit row in settings_change_history.
    const insertMock = vi.mocked(db.insert as unknown as ReturnType<typeof vi.fn>);
    expect(insertMock).toHaveBeenCalledWith(settingsChangeHistoryTable);
    const valuesFn = insertMock.mock.results[0]!.value.values as ReturnType<typeof vi.fn>;
    const audit = valuesFn.mock.calls[0]![0] as Record<string, string>;
    expect(audit.field).toBe("orders_cleanup");
    expect(audit.changedBy).toBe("admin@test.com");
    expect(audit.newValue).toContain("Deleted 2 orders");

    expect(vi.mocked(sendSettingsChangedEmail)).toHaveBeenCalledTimes(1);
  });

  it("keeps an order (and reports it) when one of its files cannot be deleted", async () => {
    h.orders = deletableRows();
    vi.mocked(deleteFromStorage).mockRejectedValueOnce(new Error("gcs down"));

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(1); // order 2 (no files) still deleted
    expect(res.body.failedOrders).toHaveLength(1);
    expect(res.body.failedOrders[0].orderNumber).toBe("1000000001");
  });

  it("counts already-missing files as freed rows but not as deleted files", async () => {
    h.orders = [makeOrder({ id: 1, status: "delivered", paymentScreenshotUrl: "/api/uploads/shot1.jpg" })];
    vi.mocked(deleteFromStorage).mockResolvedValue("missing");

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(1);
    expect(res.body.deletedFiles).toBe(0);
    expect(res.body.freedBytes).toBe(0);
  });

  it("keeps an order AND its files untouched when its status flipped after receipt validation", async () => {
    h.orders = deletableRows();
    // In-transaction row lock only returns order 2 — order 1 was re-opened concurrently.
    h.txLockRows = [{ id: 2 }];

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(1);
    expect(res.body.failedOrders).toHaveLength(1);
    expect(res.body.failedOrders[0].orderNumber).toBe("1000000001");
    expect(res.body.failedOrders[0].error).toContain("Status changed");
    // Lock-first sequencing: the flipped order's files must NOT be deleted
    // (order 1 owns every file in the fixture; order 2 has none).
    expect(vi.mocked(deleteFromStorage)).not.toHaveBeenCalled();
    expect(res.body.deletedFiles).toBe(0);
  });

  it("keeps every order (reported per order) when the database fails inside the transaction", async () => {
    h.orders = deletableRows();
    h.deleteRejects = true;

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    // Rows rolled back; files removed before the failure are reported honestly.
    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(0);
    expect(res.body.failedOrders).toHaveLength(2);
    expect(res.body.failedOrders.map((f: { orderNumber: string }) => f.orderNumber).sort()).toEqual([
      "1000000001",
      "1000000002",
    ]);
    // Order 1's two files were already removed inside the failed transaction —
    // the audit trail must still record that destruction.
    expect(res.body.deletedFiles).toBe(2);
    const insertMock = vi.mocked(db.insert as unknown as ReturnType<typeof vi.fn>);
    expect(insertMock).toHaveBeenCalledWith(settingsChangeHistoryTable);
    const valuesFn = insertMock.mock.results[0]!.value.values as ReturnType<typeof vi.fn>;
    const audit = valuesFn.mock.calls[0]![0] as Record<string, string>;
    expect(audit.newValue).toContain("Deleted 0 orders and 2 uploaded files");
  });

  it("writes no audit row and sends no email when nothing was destroyed", async () => {
    h.orders = deletableRows();
    // Every deletable order flipped before the lock — nothing is touched.
    h.txLockRows = [];

    const res = await del().send({ ...FILTER, receipt: receiptFor(h.orders), confirmText: "DELETE" });

    expect(res.status).toBe(200);
    expect(res.body.deletedOrders).toBe(0);
    expect(res.body.deletedFiles).toBe(0);
    expect(res.body.failedOrders).toHaveLength(2);
    expect(vi.mocked(deleteFromStorage)).not.toHaveBeenCalled();
    expect(vi.mocked(db.insert as never)).not.toHaveBeenCalled();
    expect(vi.mocked(sendSettingsChangedEmail)).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════ Pure helpers ═════════════════════════════

describe("orderArchive helpers", () => {
  it("parseArchiveFilter validates dates, order and source; defaults source to both", () => {
    expect(parseArchiveFilter({ fromDate: "2025-01-01", toDate: "2025-01-31" })).toEqual({
      ok: true,
      filter: { ...FILTER },
    });
    expect(parseArchiveFilter({ fromDate: "2025-13-01", toDate: "2025-01-31" }).ok).toBe(false);
    expect(parseArchiveFilter({ fromDate: "2025-02-01", toDate: "2025-01-01" }).ok).toBe(false);
    expect(parseArchiveFilter({ fromDate: "2025-01-01", toDate: "2025-01-31", source: "weird" }).ok).toBe(false);
    expect(parseArchiveFilter({ fromDate: "2025-01-01", toDate: "2025-01-31", source: "operator" })).toMatchObject({
      ok: true,
      filter: { source: "operator" },
    });
  });

  it("storageKeyFromUploadUrl only maps /api/uploads/ URLs and blocks traversal", () => {
    expect(storageKeyFromUploadUrl("/api/uploads/abc.jpg")).toBe("abc.jpg");
    expect(storageKeyFromUploadUrl("/api/uploads/card-pdfs/123/0/%E0%A6%95.pdf")).toBe("card-pdfs/123/0/ক.pdf");
    expect(storageKeyFromUploadUrl("https://evil.com/api/uploads/x.jpg")).toBeNull();
    expect(storageKeyFromUploadUrl("/api/uploads/../secret")).toBeNull();
    expect(storageKeyFromUploadUrl("/api/uploads/a/../b")).toBeNull();
    expect(storageKeyFromUploadUrl("/api/uploads/")).toBeNull();
    expect(storageKeyFromUploadUrl(null)).toBeNull();
    expect(storageKeyFromUploadUrl(undefined)).toBeNull();
  });

  it("orderFileRefs collects screenshot, card PDFs and welcome letter, deduped", () => {
    const refs = orderFileRefs({
      orderNumber: "1000000042",
      paymentScreenshotUrl: "/api/uploads/shot.jpg",
      welcomeLetterUrl: "/api/uploads/shot.jpg", // duplicate key → deduped
      rationCardPdfs: [
        { cardIndex: 0, pdfUrl: "/api/uploads/card-pdfs/1000000042/0/এক.pdf", originalFilename: "এক.pdf", downloaded: true },
        { cardIndex: 1, pdfUrl: "https://external.example/x.pdf", originalFilename: "x.pdf", downloaded: false },
      ],
    } as never);
    expect(refs).toHaveLength(2);
    expect(refs[0]).toEqual({ key: "shot.jpg", zipPath: "orders/1000000042/payment-shot.jpg" });
    expect(refs[1]!.key).toBe("card-pdfs/1000000042/0/এক.pdf");
    expect(refs[1]!.zipPath).toBe("orders/1000000042/card-1-এক.pdf");
  });

  it("toCsvBuffer adds a UTF-8 BOM, escapes quotes and guards formula injection", () => {
    const buf = toCsvBuffer(["a", "b"], [["=SUM(A1)", 'say "hi", ok']]);
    const text = buf.toString("utf8");
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("'=SUM(A1)");
    expect(text).toContain('"say ""hi"", ok"');
    expect(text.endsWith("\r\n")).toBe(true);
  });

  it("buildOrdersCsv keeps Bengali text and marks deletable rows", () => {
    const csv = buildOrdersCsv([
      makeOrder({ id: 5, status: "delivered", customerName: "সুমন দাস" }) as never,
      makeOrder({ id: 6, status: "printed" }) as never,
    ]).toString("utf8");
    expect(csv).toContain("সুমন দাস");
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("yes");
    expect(lines[2]).toContain("no");
  });

  it("deletableFingerprint is order-insensitive but change-sensitive", () => {
    const a = { id: 1, updatedAt: new Date("2025-01-01T00:00:00Z") };
    const b = { id: 2, updatedAt: new Date("2025-01-02T00:00:00Z") };
    expect(deletableFingerprint([a, b])).toBe(deletableFingerprint([b, a]));
    expect(deletableFingerprint([a, b])).not.toBe(
      deletableFingerprint([a, { ...b, updatedAt: new Date("2025-01-03T00:00:00Z") }]),
    );
    expect(deletableFingerprint([a])).not.toBe(deletableFingerprint([a, b]));
  });

  it("verifyArchiveReceipt round-trips and binds to the filter", () => {
    const fp = deletableFingerprint([{ id: 1, updatedAt: new Date() }]);
    const token = createArchiveReceipt({ ...FILTER }, fp, 1);
    const ok = verifyArchiveReceipt(token, { ...FILTER });
    expect(ok).toEqual({ ok: true, fingerprint: fp, count: 1 });
    const mismatch = verifyArchiveReceipt(token, { ...FILTER, toDate: "2025-02-28" });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe("RECEIPT_FILTER_MISMATCH");
  });
});
