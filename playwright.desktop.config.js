// Desktop smoke (tests/e2e/desktop): launches the Electron app on the dist-web build. Opens a real window, so it has its
// own command (`pnpm test:desktop`, which builds first) and no web server.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e/desktop",
  testMatch: "**/*.spec.js",
  outputDir: "test-results/desktop",
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: { trace: "retain-on-failure" },
});
