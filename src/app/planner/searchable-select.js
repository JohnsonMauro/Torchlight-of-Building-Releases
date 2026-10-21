// The searchable list that replaces a <select>'s native popup (type to filter, Enter picks the first match).
import { escapeHtml } from "../html.js";
import { $, fullTextTitle } from "./page.js";

// The look (Tailwind utility lists). The plain list: a dark popover with a search box and flat rows, the chosen row
// (.selected) lit. The revived-affix picker (hero memories): a bronze-edged panel with a title bar and framed cards.
const POPOVER_CLASS =
  "select-search-popover fixed z-10000 m-0 max-w-[calc(100vw-16px)] rounded-md border border-[#526174] bg-[#0c141e] p-2 text-sm/[normal] text-text shadow-[0_14px_38px_rgb(0_0_0/0.73)]";
const REVIVED_POPOVER_CLASS =
  "select-search-popover revived-affix-picker fixed z-10000 m-0 flex max-w-[calc(100vw-16px)] flex-col rounded-[5px] border border-bronze bg-[linear-gradient(150deg,#1d2329,#111821_72%)] p-0 text-sm/[normal] text-[#f1e6d0] shadow-[0_26px_75px_rgb(0_0_0/0.7),inset_0_1px_rgb(255_231_165/0.12)]";
const SEARCH_INPUT_CLASS =
  "w-full rounded-sm border border-[#526174] bg-[#172235] p-2.5 text-[#f1f5f8] outline-none focus:border-[#ff8124]";
const RESULTS_CLASS = "mt-1.5 grid overflow-auto";
const REVIVED_RESULTS_CLASS = "grid gap-1.5 overflow-y-auto px-3 pb-3";
const REVIVED_HEADING_CLASS =
  "flex items-center justify-between gap-3 border-b border-[#956d37] bg-[linear-gradient(105deg,rgb(246_193_84/0.15),rgb(206_139_50/0.06)_43%,transparent_82%),linear-gradient(180deg,#252a2c,#151c25)] px-3.5 py-2.5";
const REVIVED_CLOSE_CLASS =
  "cursor-pointer text-[1.2rem]/none text-[#d6b77e] hover:text-[#fff1bd] focus-visible:text-[#fff1bd] focus-visible:outline-none";
const REVIVED_SEARCH_CLASS =
  "mx-3 my-2.5 flex items-center gap-2 rounded-sm border border-[#756044] bg-[linear-gradient(180deg,#171e27,#0c131b)] px-2.5 text-gold focus-within:border-[#e7b35d] focus-within:shadow-[0_0_0_2px_rgb(249_202_101/0.18)]";
const REVIVED_INPUT_CLASS = "w-full min-w-0 py-2.25 text-[#f1e5cc] outline-0 placeholder:text-[#99a5af]";
// A row: the shared frame, then the resting or the chosen colours (never both, so no two utilities fight).
const RESULT_CLASS = "select-search-result grid cursor-pointer text-left focus-visible:outline-none";
const PLAIN_RESULT_CLASS = `${RESULT_CLASS} gap-0.5 border-b border-[#222f3e] px-2.5 py-2 hover:bg-[#26364a] hover:text-white focus-visible:bg-[#26364a]`;
const PLAIN_RESTING_CLASS = "text-[#edf3f8]";
const PLAIN_CHOSEN_CLASS = "bg-[#26364a] text-white";
const REVIVED_RESULT_CLASS = `${RESULT_CLASS} gap-1 rounded-sm border px-2.75 py-2.5 hover:border-[#e7b35d] hover:bg-[linear-gradient(145deg,#342e25,#1b2229)] hover:text-[#fff1bd] focus-visible:border-[#e7b35d] focus-visible:bg-[linear-gradient(145deg,#342e25,#1b2229)]`;
const REVIVED_RESTING_CLASS =
  "border-[#554a3a] bg-[linear-gradient(145deg,#1d252d,#151b23)] text-[#e9dcc0] shadow-[inset_0_1px_rgb(255_231_165/0.05)]";
const REVIVED_CHOSEN_CLASS =
  "border-[#e7b35d] bg-[linear-gradient(145deg,#342e25,#1b2229)] text-[#fff1bd] shadow-[inset_3px_0_#e8ad4f]";
// A slate affix whose effect counts once across the equipped slates: an amber edge on the left.
const MAX_ONE_CLASS = "max-one-divinity border-l-3 border-l-[#ffaf45] pl-1.75";
const GROUP_CLASS = "text-[0.61rem] text-[#ff8a2b] uppercase";
const REVIVED_GROUP_CLASS = "text-[0.64rem] font-extrabold tracking-[0.06em] text-[#e8ad4f] uppercase";
const AFFIX_ROW_CLASS = "select-affix-row flex flex-wrap items-baseline gap-x-1.5 gap-y-1 leading-[1.35]";
const AFFIX_TAG_CLASS =
  "select-affix-tag inline-block flex-none rounded-[3px] px-1.25 py-0.5 text-[0.65rem]/[1.2] font-bold whitespace-nowrap text-[#111820]";
// The tag's colour: its god family's, as the talent trees tint it (pale blue for a family not listed).
const AFFIX_FAMILY_BG = {
  "god-of-might": "bg-[#f4bd4e]",
  "goddess-of-hunting": "bg-[#62d76e]",
  "goddess-of-knowledge": "bg-[#69b7ff]",
  "god-of-war": "bg-[#f06c69]",
  "goddess-of-deception": "bg-[#c276ed]",
  "god-of-machines": "bg-[#52d6dc]",
};
const affixTagClass = (family) => `${AFFIX_TAG_CLASS} ${AFFIX_FAMILY_BG[family] || "bg-[#b9d7ff]"}`;
const MAX_BADGE_CLASS =
  "max-divinity-badge inline-block flex-none rounded-[3px] border border-[#ffb34f] bg-[#ffc36d] px-1.5 py-0.5 text-[0.62rem]/[1.2] font-black tracking-[0.04em] whitespace-nowrap text-[#211508]";
const NAME_CLASS = "text-[0.78rem]";
const REVIVED_NAME_CLASS = "font-display text-[0.84rem] text-[#f1e6d0]";
const DESCRIPTION_CLASS = "whitespace-pre-line text-[0.72rem]/[1.4] text-[#b8c5d3]";
const CLAMPED_DESCRIPTION_CLASS = `${DESCRIPTION_CLASS} line-clamp-2`;
const META_CLASS = "text-[0.64rem] text-[#8e9cad]";

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
// slate crafter (apps/web/src/shell/dialogs/SlateCrafter.tsx) registers each of its selects.
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
    : '<p class="m-3 text-center text-[#8e9cad]">No matching options</p>';
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
    ? `<div class="${REVIVED_HEADING_CLASS}"><strong class="font-display text-[0.92rem] font-black text-gold">Select Revived Affix</strong><button type="button" class="${REVIVED_CLOSE_CLASS}" data-close-select-search aria-label="Close revived affix selector">×</button></div><label class="${REVIVED_SEARCH_CLASS}"><span aria-hidden="true">⌕</span><input type="search" class="${REVIVED_INPUT_CLASS}" aria-label="Search revived affixes" placeholder="Search revived affixes…" value="${escapeHtml(initialQuery)}"></label><div id="select-search-results" class="${REVIVED_RESULTS_CLASS}"></div>`
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
