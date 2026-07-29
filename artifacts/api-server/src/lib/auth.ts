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

export function parseOperatorToken(req: Request): number | null {
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

/**
 * Accepts both admin and processing-staff tokens. Use for the order/courier
 * endpoints both panels share; use requireAdmin for admin-only routes.
 */
export function parseStaffToken(req: Request): { email: string; role: StaffRole } | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { email?: string; role?: string };
    const role: StaffRole | null =
      decoded.role === "admin" || decoded.role === "processing" ? decoded.role : null;
    if (!decoded.email || !role) return null;
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
export function requireAdmin(req: Request, res: Response): { email: string; role: StaffRole } | null {
  const staff = parseStaffToken(req);
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

export function generateOrderNumber(): string {
  return Date.now().toString().slice(-10);
}

export function hashPassword(password: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(password + "pvc_salt_2024").digest("hex");
}
