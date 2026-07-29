import { Router, Request, Response } from "express";
import { LoginAdminBody, UpdateUpiSettingBody, UpdatePricingSettingBody, VerifySettingsOtpBody } from "@workspace/api-zod";
import { getAdminCredentials, createAdminToken, parseAdminToken } from "../lib/auth";
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
} from "../lib/settingsOtp";
import { sendSettingsOtpEmail } from "../lib/email";
import {
  getMerchantUpiId,
  getPricingMatrix,
  setSettingValue,
  MERCHANT_UPI_SETTING_KEY,
  PRICING_SETTING_KEY,
  UPI_ID_REGEX,
} from "../lib/settings";
import { db } from "@workspace/db";
import { paymentVerificationsTable, operatorsTable } from "@workspace/db";
import { desc, sql, eq } from "drizzle-orm";

const router = Router();

// GET /admin/verifications
router.get("/admin/verifications", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
    const offset = (page - 1) * limit;

    const [verifications, [{ count }]] = await Promise.all([
      db.select().from(paymentVerificationsTable)
        .orderBy(desc(paymentVerificationsTable.verifiedAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(paymentVerificationsTable),
    ]);

    res.json({
      verifications: verifications.map((v) => ({
        ...v,
        verifiedAt: v.verifiedAt instanceof Date ? v.verifiedAt.toISOString() : String(v.verifiedAt),
      })),
      total: Number(count),
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list verifications");
    res.status(500).json({ error: "Failed to list verifications" });
  }
});

// PATCH /admin/operators/:id/status
router.patch("/admin/operators/:id/status", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

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

// POST /admin/login
router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const body = LoginAdminBody.parse(req.body);

    const { email: adminEmail, password: adminPassword } = getAdminCredentials();
    if (body.email !== adminEmail || body.password !== adminPassword) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = createAdminToken(body.email, "admin");
    res.json({ role: "admin", email: body.email, token });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(400).json({ error: "Login failed" });
  }
});

// GET /admin/me
router.get("/admin/me", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json({ role: admin.role, email: admin.email });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /admin/logout
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out" });
});

// ── Payment settings (merchant UPI ID) ──────────────────────────────────────

// GET /admin/settings/upi — current UPI ID + whether it's admin-saved or the env default
router.get("/admin/settings/upi", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    res.json(await getMerchantUpiId());
  } catch (err) {
    req.log.error({ err }, "Failed to load UPI setting");
    res.status(500).json({ error: "Failed to load UPI setting" });
  }
});

// PUT /admin/settings/upi — save a new merchant UPI ID (shown to customers immediately)
router.put("/admin/settings/upi", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const parsed = UpdateUpiSettingBody.safeParse(req.body);
    const candidate = parsed.success ? parsed.data.merchantUpiId.trim() : "";
    if (!candidate || !UPI_ID_REGEX.test(candidate)) {
      res.status(400).json({ error: "Enter a valid UPI ID like yourname@bank" });
      return;
    }

    await setSettingValue(MERCHANT_UPI_SETTING_KEY, candidate);
    req.log.info({ adminEmail: admin.email, merchantUpiId: candidate }, "Merchant UPI ID updated");
    res.json({ merchantUpiId: candidate, source: "custom" as const });
  } catch (err) {
    req.log.error({ err }, "Failed to update UPI setting");
    res.status(500).json({ error: "Failed to update UPI setting" });
  }
});

// GET /admin/settings/pricing — current price matrix + whether it's admin-saved or the built-in default
router.get("/admin/settings/pricing", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
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
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!hasSettingsUnlock(req)) {
      res.status(403).json({ error: "Settings are locked. Verify the emailed codes first.", code: "SETTINGS_LOCKED" });
      return;
    }

    const parsed = UpdatePricingSettingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Each price must be a whole rupee amount between 1 and 10000" });
      return;
    }

    await setSettingValue(PRICING_SETTING_KEY, JSON.stringify(parsed.data.pricing));
    req.log.info({ adminEmail: admin.email, pricing: parsed.data.pricing }, "Card prices updated");
    res.json({ pricing: parsed.data.pricing, source: "custom" as const });
  } catch (err) {
    req.log.error({ err }, "Failed to update pricing setting");
    res.status(500).json({ error: "Failed to update pricing setting" });
  }
});

// ── Settings unlock gate (two-partner email OTP) ────────────────────────────

// GET /admin/settings/otp/config — partner emails + pending/cooldown status
router.get("/admin/settings/otp/config", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(await getOtpGateStatus());
  } catch (err) {
    req.log.error({ err }, "Failed to load settings OTP status");
    res.status(500).json({ error: "Failed to load code status" });
  }
});

// POST /admin/settings/otp/send — email a fresh code to every partner
router.post("/admin/settings/otp/send", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const created = await createOtpCodes();
    if (!created.ok) {
      res.status(429).json({
        error: `Please wait ${created.cooldownRemainingSeconds}s before sending codes again`,
        secondsRemaining: created.cooldownRemainingSeconds,
      });
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      // Dev-only testing aid: lets the flow be tested without inbox access.
      req.log.info({ codes: created.codes }, "DEV ONLY — settings OTP codes");
    }

    const results = await Promise.all(
      created.codes.map(({ email, code }) => sendSettingsOtpEmail({ to: email, code }, req.log)),
    );
    if (results.some((ok) => !ok)) {
      // A half-delivered pair can never verify — clear so retry is allowed immediately.
      await clearOtpState();
      res.status(502).json({ error: "Could not send the code emails. Please try again in a moment." });
      return;
    }

    req.log.info({ adminEmail: admin.email }, "Settings OTP codes sent to partners");
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
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

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
