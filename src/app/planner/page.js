// DOM helpers of the page shell: lookups, number format, art frames, the toast and the header's storage status.
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

export function updateStorageStatus() {
  const status = document.querySelector(".loadout-status");
  if (!status) return;
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  const tab = document.querySelector(".loadout-tab");
  if (tab) {
    tab.querySelector("span").textContent = active ? "Active build" : "No active build";
    tab.querySelector("strong").textContent = active?.name || "Start a new build";
    if (active) tab.title = "Right-click to rename";
    else tab.removeAttribute("title");
  }
  const unsaved = plannerStorageStatus() === "unsaved";
  status.classList.toggle("storage-warning", unsaved);
  status.classList.toggle("no-build", !active);
  status.querySelector("span").textContent = unsaved
    ? libraryLoadIssues().unreadable
      ? "Saved builds unreadable — changes not saved"
      : "Storage full — changes not saved. Export your build."
    : active
      ? revisionsTrimmedToFit()
        ? "Autosaved locally · older revisions removed to fit browser storage"
        : "Autosaved locally"
      : "No build saved";
}
let toastTimer;
export function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2200);
}

// Hero panel HERO | FOLLOWER tabs (src/app/follower-panel.js; 2026-10-15): the tab is remembered per build view (localStorage, UI
// only); the header "?" shows the open tab's controls. The FOLLOWER tab renders the follower card and its skill slots.
export function activeBuildViewId() {
  try {
    return loadBuildLibrary().activeBuildId || "";
  } catch {
    return "";
  }
}

export const titleCase = (value) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
export function hideOtherTabNotice() {
  document.getElementById("other-tab-notice")?.remove();
}
