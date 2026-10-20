// Web app. The planner's game data names icons by run-time strings such as "./src/assets/x.webp" (relative to the
// page), so the repository's src/assets is served at /src/assets in dev and preview and copied to the same path in the
// build. The dev and preview servers also answer /api/game-log/snapshots, read-only access to the local game log.
import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(appRoot, "../..");
const assetsRoot = resolve(repoRoot, "src/assets");
const outDir = resolve(repoRoot, "dist-web");

const assetTypes: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** Serves GET /src/assets/<file> from the repository's src/assets, refusing anything outside it. */
function serveAssets(request: IncomingMessage, response: ServerResponse, next: Connect.NextFunction): void {
  const pathname = decodeURIComponent((request.url || "").split("?")[0]);
  const file = resolve(assetsRoot, `.${pathname}`);
  const inside = relative(assetsRoot, file);
  if (!inside || inside.startsWith("..") || !existsSync(file) || !statSync(file).isFile()) return next();
  response.setHeader("Content-Type", assetTypes[extname(file)] || "application/octet-stream");
  createReadStream(file).pipe(response);
}

async function serveGameLog(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    // Run-time URL: a literal specifier would be bundled into this config by Vite's config loader.
    const { handleGameLogSnapshotsRequest } = await import(
      pathToFileURL(resolve(repoRoot, "src/game-log-local.js")).href
    );
    await handleGameLogSnapshotsRequest(request, response);
  } catch (error) {
    console.error(`game-log endpoint: ${(error as Error).message}`);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.end();
    }
  }
}

function plannerAssets(): Plugin {
  return {
    name: "tli-planner-assets",
    configureServer(server) {
      server.middlewares.use("/src/assets", serveAssets);
      server.middlewares.use("/api/game-log/snapshots", serveGameLog);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/game-log/snapshots", serveGameLog);
    },
    closeBundle() {
      cpSync(assetsRoot, join(outDir, "src/assets"), { recursive: true });
    },
  };
}

export default defineConfig({
  root: appRoot,
  base: "./",
  plugins: [react(), plannerAssets()],
  // The legacy planner sources (repository src/) until they move into packages; mirrored in tsconfig.json "paths".
  resolve: { alias: { "@legacy": resolve(repoRoot, "src") } },
  server: { host: "127.0.0.1", port: 4173, strictPort: true, fs: { allow: [repoRoot] } },
  preview: { host: "127.0.0.1", strictPort: true },
  build: { outDir, emptyOutDir: true, sourcemap: true },
});
