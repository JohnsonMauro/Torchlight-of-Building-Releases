// UI smoke tests (tests/e2e), run against both deliveries of the same app:
// - "source": the raw modules served by scripts/serve.js (what Electron loads today);
// - "build": the Vite build in dist-web/ served by `vite preview` (what the web deploy ships). `pnpm test:e2e` builds first.
// Ports differ from the dev server's 4173, so a running dev server is left alone. Uses the installed Google Chrome.
import { defineConfig } from "@playwright/test";

const sourcePort = Number(process.env.E2E_SOURCE_PORT || 4174);
const buildPort = Number(process.env.E2E_BUILD_PORT || 4175);
const url = (port) => `http://127.0.0.1:${port}/`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.js",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "source", use: { baseURL: url(sourcePort) } },
    { name: "build", use: { baseURL: url(buildPort) } }
  ],
  webServer: [
    { command: "node scripts/serve.js", env: { PORT: String(sourcePort) }, url: url(sourcePort), reuseExistingServer: false, timeout: 30_000 },
    { command: `vite preview --port ${buildPort}`, url: url(buildPort), reuseExistingServer: false, timeout: 30_000 }
  ]
});
