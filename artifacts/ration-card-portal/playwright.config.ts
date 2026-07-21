import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:80",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: ["**/track-order-mobile.spec.ts"],
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 12"] },
      testMatch: ["**/track-order-mobile.spec.ts"],
    },
  ],
});
