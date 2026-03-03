import * as path from "node:path";
import { defineConfig } from "@playwright/test";

// E2E tests run against the vendor/openclaw bundle (built by prepare:openclaw)
// to match the production Electron packaging as closely as possible.
process.env.OPENCLAW_E2E_BUNDLE_DIR = path.resolve(__dirname, "vendor", "openclaw");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 3,
  reporter: "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
