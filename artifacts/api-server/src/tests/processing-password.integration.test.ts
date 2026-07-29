/**
 * Employee (processing) password rotation via admin settings:
 * - admin-saved hashed password in the settings table wins at login
 * - PROCESSING_PASSWORD env var remains the fallback when nothing is saved
 * - route is gated by admin auth + the settings OTP unlock header
 * - change is recorded in the settings change history without the plaintext
 *
 * Requires MYSQL_DATABASE_URL (same env var the api-server uses).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

// Never send real partner emails from tests.
vi.mock("../lib/email", () => ({
  sendSettingsOtpEmail: vi.fn(async () => true),
  sendSettingsChangedEmail: vi.fn(async () => true),
}));

import app from "../app";
import { createAdminToken } from "../lib/auth";
import { createSettingsUnlockToken } from "../lib/settingsOtp";
import { PROCESSING_PASSWORD_SETTING_KEY } from "../lib/settings";
import { db, settingsTable, settingsChangeHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "pw-tests@printpvccard.in";
const ADMIN = `Bearer ${createAdminToken(ADMIN_EMAIL, "admin")}`;
const UNLOCK = createSettingsUnlockToken(ADMIN_EMAIL);

const PROCESSING_EMAIL = "employee-pw-test@printpvccard.in";
const ENV_PASSWORD = "env-fallback-password";
const NEW_PASSWORD = "rotated-password-9";

let prevEmail: string | undefined;
let prevPassword: string | undefined;

async function clearSavedPassword() {
  await db.delete(settingsTable).where(eq(settingsTable.key, PROCESSING_PASSWORD_SETTING_KEY));
}

beforeAll(async () => {
  prevEmail = process.env.PROCESSING_EMAIL;
  prevPassword = process.env.PROCESSING_PASSWORD;
  process.env.PROCESSING_EMAIL = PROCESSING_EMAIL;
  process.env.PROCESSING_PASSWORD = ENV_PASSWORD;
  await clearSavedPassword();
});

afterAll(async () => {
  if (prevEmail === undefined) delete process.env.PROCESSING_EMAIL; else process.env.PROCESSING_EMAIL = prevEmail;
  if (prevPassword === undefined) delete process.env.PROCESSING_PASSWORD; else process.env.PROCESSING_PASSWORD = prevPassword;
  await clearSavedPassword();
  await db.delete(settingsChangeHistoryTable).where(eq(settingsChangeHistoryTable.changedBy, ADMIN_EMAIL));
});

describe("employee password rotation", () => {
  it("logs the employee in with the env fallback password when nothing is saved", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: PROCESSING_EMAIL, password: ENV_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("processing");
  });

  it("rejects the change without admin auth or without the settings unlock", async () => {
    const noAuth = await request(app)
      .put("/api/admin/settings/processing-password")
      .send({ newPassword: NEW_PASSWORD });
    expect(noAuth.status).toBe(401);

    const noUnlock = await request(app)
      .put("/api/admin/settings/processing-password")
      .set("Authorization", ADMIN)
      .send({ newPassword: NEW_PASSWORD });
    expect(noUnlock.status).toBe(403);
    expect(noUnlock.body.code).toBe("SETTINGS_LOCKED");
  });

  it("rejects too-short or padded passwords", async () => {
    for (const bad of ["short", " padded-password", "padded-password ", ""]) {
      const res = await request(app)
        .put("/api/admin/settings/processing-password")
        .set("Authorization", ADMIN)
        .set("x-settings-unlock", UNLOCK)
        .send({ newPassword: bad });
      expect(res.status).toBe(400);
    }
  });

  it("saves a new password that works immediately and disables the env one", async () => {
    const save = await request(app)
      .put("/api/admin/settings/processing-password")
      .set("Authorization", ADMIN)
      .set("x-settings-unlock", UNLOCK)
      .send({ newPassword: NEW_PASSWORD });
    expect(save.status).toBe(200);
    expect(save.body.success).toBe(true);

    // Stored hashed — never the plaintext.
    const [row] = await db.select().from(settingsTable)
      .where(eq(settingsTable.key, PROCESSING_PASSWORD_SETTING_KEY)).limit(1);
    expect(row).toBeTruthy();
    expect(row!.value).not.toContain(NEW_PASSWORD);

    const newLogin = await request(app)
      .post("/api/admin/login")
      .send({ email: PROCESSING_EMAIL, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.role).toBe("processing");

    const oldLogin = await request(app)
      .post("/api/admin/login")
      .send({ email: PROCESSING_EMAIL, password: ENV_PASSWORD });
    expect(oldLogin.status).toBe(401);
  });

  it("records the change in the audit trail without the plaintext password", async () => {
    const res = await request(app)
      .get("/api/admin/settings/history")
      .set("Authorization", ADMIN)
      .set("x-settings-unlock", UNLOCK);
    expect(res.status).toBe(200);
    const entry = res.body.changes.find(
      (c: { field: string; changedBy: string }) =>
        c.field === "processing_password" && c.changedBy === ADMIN_EMAIL,
    );
    expect(entry).toBeTruthy();
    expect(JSON.stringify(entry)).not.toContain(NEW_PASSWORD);
  });
});
