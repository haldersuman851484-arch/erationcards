import { defineConfig, devices } from "@playwright/test";
import { execSync } from "node:child_process";

// The Playwright-bundled chromium can't run on NixOS (missing shared libs),
// so use the system chromium from the Nix environment when available.
function systemChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    return execSync("which chromium", { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

const executablePath = systemChromium();
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseURL = new URL(baseURL);
const port = parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? "443" : "80");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  webServer: {
    command: "pnpm run dev",
    url: baseURL,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: port,
    },
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
      testIgnore: ["**/track-order-mobile.spec.ts"],
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"], launchOptions: { executablePath } },
      testMatch: ["**/track-order-mobile.spec.ts"],
    },
  ],
});
