// Entry point: renders the page structure, loads the planner, and marks the page ready (`data-planner-ready` on <html>,
// which the e2e tests wait for) once the planner's first render has finished.
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { NOTICE_STRIP_CLASS } from "@legacy/app/notice-classes.js";
import { AppShell } from "./shell/AppShell";
import { applyTheme } from "./ui/theme";

/** Renders the static page structure synchronously: the legacy planner looks its elements up as soon as it loads. */
function renderShell(): void {
  const container = document.getElementById("root");
  if (!container) throw new Error("index.html has no #root element");
  const root = createRoot(container);
  flushSync(() => root.render(<AppShell />));
}

async function boot(): Promise<void> {
  applyTheme();
  renderShell();
  await import("@legacy/app/app.js");
  // Ctrl+F find bar (src/app/planner/find-bar.js); the desktop build has no browser find.
  import("@legacy/app/planner/find-bar.js")
    .then(({ installFindBar }) => installFindBar(document))
    .catch((error: unknown) => console.error(error));
  // Desktop update banner (src/app/planner/update-banner.js); only the Electron preload provides the bridge.
  if ((globalThis as { tliDesktop?: { updates?: unknown } }).tliDesktop?.updates) {
    import("@legacy/app/planner/update-banner.js")
      .then(({ installUpdateBanner }) => installUpdateBanner(document))
      .catch((error: unknown) => console.error(error));
  }
  // The planner's top-level code (first render included) has finished: ready in the next task; not via
  // requestAnimationFrame, which never runs in a background tab (where timers still run, throttled).
  setTimeout(() => (document.documentElement.dataset.plannerReady = "true"), 0);
}

boot().catch((error: unknown) => {
  console.error(error);
  const message = String((error as { message?: unknown })?.message ?? error).replace(
    /[&<>"]/g,
    (character) => `&#${character.charCodeAt(0)};`,
  );
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<p class="m-4 ${NOTICE_STRIP_CLASS}">The planner could not start: ${message}</p>`,
  );
});
