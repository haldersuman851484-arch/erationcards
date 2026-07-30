// Manual browser end-to-end run of the admin Data & Storage delete flow
// (unlock → check range → download ZIP → typed DELETE → confirm → result
// summary → Recent changes entry). Not part of the regular spec suite.
//
// How to run (dev suppresses all partner emails, so this is safe):
//   1. Seed throwaway finished orders for today (delivered/cancelled).
//   2. Trigger the OTP send (Settings tab "Send codes", or POST
//      /api/admin/settings/otp/send) — the plaintext codes appear in the
//      api-server dev log ("DEV ONLY — settings OTP codes").
//   3. Write them to CODES_FILE as [{"email":"...","code":"123456"}, ...].
//   4. node scripts/e2e-delete-flow-run.mjs   (portal + api workflows running)
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";

const CODES_FILE = "/home/runner/workspace/.e2e-otp-codes.json";
const OUT = "/home/runner/workspace/.e2e-delete-flow";
fs.mkdirSync(OUT, { recursive: true });

// Safety rail: this run DELETES every finished order in today's range on the
// target. Local dev targets only, unless very explicitly overridden.
const BASE = process.env.BASE ?? "http://localhost:80";
if (!["localhost", "127.0.0.1"].includes(new URL(BASE).hostname) && process.env.ALLOW_REMOTE_TARGET !== "true") {
  throw new Error(`Refusing to run the delete flow against non-local target ${BASE}. Set ALLOW_REMOTE_TARGET=true only for a disposable environment.`);
}
const log = (m) => {
  fs.appendFileSync(`${OUT}/progress.log`, `${new Date().toISOString()} ${m}\n`);
  console.log(m);
};

const exePath = execSync("which chromium", { encoding: "utf8" }).trim();
const browser = await chromium.launch({ executablePath: exePath });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

try {
  // ── Admin login ──
  await page.goto(`${BASE}/admin/login`);
  await page.getByTestId("input-admin-email").fill(process.env.ADMIN_EMAIL);
  await page.getByTestId("input-admin-password").fill(process.env.ADMIN_PASSWORD);
  await page.getByTestId("button-admin-login").click();
  await page.waitForURL("**/admin/dashboard**");
  log("logged in");

  // ── Settings tab → two-partner unlock ──
  // The OTP send was already triggered (otpPending=true), and the plaintext
  // codes were copied from the api-server dev log into CODES_FILE beforehand.
  await page.getByTestId("tab-settings").click();
  await page.getByTestId("input-otp-0").waitFor();
  const codes = JSON.parse(fs.readFileSync(CODES_FILE, "utf8")); // [{email, code}]
  log(`got ${codes.length} codes`);
  for (let i = 0; i < codes.length; i++) {
    // partner email order in the UI matches otp config order
    const email = await page.getByTestId(`text-partner-email-${i}`).innerText();
    const match = codes.find((c) => c.email === email.trim());
    if (!match) throw new Error(`no code for partner ${email}`);
    await page.getByTestId(`input-otp-${i}`).fill(match.code);
  }
  await page.getByTestId("button-verify-codes").click();
  await page.getByTestId("badge-settings-unlocked").waitFor();
  log("settings unlocked");

  // ── Data & Storage tab ──
  await page.getByTestId("tab-storage").click();
  const today = new Date().toISOString().slice(0, 10);
  await page.getByTestId("input-archive-from").fill(today);
  await page.getByTestId("input-archive-to").fill(today);
  await page.getByTestId("button-archive-check").click();
  await page.getByTestId("card-archive-preview").waitFor();
  log("preview: " + (await page.getByTestId("badge-archive-total").innerText()));
  log("deletable: " + (await page.getByTestId("text-archive-deletable").innerText()));

  // ── Download (creates the receipt) ──
  // The download event only fires after the whole ZIP is fetched into the
  // page (staffFetch → blob → object URL), so give it volume-sized headroom.
  const dl = page.waitForEvent("download", { timeout: 300_000 });
  const dlStart = Date.now();
  await page.getByTestId("button-archive-download").click();
  const download = await dl;
  await download.saveAs(`${OUT}/archive.zip`);
  const zipBytes = fs.statSync(`${OUT}/archive.zip`).size;
  await page.getByTestId("text-archive-receipt-ok").waitFor();
  const dlSecs = (Date.now() - dlStart) / 1000;
  log(`archive downloaded in ${dlSecs.toFixed(1)}s (${(zipBytes / 1024 / 1024).toFixed(1)} MB), receipt active`);
  if (dlSecs > 60) log(`WARNING: download took ${dlSecs.toFixed(0)}s — investigate before shrugging this off as "volume"`);

  // ── Typed DELETE + confirmation dialog ──
  await page.getByTestId("input-archive-confirm").fill("DELETE");
  await page.getByTestId("button-archive-delete").click();
  await page.screenshot({ path: `${OUT}/confirm-dialog.png` });
  // confirm dialog: click the destructive action
  await page.getByRole("alertdialog").waitFor();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /delete|yes/i })
    .click();
  // Deleting hundreds of stored files takes a while — wait generously.
  const delStart = Date.now();
  await page.getByTestId("card-archive-result").waitFor({ timeout: 300_000 });
  log(`delete completed in ${((Date.now() - delStart) / 1000).toFixed(1)}s`);
  log("result: " + (await page.getByTestId("text-result-orders").innerText()));
  log("files:  " + (await page.getByTestId("text-result-files").innerText()));
  await page.screenshot({ path: `${OUT}/result-summary.png` });

  // ── Settings → Recent changes shows the Order clean-up entry ──
  await page.getByTestId("tab-settings").click();
  await page.getByTestId("card-settings-history").scrollIntoViewIfNeeded();
  const firstRow = page.getByTestId("row-history-0");
  await firstRow.waitFor();
  log("history[0]: " + (await firstRow.innerText()).replace(/\s+/g, " ").slice(0, 200));
  await page.screenshot({ path: `${OUT}/recent-changes.png` });

  log("E2E_PASS");
} catch (err) {
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
  log("E2E_FAIL: " + (err?.message ?? err));
  process.exitCode = 1;
} finally {
  await browser.close();
}
