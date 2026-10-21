// The searchable list that replaces a <select>'s native popup (type to filter, Enter picks the first match).
import { escapeHtml } from "../html.js";
import { $, fullTextTitle } from "./page.js";

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
  results.innerHTML = searchableSelectMatches.length
    ? searchableSelectMatches
        .map(
          ({ option, index, label, group }, resultIndex) =>
            `<button type="button" class="select-search-result ${option.selected ? "selected" : ""} ${option.dataset.maxDivinityEffect === "1" ? "max-one-divinity" : ""}" data-select-search-index="${index}" data-select-search-result="${resultIndex}"${fullTextTitle([label, option.dataset.revivedDescription || option.dataset.optionDescription, option.dataset.optionMeta].filter(Boolean).join(" — "))}>${group ? `<small>${escapeHtml(group)}</small>` : ""}${option.dataset.affixTree ? `<div class="select-affix-row"><span class="select-affix-tag talent-family-${escapeHtml(option.dataset.affixFamily)}">${escapeHtml(option.dataset.affixTree)}</span><span class="select-affix-details">${escapeHtml(option.dataset.affixDetails)}</span>${option.dataset.maxDivinityEffect === "1" ? '<strong class="max-divinity-badge" title="Only one copy of this effect is active across equipped slates">MAX ACTIVE: 1</strong>' : ""}</div>` : option.dataset.revivedDescription ? `<strong class="select-revived-name">${escapeHtml(label)}</strong><span class="select-revived-description">${escapeHtml(option.dataset.revivedDescription)}</span>` : option.dataset.optionDescription || option.dataset.optionMeta ? `<strong class="select-option-name">${escapeHtml(label)}</strong>${option.dataset.optionDescription ? `<span class="select-option-description">${escapeHtml(option.dataset.optionDescription)}</span>` : ""}${option.dataset.optionMeta ? `<small class="select-option-meta">${escapeHtml(option.dataset.optionMeta)}</small>` : ""}` : `<span>${escapeHtml(label)}</span>`}</button>`,
        )
        .join("")
    : "<p>No matching options</p>";
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
  popover.className = `select-search-popover${revivedAffix ? " revived-affix-picker" : ""}`;
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
    ? `<div class="revived-picker-heading"><strong>Select Revived Affix</strong><button type="button" data-close-select-search aria-label="Close revived affix selector">×</button></div><label class="revived-picker-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search revived affixes" placeholder="Search revived affixes…" value="${escapeHtml(initialQuery)}"></label><div id="select-search-results"></div>`
    : `<input type="search" aria-label="Search options" placeholder="Type to search…" value="${escapeHtml(initialQuery)}"><div id="select-search-results"></div>`;
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
