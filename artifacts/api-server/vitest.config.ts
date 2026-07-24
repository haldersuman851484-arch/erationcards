import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // orders-search-perf.test.ts is a manual smoke script (no describe/it blocks);
    // it is run separately via `pnpm test:smoke`, not as part of the vitest suite.
    exclude: ["**/orders-search-perf.test.ts", "**/node_modules/**"],
  },
});
