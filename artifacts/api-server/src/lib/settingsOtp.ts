import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Request } from "express";
import { getSettingValue, setSettingValue } from "./settings";

/**
 * Two-person unlock gate for the admin Settings tab.
 *
 * Money-related settings (payment UPI ID, card prices) may only be read or
 * changed after BOTH business partners enter one-time codes emailed to them.
 * Codes are stored hashed in the settings key-value table (so a DB read never
 * reveals them), and a successful verification issues a short-lived JWT that
 * the client must send in the `x-settings-unlock` header on every settings
 * endpoint. Enforcement lives server-side in the routes — hiding the UI is
 * not the protection.
 */

export const SETTINGS_OTP_STATE_KEY = "settings_otp_pending";

/** Both partners must verify. Override via SETTINGS_PARTNER_EMAILS (comma-separated). */
const DEFAULT_PARTNER_EMAILS = ["haldersuman851484@gmail.com", "indranilh103@gmail.com"];

export const OTP_TTL_SECONDS = 10 * 60; // codes valid for 10 minutes
export const RESEND_COOLDOWN_SECONDS = 60; // minimum gap between sends
export const MAX_VERIFY_ATTEMPTS = 5; // then the codes are invalidated
export const UNLOCK_TTL_SECONDS = 15 * 60; // settings stay open for 15 minutes

export function getPartnerEmails(): string[] {
  const raw = process.env["SETTINGS_PARTNER_EMAILS"];
  if (raw) {
    const list = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
    if (list.length > 0) return list;
  }
  return DEFAULT_PARTNER_EMAILS;
}

type OtpState = {
  /** partner email (lowercase) -> sha256(code + secret) hex */
  codes: Record<string, string>;
  expiresAt: number; // epoch ms
  sentAt: number; // epoch ms
  attempts: number;
};

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(`${code}:${getJwtSecret()}`).digest("hex");
}

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function readState(): Promise<OtpState | null> {
  const raw = await getSettingValue(SETTINGS_OTP_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OtpState;
    if (!parsed || typeof parsed !== "object" || !parsed.codes) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the state; `null` clears it (empty string reads back as "none"). */
async function writeState(state: OtpState | null): Promise<void> {
  await setSettingValue(SETTINGS_OTP_STATE_KEY, state ? JSON.stringify(state) : "");
}

export async function clearOtpState(): Promise<void> {
  await writeState(null);
}

export async function getOtpGateStatus(): Promise<{
  partnerEmails: string[];
  otpPending: boolean;
  cooldownRemainingSeconds: number;
}> {
  const state = await readState();
  const now = Date.now();
  const otpPending = !!state && state.expiresAt > now && state.attempts < MAX_VERIFY_ATTEMPTS;
  const cooldownRemainingSeconds = state
    ? Math.max(0, Math.ceil((state.sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000))
    : 0;
  return { partnerEmails: getPartnerEmails(), otpPending, cooldownRemainingSeconds };
}

/**
 * Generates a fresh code for every partner and stores them hashed.
 * Returns the plaintext codes exactly once so the caller can email them.
 */
export async function createOtpCodes(): Promise<
  | { ok: true; codes: { email: string; code: string }[] }
  | { ok: false; cooldownRemainingSeconds: number }
> {
  const state = await readState();
  const now = Date.now();
  if (state) {
    const remainMs = state.sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now;
    if (remainMs > 0) return { ok: false, cooldownRemainingSeconds: Math.ceil(remainMs / 1000) };
  }
  const codes = getPartnerEmails().map((email) => ({ email, code: generateCode() }));
  await writeState({
    codes: Object.fromEntries(codes.map(({ email, code }) => [email, hashCode(code)])),
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    sentAt: now,
    attempts: 0,
  });
  return { ok: true, codes };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "none" | "expired" | "locked" | "wrong"; attemptsRemaining?: number };

/**
 * Every partner email must have a matching 6-digit code. Wrong attempts are
 * counted; after MAX_VERIFY_ATTEMPTS the pending codes are invalidated.
 * A successful verification consumes the codes (no replay).
 *
 * The API server runs as a single Node process (dev and Hostinger production
 * alike), so a module-level queue is enough to make the attempts counter
 * atomic: concurrent verify calls are serialized and the read-modify-write of
 * `attempts` can never interleave, so parallel requests cannot bypass the
 * 5-attempt lockout.
 */
let verifyQueue: Promise<unknown> = Promise.resolve();

export function verifyOtpCodes(entries: { email: string; code: string }[]): Promise<VerifyResult> {
  const result = verifyQueue.then(() => verifyOtpCodesSerialized(entries));
  verifyQueue = result.catch(() => undefined);
  return result;
}

async function verifyOtpCodesSerialized(entries: { email: string; code: string }[]): Promise<VerifyResult> {
  const state = await readState();
  const now = Date.now();
  if (!state) return { ok: false, reason: "none" };
  if (state.expiresAt <= now) {
    await writeState(null);
    return { ok: false, reason: "expired" };
  }
  if (state.attempts >= MAX_VERIFY_ATTEMPTS) {
    await writeState(null);
    return { ok: false, reason: "locked" };
  }

  const provided = new Map(entries.map((e) => [e.email.trim().toLowerCase(), e.code.trim()]));
  const expectedEmails = Object.keys(state.codes);
  const allMatch =
    expectedEmails.length > 0 &&
    expectedEmails.every((email) => {
      const code = provided.get(email);
      return !!code && /^\d{6}$/.test(code) && timingSafeEqualHex(hashCode(code), state.codes[email]);
    });

  if (!allMatch) {
    const attempts = state.attempts + 1;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await writeState(null);
      return { ok: false, reason: "locked" };
    }
    await writeState({ ...state, attempts });
    return { ok: false, reason: "wrong", attemptsRemaining: MAX_VERIFY_ATTEMPTS - attempts };
  }

  await writeState(null); // consume — verified codes cannot be replayed
  return { ok: true };
}

export function createSettingsUnlockToken(adminEmail: string): string {
  return jwt.sign({ scope: "settings_unlock", email: adminEmail }, getJwtSecret(), {
    expiresIn: UNLOCK_TTL_SECONDS,
  });
}

/** True when the request carries a valid, unexpired x-settings-unlock token. */
export function hasSettingsUnlock(req: Request): boolean {
  const header = req.headers["x-settings-unlock"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { scope?: string };
    return decoded.scope === "settings_unlock";
  } catch {
    return false;
  }
}
