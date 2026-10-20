// Web build of the planner. The app runs unchanged: index.html loads src/boot.js and Vite bundles everything it imports.
// - base "./": the build works under any path (GitHub Pages serves it under /<repo>/).
// - src/assets is copied as is: game data refers to icons by "./src/assets/..." strings at run time, which Vite cannot see.
// - The dev server answers /api/game-log/snapshots like scripts/serve.js, so "Import from game" works with `pnpm dev`.
import { defineConfig } from "vite";
import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const outDir = "dist-web";

function runtimeAssets() {
  return {
    name: "tli-runtime-assets",
    apply: "build",
    closeBundle() {
      cpSync(resolve("src/assets"), resolve(outDir, "src/assets"), { recursive: true });
    },
  };
}

function gameLogEndpoint() {
  return {
    name: "tli-game-log-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/game-log/snapshots", async (request, response) => {
        try {
          // Runtime URL: a literal specifier would be bundled into the config by Vite's config loader.
          const { handleGameLogSnapshotsRequest } = await import(pathToFileURL(resolve("src/game-log-local.js")).href);
          await handleGameLogSnapshotsRequest(request, response);
        } catch (error) {
          server.config.logger.error(`game-log endpoint: ${error.message}`);
          if (!response.headersSent) {
            response.statusCode = 500;
            response.end();
          }
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  preview: { host: "127.0.0.1", strictPort: true },
  build: { outDir, emptyOutDir: true, sourcemap: true },
  plugins: [runtimeAssets(), gameLogEndpoint()],
});
