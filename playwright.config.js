// UI smoke tests (tests/e2e). The planner is served by scripts/serve.js on its own port, so a dev server already running
// on 4173 is left alone. Uses the installed Google Chrome (channel "chrome"), no browser download.
import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4174);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.js",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}/`,
    channel: "chrome",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/serve.js",
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
