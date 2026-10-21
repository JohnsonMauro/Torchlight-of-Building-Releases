// The searchable list that replaces a <select>'s native popup (type to filter, Enter picks the first match).
import { escapeHtml } from "../html.js";
import { $, fullTextTitle } from "./page.js";

// The look (Tailwind utility lists). The plain list: a popover with a search box and flat rows, the chosen row
// (.selected) tinted. The revived-affix picker (hero memories): a panel with a dialog title bar and framed cards.
const POPOVER_CLASS =
  "select-search-popover fixed z-10000 m-0 max-w-[calc(100vw-16px)] rounded-md border border-line-strong bg-surface p-2 text-sm/[normal] text-text shadow-lg shadow-shadow";
const REVIVED_POPOVER_CLASS =
  "select-search-popover revived-affix-picker fixed z-10000 m-0 flex max-w-[calc(100vw-16px)] flex-col rounded-md border border-line-strong bg-surface p-0 text-sm/[normal] text-text shadow-lg shadow-shadow";
const SEARCH_INPUT_CLASS = "field w-full p-2.5";
const RESULTS_CLASS = "mt-1.5 grid overflow-auto";
const REVIVED_RESULTS_CLASS = "grid gap-1.5 overflow-y-auto px-3 pb-3";
const REVIVED_HEADING_CLASS = "dialog-head";
const REVIVED_CLOSE_CLASS = "dialog-close";
const REVIVED_SEARCH_CLASS = "field-search mx-3 my-2.5";
const REVIVED_INPUT_CLASS = "w-full placeholder:text-dim";
// A row: the shared frame, then the resting or the chosen colours (never both, so no two utilities fight).
const RESULT_CLASS = "select-search-result grid cursor-pointer text-left focus-visible:outline-none";
const PLAIN_RESULT_CLASS = `${RESULT_CLASS} gap-0.5 border-b border-line px-2.5 py-2 hover:bg-raised focus-visible:bg-raised`;
const PLAIN_RESTING_CLASS = "text-text";
const PLAIN_CHOSEN_CLASS = "bg-accent/10 text-text";
const REVIVED_RESULT_CLASS = `${RESULT_CLASS} gap-1 rounded-sm border px-3 py-2.5 hover:border-accent focus-visible:border-accent`;
const REVIVED_RESTING_CLASS = "border-line bg-raised text-text";
const REVIVED_CHOSEN_CLASS = "border-accent bg-accent/10 text-text shadow-[inset_3px_0_var(--color-accent)]";
// A slate affix whose effect counts once across the equipped slates: an amber edge on the left.
const MAX_ONE_CLASS = "max-one-divinity border-l-3 border-l-warn pl-2";
const GROUP_CLASS = "text-[10px] text-accent-strong uppercase";
const REVIVED_GROUP_CLASS = "text-[10px] font-bold tracking-wide text-accent uppercase";
const AFFIX_ROW_CLASS = "select-affix-row flex flex-wrap items-baseline gap-x-1.5 gap-y-1 leading-snug";
const AFFIX_TAG_CLASS =
  "select-affix-tag inline-block flex-none rounded-sm border px-1 py-0.5 text-[10px]/tight font-bold whitespace-nowrap";
// The tag's colour: its god family's, as the talent trees tint it (a neutral chip for a family not listed). The
// families have no tokens of their own yet: the nearest status and damage tokens stand in, as tinted chips.
const AFFIX_FAMILY_TINT = {
  "god-of-might": "border-dmg-lightning/50 bg-dmg-lightning/15 text-dmg-lightning",
  "goddess-of-hunting": "border-ok/50 bg-ok/15 text-ok",
  "goddess-of-knowledge": "border-dmg-cold/50 bg-dmg-cold/15 text-dmg-cold",
  "god-of-war": "border-danger/50 bg-danger/15 text-danger",
  "goddess-of-deception": "border-violet/50 bg-violet/15 text-violet",
  "god-of-machines": "border-info/50 bg-info/15 text-info",
};
const affixTagClass = (family) =>
  `${AFFIX_TAG_CLASS} ${AFFIX_FAMILY_TINT[family] || "border-line-strong bg-raised text-muted"}`;
const MAX_BADGE_CLASS =
  "max-divinity-badge inline-block flex-none rounded-sm border border-warn/60 bg-warn/15 px-1.5 py-0.5 text-[10px]/tight font-bold tracking-wide whitespace-nowrap text-warn";
const NAME_CLASS = "text-xs";
const REVIVED_NAME_CLASS = "font-display text-sm text-text";
const DESCRIPTION_CLASS = "whitespace-pre-line text-xs/snug text-muted";
const CLAMPED_DESCRIPTION_CLASS = `${DESCRIPTION_CLASS} line-clamp-2`;
const META_CLASS = "text-xs text-dim";

function resultClass(option, revived) {
  const chosen = option.selected;
  const look = revived
    ? `${REVIVED_RESULT_CLASS} ${chosen ? REVIVED_CHOSEN_CLASS : REVIVED_RESTING_CLASS}`
    : `${PLAIN_RESULT_CLASS} ${chosen ? PLAIN_CHOSEN_CLASS : PLAIN_RESTING_CLASS}`;
  return `${look}${chosen ? " selected" : ""}${option.dataset.maxDivinityEffect === "1" ? ` ${MAX_ONE_CLASS}` : ""}`;
}

let searchableSelectTarget = null,
  searchableSelectMatches = [];
// A slate affix select's choices (too many for options of their own) and what a pick does, by select element; the
// slate crafter (apps/web/src/features/slates/SlateCrafter.tsx) registers each of its selects.
export const slateAffixSelectPools = new WeakMap();
function closeSearchableSelect() {
  $("#select-search-popover")?.remove();
  searchableSelectTarget = null;
  searchableSelectMatches = [];
}
function searchableOptions(select, query = "") {
  const needle = query.trim().toLowerCase();
  const pool = slateAffixSelectPools.get(select);
  if (pool) {
    const choices = pool.choices
      .map((option, index) => ({
        option: { ...option, selected: select.value === option.value },
        index: index + 1,
        label: option.textContent,
        group: "",
      }))
      .filter(({ label }) => !needle || label.toLowerCase().includes(needle))
      .slice(0, 99);
    return needle
      ? choices
      : [{ option: select.options[0], index: 0, label: select.options[0].textContent.trim(), group: "" }, ...choices];
  }
  return [...select.options]
    .map((option, index) => ({
      option,
      index,
      label: option.textContent.trim(),
      group: option.parentElement?.tagName === "OPTGROUP" ? option.parentElement.label : "",
    }))
    .filter(
      ({ option, label, group }) =>
        !option.disabled &&
        (!needle ||
          `${label} ${group} ${option.dataset.revivedDescription || ""} ${option.dataset.optionDescription || ""} ${option.dataset.optionMeta || ""}`
            .toLowerCase()
            .includes(needle)),
    );
}
function renderSearchableSelectResults(query = "") {
  const results = $("#select-search-results");
  if (!results || !searchableSelectTarget) return;
  searchableSelectMatches = searchableOptions(searchableSelectTarget, query);
  const revived = searchableSelectTarget.matches('[data-memory-field="revivedAffix"]');
  results.innerHTML = searchableSelectMatches.length
    ? searchableSelectMatches
        .map(
          ({ option, index, label, group }, resultIndex) =>
            `<button type="button" class="${resultClass(option, revived)}" data-select-search-index="${index}" data-select-search-result="${resultIndex}"${fullTextTitle([label, option.dataset.revivedDescription || option.dataset.optionDescription, option.dataset.optionMeta].filter(Boolean).join(" — "))}>${group ? `<small class="${revived ? REVIVED_GROUP_CLASS : GROUP_CLASS}">${escapeHtml(group)}</small>` : ""}${option.dataset.affixTree ? `<div class="${AFFIX_ROW_CLASS}"><span class="${affixTagClass(option.dataset.affixFamily)}">${escapeHtml(option.dataset.affixTree)}</span><span class="select-affix-details">${escapeHtml(option.dataset.affixDetails)}</span>${option.dataset.maxDivinityEffect === "1" ? `<strong class="${MAX_BADGE_CLASS}" title="Only one copy of this effect is active across equipped slates">MAX ACTIVE: 1</strong>` : ""}</div>` : option.dataset.revivedDescription ? `<strong class="select-revived-name ${revived ? REVIVED_NAME_CLASS : NAME_CLASS}">${escapeHtml(label)}</strong><span class="select-revived-description ${DESCRIPTION_CLASS}">${escapeHtml(option.dataset.revivedDescription)}</span>` : option.dataset.optionDescription || option.dataset.optionMeta ? `<strong class="select-option-name ${NAME_CLASS}">${escapeHtml(label)}</strong>${option.dataset.optionDescription ? `<span class="select-option-description ${CLAMPED_DESCRIPTION_CLASS}">${escapeHtml(option.dataset.optionDescription)}</span>` : ""}${option.dataset.optionMeta ? `<small class="select-option-meta ${META_CLASS}">${escapeHtml(option.dataset.optionMeta)}</small>` : ""}` : `<span class="truncate">${escapeHtml(label)}</span>`}</button>`,
        )
        .join("")
    : '<p class="m-3 text-center text-muted">No matching options</p>';
}
function openSearchableSelect(select, initialQuery = "") {
  closeSearchableSelect();
  searchableSelectTarget = select;
  const revivedAffix = select.matches('[data-memory-field="revivedAffix"]');
  const rect = select.getBoundingClientRect(),
    dialog = select.closest("dialog"),
    dialogRect = dialog?.getBoundingClientRect(),
    footerRect = dialog?.querySelector(":scope > footer")?.getBoundingClientRect(),
    popover = document.createElement("div");
  popover.id = "select-search-popover";
  popover.className = revivedAffix ? REVIVED_POPOVER_CLASS : POPOVER_CLASS;
  const boundaryTop = Math.max(8, (dialogRect?.top || 0) + 8),
    boundaryBottom = Math.min(window.innerHeight - 8, footerRect?.top || dialogRect?.bottom || window.innerHeight - 8),
    desiredHeight = revivedAffix ? 430 : 356,
    spaceBelow = boundaryBottom - rect.bottom - 4,
    spaceAbove = rect.top - boundaryTop - 4,
    openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow,
    availableHeight = Math.max(150, Math.min(desiredHeight, openAbove ? spaceAbove : spaceBelow));
  popover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(288, rect.width) - 8))}px`;
  popover.style.top = `${openAbove ? Math.max(boundaryTop, rect.top - availableHeight - 4) : rect.bottom + 4}px`;
  popover.style.width = `${Math.max(280, rect.width)}px`;
  popover.style.maxHeight = `${availableHeight}px`;
  popover.innerHTML = revivedAffix
    ? `<div class="${REVIVED_HEADING_CLASS}"><strong class="dialog-title">Select Revived Affix</strong><button type="button" class="${REVIVED_CLOSE_CLASS}" data-close-select-search aria-label="Close revived affix selector">×</button></div><label class="${REVIVED_SEARCH_CLASS}"><span aria-hidden="true">⌕</span><input type="search" class="${REVIVED_INPUT_CLASS}" aria-label="Search revived affixes" placeholder="Search revived affixes…" value="${escapeHtml(initialQuery)}"></label><div id="select-search-results" class="${REVIVED_RESULTS_CLASS}"></div>`
    : `<input type="search" class="${SEARCH_INPUT_CLASS}" aria-label="Search options" placeholder="Type to search…" value="${escapeHtml(initialQuery)}"><div id="select-search-results" class="${RESULTS_CLASS}"></div>`;
  const popoverHost = select.closest("dialog") || document.body;
  popoverHost.append(popover);
  if (typeof popover.showPopover === "function") {
    popover.setAttribute("popover", "manual");
    popover.showPopover();
  }
  renderSearchableSelectResults(initialQuery);
  const input = popover.querySelector("input"),
    results = popover.querySelector("#select-search-results");
  results.style.maxHeight = `${Math.max(70, availableHeight - (revivedAffix ? 112 : 58))}px`;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function chooseSearchableOption(index) {
  if (!searchableSelectTarget) return;
  const pool = slateAffixSelectPools.get(searchableSelectTarget);
  if (pool) {
    pool.choose(pool.choices[Number(index) - 1] || null);
    closeSearchableSelect();
    return;
  }
  searchableSelectTarget.selectedIndex = Number(index);
  searchableSelectTarget.dispatchEvent(new Event("input", { bubbles: true }));
  searchableSelectTarget.dispatchEvent(new Event("change", { bubbles: true }));
  closeSearchableSelect();
}

// Selects open the searchable list (a typed key or a press); number fields select their text when clicked or focused.
export function installSearchableSelectEvents() {
  document.addEventListener("keydown", (event) => {
    if (
      event.target.matches("select:not([data-native-select])") &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      openSearchableSelect(event.target, event.key);
      return;
    }
    if (!event.target.matches("#select-search-popover input")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearchableSelect();
    }
    if (event.key === "Enter" && searchableSelectMatches.length) {
      event.preventDefault();
      chooseSearchableOption(searchableSelectMatches[0].index);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target.matches("select:not([data-native-select])") && event.button === 0) {
      event.preventDefault();
      event.target.focus();
      openSearchableSelect(event.target);
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.matches("#select-search-popover input")) renderSearchableSelectResults(event.target.value);
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-select-search]")) {
      closeSearchableSelect();
      return;
    }
    const result = event.target.closest("[data-select-search-index]");
    if (result) {
      chooseSearchableOption(result.dataset.selectSearchIndex);
      return;
    }
    if (event.target.matches('input[type="number"]')) event.target.select();
    if (searchableSelectTarget && !event.target.closest("#select-search-popover") && !event.target.closest("select"))
      closeSearchableSelect();
  });
  document.addEventListener("focusin", (event) => {
    if (event.target.matches('input[type="number"]')) event.target.select();
  });
}
