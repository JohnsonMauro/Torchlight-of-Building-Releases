// Entry point. Decides between the planner and the Recovery screen before any planner module (and so any build
// calculation) loads. The boot flag is set here and cleared once the planner's first render has painted; if it is still
// set on the next load of this tab, the last load crashed or froze.
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  clearBootFlag,
  clearBootMarker,
  markBootMarker,
  markBooting,
  shouldShowRecovery,
} from "@legacy/recovery-core.js";
import { AppShell } from "./shell/AppShell";

interface RecoveryOptions {
  reason: string;
  error?: unknown;
}

function session(): Storage | null {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function local(): Storage | null {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

async function showRecovery(options: RecoveryOptions): Promise<void> {
  const { renderRecoveryScreen } = await import("@legacy/recovery.js");
  renderRecoveryScreen(options);
}

/** Renders the static page structure synchronously: the legacy planner looks its elements up as soon as it loads. */
function renderShell(): void {
  const container = document.getElementById("root");
  if (!container) throw new Error("index.html has no #root element");
  const root = createRoot(container);
  flushSync(() => root.render(<AppShell />));
}

async function boot(): Promise<void> {
  const store = session();
  const shared = local();
  const decision = shouldShowRecovery({ session: store, local: shared, search: location.search });
  if (decision.show) {
    await showRecovery({ reason: decision.reason });
    return;
  }
  markBooting(store);
  const markerToken = markBootMarker(shared);
  try {
    renderShell();
    await import("@legacy/app.js");
  } catch (error) {
    console.error(error);
    await showRecovery({ reason: "error", error });
    return;
  }
  // Ctrl+F find bar (src/find-bar.js); the desktop build has no browser find.
  import("@legacy/find-bar.js")
    .then(({ installFindBar }) => installFindBar(document))
    .catch((error: unknown) => console.error(error));
  // Desktop update banner (src/update-banner.js); only the Electron preload provides the bridge.
  if ((globalThis as { tliDesktop?: { updates?: unknown } }).tliDesktop?.updates) {
    import("@legacy/update-banner.js")
      .then(({ installUpdateBanner }) => installUpdateBanner(document))
      .catch((error: unknown) => console.error(error));
  }
  // The planner's top-level code (first render included) has finished. Clear in the next task; not via
  // requestAnimationFrame, which never runs in a background tab (where timers still run, throttled).
  setTimeout(() => {
    clearBootFlag(store);
    clearBootMarker(shared, markerToken);
  }, 0);
}

boot().catch((error: unknown) => {
  console.error(error);
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<p class="notice">The planner could not start. Add <code>?recover</code> to the address to open the Recovery screen.</p>',
  );
});
