// The Pactspirits section: spirits, Fate slots and the Kismet crafter.
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { pactspiritTreesSs13 } from "../../data/pacts/pactspirit-trees-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "../../data/pacts/selena-scorching-beam-ss13.js";
import { fateExtraSlots, fateSlotChoice, fateSlotChoices } from "../../engine/pacts/fate-slot-unlocks.js";
import {
  kismetAffixesWithRolls,
  kismetRollControls,
  normalizeKismetRolls,
} from "../../engine/pacts/kismet-crafting.js";
import { microFateEffectScale, starTrailNote } from "../../engine/pacts/kismet-effects.js";
import { transferKismetSlot } from "../../engine/pacts/kismet-slot-transfer.js";
import { equippedKismetSummary } from "../../engine/pacts/pact-kismet-summary.js";
import { orderedPactspiritNodes, pactspiritLevel, togglePactNodeChain } from "../../engine/pacts/pactspirit-levels.js";
import { activeCapturedPactspirits, selectPactspirit } from "../../engine/pacts/pactspirit-selection.js";
import { displayTexts } from "../bridge/display-text.ts";
import { pactsView, pactspiritSelectorView } from "../bridge/pacts-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { boostedKismetAffixParts } from "../kismet-markup.js";
import { $, showToast } from "../planner/page.js";
import { persistPlannerState, plannerState, refreshPactCandidate } from "../planner/session.js";
import { hidePlannerTooltip } from "../tooltips/tooltip-host.js";

let selectedPactspiritSlot = 0;
let activeKismetSlot = null;
let selectedKismetName = "";
let selectedKismetRolls = [];
let pactspiritSelectorSession = 0; // the Pactspirit selector's openings (apps/web/src/shell/dialogs/PactspiritSelectorDialog.tsx)
export const pactCommands = {
  // Pactspirits section (apps/web/src/features/pacts).
  openPactspiritSelector: (slot) => {
    selectedPactspiritSlot = slot;
    pactspiritSelectorSession++;
    viewSourceChanged("pactspiritSelector");
    $("#pactspirit-selector").showModal();
    $("[data-pactspirit-search]").focus();
  },
  selectPactspirit: (name) => {
    plannerState.pacts.selectedSpirits = selectPactspirit(
      plannerState.pacts.selectedSpirits,
      selectedPactspiritSlot,
      name,
    );
    plannerState.pacts.activeSpirits = activeCapturedPactspirits(
      plannerState.pacts.selectedSpirits,
      selenaScorchingBeamPactsSs13.pactspirits.map((spirit) => spirit.name),
    );
    $("#pactspirit-selector").close();
    refreshPactCandidate();
  },
  removePactspirit: removeSelectedPactspirit,
  // A level change is saved without recalculating the page (as before); the section shows the new level.
  setPactspiritLevel: (name, level) => {
    plannerState.pacts.spiritLevels[name] = level;
    hidePlannerTooltip();
    persistPlannerState();
    renderPacts();
  },
  togglePactNode: (spiritName, nodeIndex) => {
    plannerState.pacts.nativeNodeQuantities = togglePactNodeChain(
      plannerState.pacts.nativeNodeQuantities,
      spiritName,
      nodeIndex,
      orderedPactspiritNodes(pactspiritTreesSs13[spiritName]).length,
    );
    refreshPactCandidate();
  },
  openKismetCrafter,
  // The Kismet crafter (apps/web/src/shell/dialogs/KismetCrafterDialog.tsx).
  selectKismetChoice,
  setKismetRoll,
  commitKismetRoll,
  confirmKismet: () => saveKismetSlot(),
  clearKismetCrafterSlot: () => saveKismetSlot(true),
  closeKismetCrafter: () => {
    activeKismetSlot = null;
  },
  clearKismetSlot: clearKismetNode,
  openFateSlotSelector,
  clearFateSlots,
  selectFateSlots,
  moveKismet,
};
export const pactViewSources = {
  // The Pactspirits section's data (src/app/bridge/pacts-view-model.ts).
  pacts: () => pactsView(plannerState.pacts),
  // The Pactspirit selector's data (src/app/bridge/pacts-view-model.ts).
  pactspiritSelector: () => ({ session: pactspiritSelectorSession, ...pactspiritSelectorView() }),
  // The Kismet crafter.
  kismetCrafter: kismetCrafterSource,
  fateSlotSelector: () => ({
    spirit: fateSlotSpirit,
    selected: plannerState.pacts.fateUnlocks?.[fateSlotSpirit] || "",
    choices: fateSlotChoices.map((choice) => ({ id: choice.id, label: choice.label })),
  }),
};

export function selectedPactspiritLevel(name) {
  const fallback = plannerState.pacts.kismetSlotMode
    ? 1
    : selenaScorchingBeamPactsSs13.pactspirits.find((spirit) => spirit.name === name)?.rank || 1;
  return pactspiritLevel(name, plannerState.pacts.spiritLevels, fallback);
}

// The Pactspirits section is React (apps/web/src/features/pacts): it re-reads its source.
export function renderPacts() {
  viewSourceChanged("pacts");
}

function removeSelectedPactspirit(index) {
  if (!plannerState.pacts.selectedSpirits[index]) return;
  plannerState.pacts.selectedSpirits[index] = "";
  plannerState.pacts.activeSpirits = activeCapturedPactspirits(
    plannerState.pacts.selectedSpirits,
    selenaScorchingBeamPactsSs13.pactspirits.map((spirit) => spirit.name),
  );
  hidePlannerTooltip();
  refreshPactCandidate();
}

// The Fate slot selector (apps/web/src/shell/dialogs/FateSlotSelectorDialog.tsx) is open for this Pactspirit.
let fateSlotSpirit = "";
function openFateSlotSelector(name) {
  fateSlotSpirit = name;
  viewSourceChanged("fateSlotSelector");
  $("#fate-slot-selector").showModal();
}
function selectFateSlots(choiceId) {
  const dialog = $("#fate-slot-selector"),
    name = fateSlotSpirit,
    choice = fateSlotChoice(choiceId);
  if (!name || !choice) return;
  const nextUnlocks = { ...(plannerState.pacts.fateUnlocks || {}), [name]: choice.id };
  const validKeys = new Set(fateExtraSlots(name, choice.id).map((slot) => slot.key));
  const nextKismets = Object.fromEntries(
    Object.entries(plannerState.pacts.kismetSlots || {}).filter(
      ([key]) => key !== `${name}:10` && (!key.startsWith(`${name}:extra:`) || validKeys.has(key)),
    ),
  );
  plannerState.pacts.fateUnlocks = nextUnlocks;
  plannerState.pacts.kismetSlots = nextKismets;
  plannerState.pacts.kismetSlotMode = true;
  dialog.close();
  hidePlannerTooltip();
  refreshPactCandidate();
}
function clearFateSlots(name) {
  if (!name) return;
  const unlocks = { ...(plannerState.pacts.fateUnlocks || {}) };
  delete unlocks[name];
  plannerState.pacts.fateUnlocks = unlocks;
  plannerState.pacts.kismetSlots = Object.fromEntries(
    Object.entries(plannerState.pacts.kismetSlots || {}).filter(([key]) => !key.startsWith(`${name}:extra:`)),
  );
  hidePlannerTooltip();
  refreshPactCandidate();
}
function clearKismetNode(key) {
  if (!plannerState.pacts.kismetSlots?.[key]) return;
  const slots = { ...plannerState.pacts.kismetSlots };
  delete slots[key];
  plannerState.pacts.kismetSlots = slots;
  hidePlannerTooltip();
  refreshPactCandidate();
}
// The Kismet crafter (apps/web/src/shell/dialogs/KismetCrafterDialog.tsx) shows the "kismetCrafter" source for the slot
// it is open for: its kind's Kismets (the dialog searches them), the chosen one's values and preview.
let kismetCrafterSession = 0,
  kismetCrafterKind = "micro";
function kismetChoices(kind = activeKismetSlot?.kind) {
  return kismetCatalogSs13
    .filter((item) => item.kind === kind)
    .sort(
      (a, b) =>
        (a.rarity === "Legendary" ? -1 : 1) - (b.rarity === "Legendary" ? -1 : 1) || a.name.localeCompare(b.name),
    );
}
function kismetCrafterSource() {
  const kindLabel = kismetCrafterKind === "micro" ? "Micro" : "Medium",
    entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName),
    controls = entry ? kismetRollControls(entry) : [];
  const previewBoost =
    entry && activeKismetSlot
      ? microFateEffectScale(
          {
            ...plannerState.pacts,
            kismetSlots: { ...plannerState.pacts.kismetSlots, [activeKismetSlot.key]: { name: entry.name } },
          },
          activeKismetSlot.key,
        )
      : null;
  return {
    session: kismetCrafterSession,
    title: `Select ${kindLabel} Kismet`,
    selected: selectedKismetName,
    choices: kismetChoices(kismetCrafterKind).map((item) => ({
      name: item.name,
      search: `${item.name} ${item.affixes.join(" ")}`.toLowerCase(),
      icon: item.icon,
      rarity: item.rarity,
      ...displayTexts({ label: item.name, affixes: item.affixes.join(" · ") }),
    })),
    rolls: controls.map((control, index) => ({
      index,
      min: control.min,
      max: control.max,
      step: control.step,
      value: selectedKismetRolls[index],
      affix: displayTexts(entry.affixes[control.affixIndex]),
    })),
    preview: entry
      ? {
          icon: entry.icon,
          ...displayTexts({
            name: entry.name,
            detail: `${entry.rarity} · ${entry.kind === "micro" ? "Micro" : "Medium"} Kismet${starTrailNote(previewBoost) ? ` · ${starTrailNote(previewBoost)}` : ""}`,
            affixes: kismetAffixesWithRolls(entry, selectedKismetRolls).map((affix) =>
              boostedKismetAffixParts(affix, previewBoost),
            ),
            install: `Install to replace this ${entry.kind === "micro" ? "Micro" : "Medium"} node.`,
          }),
        }
      : null,
  };
}
function selectKismetChoice(name) {
  const entry = kismetCatalogSs13.find((item) => item.name === name && item.kind === activeKismetSlot?.kind);
  if (!entry) return;
  selectedKismetName = name;
  selectedKismetRolls = normalizeKismetRolls(entry);
  viewSourceChanged("kismetCrafter");
}
// A value as typed: kept while it is in range (a value out of range waits for setKismetRoll's commit).
function setKismetRoll(index, value) {
  const entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName),
    control = entry && kismetRollControls(entry)[index];
  if (!control || !Number.isFinite(value) || value < control.min || value > control.max) return;
  selectedKismetRolls = Object.assign([...selectedKismetRolls], { [index]: value });
  viewSourceChanged("kismetCrafter");
}
// A typed value committed (leaving the field): snapped to its step and range.
function commitKismetRoll(index, text) {
  const entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName);
  if (!entry) return;
  selectedKismetRolls = normalizeKismetRolls(entry, Object.assign([...selectedKismetRolls], { [index]: text }));
  viewSourceChanged("kismetCrafter");
}
function openKismetCrafter(key, kind) {
  activeKismetSlot = { key, kind };
  kismetCrafterKind = kind;
  const saved = plannerState.pacts.kismetSlots?.[key],
    entry = kismetCatalogSs13.find((item) => item.name === saved?.name && item.kind === kind) || kismetChoices()[0];
  selectedKismetName = entry?.name || "";
  selectedKismetRolls = entry ? normalizeKismetRolls(entry, saved?.name === entry.name ? saved.rolls : []) : [];
  kismetCrafterSession++;
  viewSourceChanged("kismetCrafter");
  $("#kismet-crafter").showModal();
  $("#kismet-search").focus();
}
function saveKismetSlot(clear = false) {
  if (!activeKismetSlot) return;
  const next = { ...(plannerState.pacts.kismetSlots || {}) };
  if (clear) delete next[activeKismetSlot.key];
  else {
    const entry = kismetCatalogSs13.find(
      (item) => item.name === selectedKismetName && item.kind === activeKismetSlot.kind,
    );
    if (!entry) return;
    const current = equippedKismetSummary(selenaScorchingBeamPactsSs13, {
      ...plannerState.pacts,
      kismetSlotMode: true,
      kismetSlots: next,
    });
    if (
      !next[activeKismetSlot.key] &&
      (entry.kind === "micro" ? current.microCount >= current.microMax : current.mediumCount >= current.mediumMax)
    ) {
      showToast(`${entry.kind === "micro" ? "Micro" : "Medium"} Kismet slots are full`);
      return;
    }
    next[activeKismetSlot.key] = { name: entry.name, rolls: normalizeKismetRolls(entry, selectedKismetRolls) };
  }
  plannerState.pacts.kismetSlots = next;
  plannerState.pacts.kismetSlotMode = true;
  $("#kismet-crafter").close();
  activeKismetSlot = null;
  hidePlannerTooltip();
  refreshPactCandidate();
}
// Moves (or copies) a Kismet dropped on another slot of its kind (apps/web/src/features/pacts/use-kismet-drag.ts).
function moveKismet(fromKey, toKey, kind, duplicate) {
  const result = transferKismetSlot(plannerState.pacts.kismetSlots, fromKey, toKey, { duplicate });
  if (result.error) {
    showToast(result.error);
    return;
  }
  if (result.action === "unchanged") return;
  const summary = equippedKismetSummary(selenaScorchingBeamPactsSs13, {
    ...plannerState.pacts,
    kismetSlotMode: true,
    kismetSlots: result.slots,
  });
  if (summary.microCount > summary.microMax || summary.mediumCount > summary.mediumMax) {
    showToast(`${kind === "micro" ? "Micro" : "Medium"} Kismet slots are full`);
    return;
  }
  plannerState.pacts.kismetSlots = result.slots;
  hidePlannerTooltip();
  refreshPactCandidate();
  showToast(`Kismet ${result.action}`);
}
