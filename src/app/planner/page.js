// The page shell: lookups, number format, art frames, and what the page says about the open build (save status, toast,
// another tab's change).
import { normalizePercentageText } from "../../engine/text/percentage-text.js";
import { buildTabNotices } from "../bridge/build-tab-notices.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { escapeHtml } from "../html.js";
import {
  libraryLoadIssues,
  loadBuildLibrary,
  plannerStorageStatus,
  revisionsTrimmedToFit,
} from "../storage/build-library.ts";

export const $ = (selector) => document.querySelector(selector);
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const format = (value) => number.format(value);
export const artwork = (src, alt, className = "game-art") =>
  src
    ? `<span class="art-frame ${className}"><img src="${src}" alt="${escapeHtml(alt)}"><span aria-hidden="true">◆</span></span>`
    : `<span class="art-frame ${className}" aria-label="${escapeHtml(alt)}"><span aria-hidden="true">◆</span></span>`;
export const fullTextTitle = (text) => (text ? ` title="${escapeHtml(text)}"` : "");

// What the page says about the open build (the header's save status, the build strip's name), the toast, and whether
// another tab changed the open build: the planner announces a change, React renders it (apps/web/src/shell).
export const pageViewSources = {
  buildStatus: buildStatusView,
  toast: () => toast,
  otherTabNotice: () => otherTabNotice,
};
function buildStatusView() {
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  const unsaved = plannerStorageStatus() === "unsaved";
  return {
    name: active ? active.name : null,
    save: unsaved ? "unsaved" : active ? "saved" : "none",
    text: unsaved
      ? libraryLoadIssues().unreadable
        ? "Saved builds unreadable — changes not saved"
        : "Storage full — changes not saved. Export your build."
      : active
        ? revisionsTrimmedToFit()
          ? "Autosaved locally · older revisions removed to fit browser storage"
          : "Autosaved locally"
        : "No build saved",
    tabNotices: buildTabNotices(active),
  };
}
export function updateStorageStatus() {
  viewSourceChanged("buildStatus");
}
// Each message counts up, so the same message twice shows twice. React prints it as text; the percentage gap closes as
// escapeHtml would close it in markup.
let toast = { message: "", count: 0 };
export function showToast(message) {
  toast = { message: normalizePercentageText(message), count: toast.count + 1 };
  viewSourceChanged("toast");
}
// Another tab saved a different version of the open build (build-library-controller.js installOtherTabSync).
let otherTabNotice = false;
export function showOtherTabNotice() {
  if (otherTabNotice) return;
  otherTabNotice = true;
  viewSourceChanged("otherTabNotice");
}
export function hideOtherTabNotice() {
  if (!otherTabNotice) return;
  otherTabNotice = false;
  viewSourceChanged("otherTabNotice");
}
export const otherTabNoticeShown = () => otherTabNotice;

export const titleCase = (value) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
