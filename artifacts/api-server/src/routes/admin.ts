import { Router, Request, Response } from "express";
import { LoginAdminBody, UpdatePricingSettingBody, UpdateContactSettingBody, VerifySettingsOtpBody, UpdateProcessingPasswordBody, UpdateOperatorBody } from "@workspace/api-zod";
import { getAdminCredentials, verifyProcessingLogin, createAdminToken, parseStaffToken, requireAdmin, hashPassword, invalidateProcessingPasswordChangedAtCache } from "../lib/auth";
import {
  getOtpGateStatus,
  createOtpCodes,
  verifyOtpCodes,
  clearOtpState,
  createSettingsUnlockToken,
  hasSettingsUnlock,
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  UNLOCK_TTL_SECONDS,
  getPartnerEmails,
} from "../lib/settingsOtp";
import { sendSettingsOtpEmail, sendSettingsChangedEmail, describeFetchError } from "../lib/email";
import {
  getPricingMatrix,
  getContactInfo,
  setSettingValue,
  getSettingValue,
  PRICING_SETTING_KEY,
  CONTACT_SETTING_KEY,
  PROCESSING_PASSWORD_SETTING_KEY,
  PROCESSING_PASSWORD_CHANGED_AT_SETTING_KEY,
} from "../lib/settings";
import { CONTACT_FIELDS, CONTACT_FIELD_LABELS, contactFieldError, type ContactInfo } from "@workspace/contact";
import { ORDERS_CLEANUP_HISTORY_FIELD, toCsvBuffer, iso, istReadable } from "../lib/orderArchive";
import { formatOperator } from "./operators";

/** Multi-line readable form of the contact details for change-alert emails. */
function formatContactForEmail(c: ContactInfo): string {
  return CONTACT_FIELDS.map((f) => `${CONTACT_FIELD_LABELS[f]}: ${c[f]}`).join("\n");
}
import { db } from "@workspace/db";
import { operatorsTable, settingsChangeHistoryTable, ordersTable } from "@workspace/db";
import { desc, sql, eq, and, ne } from "drizzle-orm";

const router = Router();

/** Compact human-readable summary of a price matrix for the change email. */
function formatPricingForEmail(pricing: {
  ration: { single: { public: number; operator: number }; multi: { public: number; operator: number } };
  special: { single: { public: number; operator: number }; multi: { public: number; operator: number } };
}): string {
  const line = (label: string, tier: { public: number; operator: number }) =>
    `${label}: ₹${tier.public} public / ₹${tier.operator} operator`;
  return [
    line("Ration single", pricing.ration.single),
    line("Ration multi", pricing.ration.multi),
    line("Special single", pricing.special.single),
    line("Special multi", pricing.special.multi),
  ].join("\n");
}

// PATCH /admin/operators/:id/status
router.patch("/admin/operators/:id/status", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid operator ID" }); return; }

    const { status } = req.body;
    if (!["active", "pending", "suspended"].includes(status)) {
      res.status(400).json({ error: "Invalid status value" }); return;
    }

    const result = await db
      .update(operatorsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(operatorsTable.id, id));

    if (!result[0] || result[0].affectedRows === 0) { res.status(404).json({ error: "Operator not found" }); return; }

    const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, id)).limit(1);
    if (!operator) { res.status(404).json({ error: "Operator not found" }); return; }

    res.json({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      status: operator.status,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update operator status");
    res.status(500).json({ error: "Failed to update operator status" });
  }
});

// ── Full operator management (admin only) ────────────────────────────────────

// Plain-language messages for each edit field, used when validation fails.
const OPERATOR_EDIT_HINTS: Record<string, string> = {
  name: "Name must be 2-100 characters",
  email: "Enter a valid email address",
  phone: "Phone must be a 10-digit Indian mobile number (starting 6-9)",
  shopName: "Shop name must be 2-150 characters",
  address: "Address must be 5-500 characters",
  state: "State must be 2-100 characters",
  district: "District must be 2-100 characters",
  pincode: "PIN code must be 6 digits and cannot start with 0",
  status: "Status must be pending, active or suspended",
  walletBalance: "Wallet balance must be between ₹0 and ₹99,99,999.99",
};

/** MySQL duplicate-key error → the unique email index caught a race. */
function isDuplicateEmailError(err: unknown): boolean {
  const e = err as { code?: string; errno?: number } | null;
  return e?.code === "ER_DUP_ENTRY" || e?.errno === 1062;
}

// PATCH /admin/operators/:id — edit every profile field (admin only).
// passwordHash is never accepted, returned, or touched by this route.
router.patch("/admin/operators/:id", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid operator ID" }); return; }

    const parsed = UpdateOperatorBody.safeParse(req.body);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path?.[0] ?? "");
      res.status(400).json({ error: OPERATOR_EDIT_HINTS[field] ?? "Please check the form fields and try again" });
      return;
    }

    const [existing] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Operator not found" }); return; }

    const body = parsed.data;
    const email = body.email.trim();

    // Two operators must never share a login email — reject with a clear message.
    const [emailOwner] = await db
      .select({ id: operatorsTable.id, name: operatorsTable.name })
      .from(operatorsTable)
      .where(and(eq(operatorsTable.email, email), ne(operatorsTable.id, id)))
      .limit(1);
    if (emailOwner) {
      res.status(409).json({ error: `Another operator (${emailOwner.name}) already uses ${email}. Each operator needs their own email.` });
      return;
    }

    await db
      .update(operatorsTable)
      .set({
        name: body.name.trim(),
        email,
        phone: body.phone.trim(),
        shopName: body.shopName.trim(),
        address: body.address.trim(),
        state: body.state.trim(),
        district: body.district.trim(),
        pincode: body.pincode.trim(),
        status: body.status,
        walletBalance: body.walletBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(operatorsTable.id, id));

    const [updated] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, id)).limit(1);
    if (!updated) { res.status(404).json({ error: "Operator not found" }); return; }

    req.log.info({ adminEmail: admin.email, operatorId: id }, "Operator profile edited by admin");
    res.json(formatOperator(updated));
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      // Concurrent edit slipped past the pre-check; the unique index caught it.
      res.status(409).json({ error: "Another operator already uses this email. Each operator needs their own email." });
      return;
    }
    req.log.error({ err }, "Failed to update operator");
    res.status(500).json({ error: "Failed to update operator" });
  }
});

// DELETE /admin/operators/:id — PERMANENTLY delete an operator account.
// Hard delete: login and every operator-token endpoint stop working
// immediately (operator auth centrally re-checks the row in
// requireOperator/parseLiveOperatorToken). Past orders are intentionally left
// untouched — orders.operatorId keeps its value so the public/operator source
// split and the order history stay correct.
router.delete("/admin/operators/:id", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid operator ID" }); return; }

    const [existing] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Operator not found" }); return; }

    // Count and delete inside one transaction so ordersKept reflects the
    // moment of deletion (no drift from orders created between statements),
    // and a failed delete can never report success.
    const outcome = await db.transaction(async (tx) => {
      const [{ kept }] = await tx
        .select({ kept: sql<number>`count(*)` })
        .from(ordersTable)
        .where(eq(ordersTable.operatorId, id));
      const [deleted] = await tx.delete(operatorsTable).where(eq(operatorsTable.id, id));
      return { kept: Number(kept), deletedRows: deleted.affectedRows ?? 0 };
    });

    if (outcome.deletedRows === 0) {
      // Lost a race with a concurrent delete — the account is already gone.
      res.status(404).json({ error: "Operator not found" });
      return;
    }

    req.log.info(
      { adminEmail: admin.email, operatorId: id, operatorEmail: existing.email, ordersKept: outcome.kept },
      "Operator account permanently deleted",
    );
    res.json({ success: true, ordersKept: outcome.kept });
  } catch (err) {
    req.log.error({ err }, "Failed to delete operator");
    res.status(500).json({ error: "Failed to delete operator" });
  }
});

// GET /admin/operators/export — every operator as an Excel-friendly CSV.
// toCsvBuffer prepends a UTF-8 BOM so Bengali names/addresses open correctly
// in Excel. passwordHash is never included.
router.get("/admin/operators/export", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const rows = await db.select().from(operatorsTable).orderBy(operatorsTable.id);
    const header = [
      "ID", "Name", "Email", "Phone", "Shop Name", "Address", "State", "District",
      "PIN Code", "Status", "Wallet Balance (Rs)", "Orders Handled",
      "Joined (IST)", "Joined (ISO)", "Updated (ISO)",
    ];
    const data = rows.map((o) => [
      o.id, o.name, o.email, o.phone, o.shopName, o.address, o.state, o.district,
      o.pincode, o.status, o.walletBalance, o.totalOrdersHandled,
      istReadable(o.createdAt), iso(o.createdAt), iso(o.updatedAt),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="operators_${today}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    req.log.info({ adminEmail: admin.email, count: rows.length }, "Operator roster exported to CSV");
    res.send(toCsvBuffer(header, data));
  } catch (err) {
    req.log.error({ err }, "Failed to export operators");
    res.status(500).json({ error: "Failed to export operators" });
  }
});

// POST /admin/login
router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const body = LoginAdminBody.parse(req.body);

    // Admin credentials first, then processing-staff credentials. The same
    // email may serve both roles — the password decides which panel you get.
    const { email: adminEmail, password: adminPassword } = getAdminCredentials();
    if (body.email === adminEmail && body.password === adminPassword) {
      const token = createAdminToken(body.email, "admin");
      res.json({ role: "admin", email: body.email, token });
      return;
    }

    const processingEmail = await verifyProcessingLogin(body.email, body.password);
    if (processingEmail) {
      const token = createAdminToken(processingEmail, "processing");
      res.json({ role: "processing", email: processingEmail, token });
      return;
    }

    res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(400).json({ error: "Login failed" });
  }
});

// GET /admin/me
router.get("/admin/me", async (req: Request, res: Response) => {
  try {
    const staff = await parseStaffToken(req);
    if (!staff) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json({ role: staff.role, email: staff.email });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /admin/logout
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out" });
});

// ── Support contact details (footer, Contact page, FAQ, policy pages) ──────

// GET /admin/settings/contact — current contact details + whether they're admin-saved or the built-in defaults
router.get("/admin/settings/contact", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const { contact, source } = await getContactInfo();
    res.json({ contact, source });
  } catch (err) {
    req.log.error({ err }, "Failed to load contact setting");
    res.status(500).json({ error: "Failed to load contact setting" });
  }
});

// PUT /admin/settings/contact — save new support contact details (shown across the portal immediately)
router.put("/admin/settings/contact", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const parsed = UpdateContactSettingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Fill in every contact field (phone, email, address, city and hours)." });
      return;
    }
    // Trim, then run the strict shared validation (lengths, phone/email
    // shape, characters that would be unsafe inside HTML / JSON-LD).
    const candidate = Object.fromEntries(
      CONTACT_FIELDS.map((f) => [f, parsed.data.contact[f].trim()]),
    ) as unknown as ContactInfo;
    for (const field of CONTACT_FIELDS) {
      const fieldErr = contactFieldError(field, candidate[field]);
      if (fieldErr) {
        res.status(400).json({ error: `${CONTACT_FIELD_LABELS[field]}: ${fieldErr}` });
        return;
      }
    }

    // Effective values before the save (defaults included) for the audit trail.
    const { contact: previousContact } = await getContactInfo();

    await setSettingValue(CONTACT_SETTING_KEY, JSON.stringify(candidate));
    await db.insert(settingsChangeHistoryTable).values({
      field: CONTACT_SETTING_KEY,
      oldValue: JSON.stringify(previousContact),
      newValue: JSON.stringify(candidate),
      changedBy: admin.email,
    });
    req.log.info({ adminEmail: admin.email }, "Support contact details updated");

    // Notify both partners — fire-and-forget so email issues never block the save.
    void sendSettingsChangedEmail(
      getPartnerEmails(),
      {
        fieldLabel: "Support contact details",
        oldValue: formatContactForEmail(previousContact),
        newValue: formatContactForEmail(candidate),
        changedBy: admin.email,
        changedAt: new Date(),
      },
      req.log,
    ).catch(() => {});

    res.json({ contact: candidate, source: "custom" as const });
  } catch (err) {
    req.log.error({ err }, "Failed to update contact setting");
    res.status(500).json({ error: "Failed to update contact setting" });
  }
});

// GET /admin/settings/pricing — current price matrix + whether it's admin-saved or the built-in default
router.get("/admin/settings/pricing", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }
    res.json(await getPricingMatrix());
  } catch (err) {
    req.log.error({ err }, "Failed to load pricing setting");
    res.status(500).json({ error: "Failed to load pricing setting" });
  }
});

// PUT /admin/settings/pricing — save new card prices (used by forms & server amounts immediately)
router.put("/admin/settings/pricing", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const parsed = UpdatePricingSettingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Each price must be a whole rupee amount between 1 and 10000" });
      return;
    }

    // Effective matrix before the save (built-in defaults included) for the audit trail.
    const { pricing: previousPricing } = await getPricingMatrix();

    const newPricingJson = JSON.stringify(parsed.data.pricing);
    await setSettingValue(PRICING_SETTING_KEY, newPricingJson);
    await db.insert(settingsChangeHistoryTable).values({
      field: PRICING_SETTING_KEY,
      oldValue: JSON.stringify(previousPricing),
      newValue: newPricingJson,
      changedBy: admin.email,
    });
    req.log.info({ adminEmail: admin.email, pricing: parsed.data.pricing }, "Card prices updated");

    // Notify both partners — fire-and-forget so email issues never block the save.
    void sendSettingsChangedEmail(
      getPartnerEmails(),
      {
        fieldLabel: "Card prices",
        oldValue: formatPricingForEmail(previousPricing),
        newValue: formatPricingForEmail(parsed.data.pricing),
        changedBy: admin.email,
        changedAt: new Date(),
      },
      req.log,
    ).catch(() => {});

    res.json({ pricing: parsed.data.pricing, source: "custom" as const });
  } catch (err) {
    req.log.error({ err }, "Failed to update pricing setting");
    res.status(500).json({ error: "Failed to update pricing setting" });
  }
});

// PUT /admin/settings/processing-password — change the employee login password (takes effect immediately)
router.put("/admin/settings/processing-password", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const parsed = UpdateProcessingPasswordBody.safeParse(req.body);
    const candidate = parsed.success ? parsed.data.newPassword : "";
    if (!candidate || candidate.length < 8 || candidate.length > 100 || candidate.trim() !== candidate) {
      res.status(400).json({ error: "Password must be 8-100 characters with no leading or trailing spaces" });
      return;
    }

    const hadCustom = !!(await getSettingValue(PROCESSING_PASSWORD_SETTING_KEY));
    await setSettingValue(PROCESSING_PASSWORD_SETTING_KEY, hashPassword(candidate));

    // Invalidate every existing processing session: tokens issued before this
    // moment are rejected by parseStaffToken, bouncing ex-employees to login.
    await setSettingValue(PROCESSING_PASSWORD_CHANGED_AT_SETTING_KEY, String(Date.now()));
    invalidateProcessingPasswordChangedAtCache();

    // Audit trail — never store the password itself, only that it changed.
    const oldLabel = hadCustom ? "(previous saved password)" : "(server default password)";
    const newLabel = "(new password — hidden for security)";
    await db.insert(settingsChangeHistoryTable).values({
      field: PROCESSING_PASSWORD_SETTING_KEY,
      oldValue: oldLabel,
      newValue: newLabel,
      changedBy: admin.email,
    });
    req.log.info({ adminEmail: admin.email }, "Employee (processing) password updated");

    // Notify both partners — fire-and-forget so email issues never block the save.
    void sendSettingsChangedEmail(
      getPartnerEmails(),
      {
        fieldLabel: "Employee password",
        oldValue: oldLabel,
        newValue: newLabel,
        changedBy: admin.email,
        changedAt: new Date(),
      },
      req.log,
    ).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update employee password");
    res.status(500).json({ error: "Failed to update employee password" });
  }
});

// GET /admin/settings/history — read-only audit trail of settings changes
router.get("/admin/settings/history", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const rows = await db
      .select()
      .from(settingsChangeHistoryTable)
      .orderBy(desc(settingsChangeHistoryTable.changedAt), desc(settingsChangeHistoryTable.id))
      .limit(20);

    res.json({
      changes: rows.map((r) => ({
        id: r.id,
        field:
          r.field === "merchant_upi_id" ? ("upi" as const) : // history rows from the manual-payment era
          r.field === PROCESSING_PASSWORD_SETTING_KEY ? ("processing_password" as const) :
          r.field === CONTACT_SETTING_KEY ? ("contact" as const) :
          r.field === ORDERS_CLEANUP_HISTORY_FIELD ? ("orders_cleanup" as const) :
          ("pricing" as const),
        oldValue: r.oldValue,
        newValue: r.newValue,
        changedBy: r.changedBy,
        changedAt: r.changedAt instanceof Date ? r.changedAt.toISOString() : String(r.changedAt),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load settings change history");
    res.status(500).json({ error: "Failed to load change history" });
  }
});

// ── Production self-test (admin-only, read-only) ────────────────────────────
// GET /admin/net-check — live outbound-connectivity + credential check.
// Built for hosts without SSH or reliable log access (Hostinger): reports
// presence (never values) of email/courier env vars plus real probe results
// against Resend and Delhivery, so production failures can be diagnosed over
// HTTP with an admin token. All probes are read-only GETs with an 8s timeout.

const NET_CHECK_ENV_KEYS = [
  "RESEND_API_KEY", "EMAIL_FROM", "PROCESSING_EMAIL", "REPLIT_CONNECTORS_HOSTNAME",
  "DELHIVERY_API_TOKEN", "DELHIVERY_ENV", "DELHIVERY_PICKUP_LOCATION",
  "DELHIVERY_RETURN_NAME", "DELHIVERY_RETURN_PHONE", "DELHIVERY_RETURN_ADD",
  "DELHIVERY_RETURN_PIN", "DELHIVERY_RETURN_CITY", "DELHIVERY_RETURN_STATE",
  "MYSQL_DATABASE_URL", "SESSION_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD",
  "PORT", "UPLOADS_DIR", "NODE_ENV",
] as const;

type ProbeResult =
  | { reachable: true; httpStatus: number; ms: number }
  | { reachable: false; error: string; ms: number };

/** Read-only GET with a hard timeout; never throws. */
async function probeUrl(url: string, headers?: Record<string, string>): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    await res.arrayBuffer().catch(() => undefined); // drain the socket
    return { reachable: true, httpStatus: res.status, ms: Date.now() - started };
  } catch (err) {
    return { reachable: false, error: describeFetchError(err), ms: Date.now() - started };
  }
}

router.get("/admin/net-check", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    // Presence + length only — never the values themselves.
    const env = Object.fromEntries(
      NET_CHECK_ENV_KEYS.map((k) => {
        const v = process.env[k];
        return [k, { present: typeof v === "string" && v.length > 0, length: v?.length ?? 0 }];
      }),
    );

    // Same base selection as the dispatch endpoint (routes/orders.ts).
    const delhiveryBase =
      (process.env["DELHIVERY_ENV"] ?? "staging") === "production"
        ? "https://track.delhivery.com"
        : "https://staging-express.delhivery.com";
    const delhiveryPinUrl = `${delhiveryBase}/c/api/pin-codes/json/?filter_codes=700001`;
    const resendKey = process.env["RESEND_API_KEY"];
    const delhiveryToken = process.env["DELHIVERY_API_TOKEN"];

    const [resendReachable, delhiveryReachable, resendKeyCheck, delhiveryTokenCheck] =
      await Promise.all([
        probeUrl("https://api.resend.com/domains"),
        probeUrl(delhiveryPinUrl),
        resendKey
          ? probeUrl("https://api.resend.com/domains", { Authorization: `Bearer ${resendKey}` })
          : Promise.resolve(null),
        delhiveryToken
          ? probeUrl(delhiveryPinUrl, { Authorization: `Token ${delhiveryToken}` })
          : Promise.resolve(null),
      ]);

    req.log.info({ adminEmail: admin.email }, "net-check diagnostics run");
    res.json({
      now: new Date().toISOString(),
      values: {
        NODE_ENV: process.env.NODE_ENV ?? null,
        DELHIVERY_ENV: process.env["DELHIVERY_ENV"] ?? null,
        delhiveryBase,
      },
      env,
      probes: {
        // reachable=true means the network round-trip completed; httpStatus
        // then tells whether the credential was accepted (200) or rejected
        // (401/403). null = credential not set, check skipped.
        resendReachable,
        resendKeyCheck,
        delhiveryReachable,
        delhiveryTokenCheck,
      },
    });
  } catch (err) {
    req.log.error({ err }, "net-check failed");
    res.status(500).json({ error: "Self-test failed" });
  }
});

// ── Settings unlock gate (two-partner email OTP) ────────────────────────────

// GET /admin/settings/otp/config — partner emails + pending/cooldown status
router.get("/admin/settings/otp/config", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json(await getOtpGateStatus());
  } catch (err) {
    req.log.error({ err }, "Failed to load settings OTP status");
    res.status(500).json({ error: "Failed to load code status" });
  }
});

// POST /admin/settings/otp/send — email a fresh code to every partner
router.post("/admin/settings/otp/send", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const created = await createOtpCodes();
    if (!created.ok) {
      res.status(429).json({
        error: `Please wait ${created.cooldownRemainingSeconds}s before sending codes again`,
        secondsRemaining: created.cooldownRemainingSeconds,
      });
      return;
    }

    // FAIL-CLOSED: real partner emails leave only from a host that explicitly
    // declares NODE_ENV=production. The deploy bundle pins that both in its
    // start script and at the top of dist/index.mjs, so the live site always
    // qualifies. Everything else — dev workflow, vitest (NODE_ENV=test), e2e
    // helpers, stray boots — is suppressed unless SETTINGS_OTP_SEND_EMAILS=true
    // deliberately opts in. (The previous gate suppressed only
    // NODE_ENV === "development"; vitest runs emailed the REAL partners
    // dozens of times on 1-2 Aug 2026 and burned the daily Resend quota.)
    const suppressEmails =
      process.env["SETTINGS_OTP_SEND_EMAILS"] !== "true" &&
      process.env.NODE_ENV !== "production";

    // Fail-safe gate: codes are logged ONLY when NODE_ENV is explicitly
    // "development" (the dev workflow always sets it). A production host
    // that forgets to set NODE_ENV must never print plaintext unlock codes.
    if (process.env.NODE_ENV === "development") {
      // Dev-only testing aid: lets the flow be tested without inbox access.
      req.log.info({ codes: created.codes, emailsSuppressed: suppressEmails }, "DEV ONLY — settings OTP codes");
    }

    if (suppressEmails && process.env.NODE_ENV !== "development") {
      // Neither dev (no code logging) nor production (no emails): the OTP flow
      // is intentionally dead in this environment. Say so on stderr — if this
      // line ever appears on the LIVE host, NODE_ENV is missing from hPanel
      // (Settings & Redeploy → environment variables → NODE_ENV=production).
      console.error(
        "[SettingsOTP] Emails suppressed: NODE_ENV is not 'production'. Partners will NOT receive codes. Set NODE_ENV=production on the live host (or SETTINGS_OTP_SEND_EMAILS=true to force sends).",
      );
    }

    if (!suppressEmails) {
      const results = await Promise.all(
        created.codes.map(({ email, code }) => sendSettingsOtpEmail({ to: email, code }, req.log)),
      );
      if (results.some((ok) => !ok)) {
        // A half-delivered pair can never verify — clear so retry is allowed immediately.
        await clearOtpState();
        res.status(502).json({ error: "Could not send the code emails. Please try again in a moment." });
        return;
      }
    }

    req.log.info(
      { adminEmail: admin.email, emailsSuppressed: suppressEmails },
      suppressEmails
        ? "Settings OTP codes generated (non-production: emails suppressed)"
        : "Settings OTP codes sent to partners",
    );
    res.json({
      sent: true,
      partnerEmails: created.codes.map((c) => c.email),
      expiresInSeconds: OTP_TTL_SECONDS,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send settings OTP codes");
    res.status(500).json({ error: "Failed to send codes" });
  }
});

// POST /admin/settings/otp/verify — both codes right → short-lived unlock token
router.post("/admin/settings/otp/verify", async (req: Request, res: Response) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const parsed = VerifySettingsOtpBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter the code from each email" });
      return;
    }

    const result = await verifyOtpCodes(parsed.data.codes);
    if (!result.ok) {
      const message =
        result.reason === "none" ? "No codes are active. Send new codes first." :
        result.reason === "expired" ? "The codes have expired. Send new codes." :
        result.reason === "locked" ? "Too many wrong attempts. Send new codes." :
        result.attemptsRemaining !== undefined
          ? `One or both codes are wrong (${result.attemptsRemaining} ${result.attemptsRemaining === 1 ? "try" : "tries"} left). Check both emails.`
          : "One or both codes are wrong. Check both emails.";
      req.log.warn({ adminEmail: admin.email, reason: result.reason }, "Settings OTP verify failed");
      res.status(400).json({ error: message, reason: result.reason });
      return;
    }

    req.log.info({ adminEmail: admin.email }, "Settings unlocked via partner OTP");
    res.json({ unlockToken: createSettingsUnlockToken(admin.email), expiresInSeconds: UNLOCK_TTL_SECONDS });
  } catch (err) {
    req.log.error({ err }, "Failed to verify settings OTP codes");
    res.status(500).json({ error: "Failed to verify codes" });
  }
});

export default router;
