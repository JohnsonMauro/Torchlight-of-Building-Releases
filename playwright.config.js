// UI smoke tests (tests/e2e), run against both deliveries of the web app (apps/web):
// - "dev": the Vite dev server (unbundled modules, what `pnpm dev` serves);
// - "build": the Vite build in dist-web/ served by `vite preview` (what the web deploy and Electron load).
// `pnpm test:e2e` builds first. Ports differ from the dev server's 4173, so a running dev server is left alone.
// Uses the installed Google Chrome.
import { defineConfig } from "@playwright/test";

const devPort = Number(process.env.E2E_DEV_PORT || 4174);
const buildPort = Number(process.env.E2E_BUILD_PORT || 4175);
const url = (port) => `http://127.0.0.1:${port}/`;
const vite = (command, port) => `vite ${command} --config apps/web/vite.config.ts --port ${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.js",
  testIgnore: "desktop/**",
  outputDir: "test-results",
  fullyParallel: true,
  // Locally at most 2 browsers at once, so a run does not take the whole CPU (games and the desktop keep running).
  workers: process.env.CI ? undefined : 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "dev", use: { baseURL: url(devPort) } },
    { name: "build", use: { baseURL: url(buildPort) } },
  ],
  webServer: [
    // The dev server's game log reader keeps no session archive while the tests run (src/game-log/game-log-local.js).
    {
      command: vite("dev", devPort),
      url: url(devPort),
      reuseExistingServer: false,
      timeout: 60_000,
      env: { TLI_GAME_LOG_ARCHIVE: "none" },
    },
    { command: vite("preview", buildPort), url: url(buildPort), reuseExistingServer: false, timeout: 30_000 },
  ],
});
