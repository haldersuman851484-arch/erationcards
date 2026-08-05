import { Request, Response } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

export function getAdminCredentials(): { email: string; password: string } {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set");
  }
  return { email, password };
}

export type StaffRole = "admin" | "processing";

/**
 * Checks an employee (processing) login attempt. The admin-saved hashed
 * password in the settings table wins; the PROCESSING_PASSWORD env var is the
 * fallback so existing deploys keep working. Changes take effect immediately —
 * no server restart. Returns the processing email on success, null otherwise.
 */
export async function verifyProcessingLogin(email: string, password: string): Promise<string | null> {
  const processingEmail = process.env["PROCESSING_EMAIL"];
  if (!processingEmail || email !== processingEmail) return null;

  // Lazy import so this auth module stays usable in contexts without a DB.
  const { getSettingValue, PROCESSING_PASSWORD_SETTING_KEY } = await import("./settings");
  const savedHash = await getSettingValue(PROCESSING_PASSWORD_SETTING_KEY);
  if (savedHash) {
    return hashPassword(password) === savedHash ? processingEmail : null;
  }

  const envPassword = process.env["PROCESSING_PASSWORD"];
  if (!envPassword) return null;
  return password === envPassword ? processingEmail : null;
}

/**
 * Raw JWT parse only — deliberately NOT exported. It cannot see whether the
 * account still exists, so using it directly would let a terminated
 * operator's token keep working. Route code must go through
 * requireOperator() (operator-only routes) or parseLiveOperatorToken()
 * (routes where an operator token is optional), which both enforce
 * revocation centrally.
 */
function parseOperatorToken(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { operatorId: number };
    return decoded.operatorId;
  } catch {
    return null;
  }
}

/**
 * Operator tokens are stateless JWTs, so a terminated (hard-deleted) account
 * would otherwise keep working until the token expires. This is the single
 * place that combines "who does the token claim to be" with "does that
 * account still exist", so termination locks the account out immediately on
 * every route that uses it.
 *
 * - "none":    no usable operator token on the request
 * - "deleted": a valid token for an account that no longer exists
 * - "live":    a valid token for an existing account
 */
export type OperatorTokenState =
  | { kind: "none" }
  | { kind: "deleted"; operatorId: number }
  | { kind: "live"; operatorId: number };

export async function parseLiveOperatorToken(req: Request): Promise<OperatorTokenState> {
  const operatorId = parseOperatorToken(req);
  if (operatorId === null) return { kind: "none" };
  return (await operatorAccountExists(operatorId))
    ? { kind: "live", operatorId }
    : { kind: "deleted", operatorId };
}

/**
 * Operator-only gate: writes the 401 itself so callers just `return` on
 * null. Terminated accounts get an explicit "no longer exists" message.
 */
export async function requireOperator(req: Request, res: Response): Promise<number | null> {
  const state = await parseLiveOperatorToken(req);
  if (state.kind === "none") { res.status(401).json({ error: "Not authenticated" }); return null; }
  if (state.kind === "deleted") { res.status(401).json({ error: "This operator account no longer exists" }); return null; }
  return state.operatorId;
}

export function parseAdminToken(req: Request): { email: string; role: string } | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { email?: string; role?: string };
    // Reject tokens that are missing required admin claims (e.g. operator tokens)
    if (!decoded.email || decoded.role !== "admin") return null;
    return { email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

// Short-lived cache of the "password changed at" timestamp so shared staff
// endpoints don't hit the DB on every request. Invalidated in-process when
// the admin rotates the password; other instances pick it up within the TTL.
const PW_CHANGED_AT_CACHE_TTL_MS = 15_000;
let pwChangedAtCache: { value: number | null; fetchedAt: number } | null = null;

export function invalidateProcessingPasswordChangedAtCache(): void {
  pwChangedAtCache = null;
}

async function getProcessingPasswordChangedAtMs(): Promise<number | null> {
  const now = Date.now();
  if (pwChangedAtCache && now - pwChangedAtCache.fetchedAt < PW_CHANGED_AT_CACHE_TTL_MS) {
    return pwChangedAtCache.value;
  }
  // Lazy import so this auth module stays usable in contexts without a DB.
  const { getSettingValue, PROCESSING_PASSWORD_CHANGED_AT_SETTING_KEY } = await import("./settings");
  const raw = await getSettingValue(PROCESSING_PASSWORD_CHANGED_AT_SETTING_KEY);
  const value = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  pwChangedAtCache = { value, fetchedAt: now };
  return value;
}

/**
 * Accepts both admin and processing-staff tokens. Use for the order/courier
 * endpoints both panels share; use requireAdmin for admin-only routes.
 *
 * Processing tokens issued before the last employee-password rotation are
 * rejected, so an ex-employee is logged out as soon as the password changes.
 * Admin tokens are unaffected.
 */
export async function parseStaffToken(req: Request): Promise<{ email: string; role: StaffRole } | null> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { email?: string; role?: string; iat?: number };
    const role: StaffRole | null =
      decoded.role === "admin" || decoded.role === "processing" ? decoded.role : null;
    if (!decoded.email || !role) return null;
    if (role === "processing") {
      const changedAtMs = await getProcessingPasswordChangedAtMs();
      // iat has second precision; only reject tokens whose whole issue-second
      // is before the rotation, so logins right after the change stay valid.
      if (changedAtMs !== null && typeof decoded.iat === "number" && decoded.iat * 1000 + 999 < changedAtMs) {
        return null;
      }
    }
    return { email: decoded.email, role };
  } catch {
    return null;
  }
}

/**
 * Admin-only gate: 401 when not logged in at all, 403 when logged in as
 * processing staff (valid token, insufficient role). Writes the error
 * response itself so callers just `return` on null.
 */
export async function requireAdmin(req: Request, res: Response): Promise<{ email: string; role: StaffRole } | null> {
  const staff = await parseStaffToken(req);
  if (!staff) { res.status(401).json({ error: "Not authenticated" }); return null; }
  if (staff.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return null; }
  return staff;
}

export function createOperatorToken(operatorId: number): string {
  return jwt.sign({ operatorId }, getJwtSecret(), { expiresIn: "7d" });
}

export function createAdminToken(email: string, role: string): string {
  return jwt.sign({ email, role }, getJwtSecret(), { expiresIn: "7d" });
}

/**
 * Generates a customer-friendly, digits-only 10-character order number.
 *
 * Layout: last 7 digits of the millisecond timestamp + 3 random digits.
 * The old scheme (`Date.now().slice(-10)`) collided whenever two orders
 * arrived in the same millisecond; the random suffix makes same-ms
 * collisions a 1-in-1000 event per pair, and the POST /orders handler
 * retries with a fresh number if the DB's unique constraint still fires.
 */
export function generateOrderNumber(): string {
  const crypto = require("crypto") as typeof import("crypto");
  const timePart = Date.now().toString().slice(-7);
  const randomPart = crypto.randomInt(0, 1000).toString().padStart(3, "0");
  return timePart + randomPart;
}

export function hashPassword(password: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(password + "pvc_salt_2024").digest("hex");
}

/**
 * True while the operator's account row still exists. Internal building
 * block for parseLiveOperatorToken/requireOperator — not exported, so the
 * existence check cannot be skipped by accident.
 */
async function operatorAccountExists(operatorId: number): Promise<boolean> {
  // Lazy import so this auth module stays usable in contexts without a DB.
  const [{ db, operatorsTable }, { eq }] = await Promise.all([
    import("@workspace/db"),
    import("drizzle-orm"),
  ]);
  const [row] = await db
    .select({ id: operatorsTable.id })
    .from(operatorsTable)
    .where(eq(operatorsTable.id, operatorId))
    .limit(1);
  return !!row;
}
