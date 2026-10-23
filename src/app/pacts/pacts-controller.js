// The Pactspirits section: spirits, Fate slots and the Kismet crafter.
import {
  activeCapturedPactspirits,
  equippedKismetSummary,
  fateExtraSlots,
  fateSlotChoice,
  fateSlotChoices,
  kismetAffixesWithRolls,
  kismetCatalogSs14,
  kismetKindForRing,
  kismetRollControls,
  microFateEffectScale,
  normalizeKismetRolls,
  orderedPactspiritNodes,
  pactspiritCatalogSs14,
  pactspiritEffectsAtLevel,
  pactspiritLevel,
  pactspiritTreesSs14,
  selectPactspirit,
  selenaScorchingBeamPactsSs14,
  starTrailNote,
  togglePactNodeChain,
  transferKismetSlot,
} from "../../engine/index.ts";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { displayTexts } from "../bridge/display-text.ts";
import { searchText } from "../bridge/search-match.ts";
import { coverageView } from "../bridge/gear-item-view.ts";
import { kismetTooltipView, pactNodeTooltipView, pactspiritTooltipView } from "../bridge/pact-tooltip-view.ts";
import { pactsView, pactspiritSelectorView } from "../bridge/pacts-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { boostedKismetAffixParts } from "./kismet-markup.js";
import { kismetAffixCoverage, pactEffectCoverage } from "./pact-coverage.js";
import { curseLineLeftOutReason } from "../planner/curse-notes.js";
import { $, showToast } from "../planner/page.js";
import { persistPlannerState, plannerState, refreshPactCandidate, withRenderPass } from "../planner/session.js";

let selectedPactspiritSlot = 0;
let activeKismetSlot = null;
let selectedKismetName = "";
let selectedKismetRolls = [];
let pactspiritSelectorSession = 0; // the Pactspirit selector's openings (apps/web/src/features/pacts/PactspiritSelectorDialog.tsx)
export const pactCommands = {
  // Pactspirits section (apps/web/src/features/pacts).
  openPactspiritSelector: (slot) => {
    selectedPactspiritSlot = slot;
    pactspiritSelectorSession++;
    viewSourceChanged("pactspiritSelector");
    openDialog("pactspirit-selector");
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
      selenaScorchingBeamPactsSs14.pactspirits.map((spirit) => spirit.name),
    );
    closeDialog("pactspirit-selector");
    refreshPactCandidate();
  },
  removePactspirit: removeSelectedPactspirit,
  // A level change is saved without recalculating the page (as before); the section shows the new level.
  setPactspiritLevel: (name, level) => {
    plannerState.pacts.spiritLevels[name] = level;
    persistPlannerState();
    renderPacts();
  },
  togglePactNode: (spiritName, nodeIndex) => {
    plannerState.pacts.nativeNodeQuantities = togglePactNodeChain(
      plannerState.pacts.nativeNodeQuantities,
      spiritName,
      nodeIndex,
      orderedPactspiritNodes(pactspiritTreesSs14[spiritName]).length,
    );
    refreshPactCandidate();
  },
  openKismetCrafter,
  // The Kismet crafter (apps/web/src/features/pacts/KismetCrafterDialog.tsx).
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
export const pactQueries = {
  // A tree node's tooltip, or its Kismet's (apps/web/src/features/pacts/PactTooltip.tsx).
  pactNodeTooltip: (target) => withRenderPass(() => pactNodeTooltip(target)),
  // A Pactspirit's tooltip.
  pactspiritTooltip: (name, place = "slot") => withRenderPass(() => pactspiritTooltip(name, place)),
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

// The Pactspirits section's tooltips (src/app/bridge/pact-tooltip-view.ts). A line names why the curse limit leaves it
// out, when it does.
const lineCoverage = (status, line) => {
  const reason = curseLineLeftOutReason(line);
  return coverageView(status, reason ? `${status}: ${reason}` : "");
};
// A node as the section shows it ({ spirit, key, name, effect, ring, icon, allocated, extra }): its Kismet when one is
// installed, else its effect or its spirit's level bonuses.
function pactNodeTooltip(target) {
  const equipped = target.key ? plannerState.pacts.kismetSlots?.[target.key] : null,
    kismet = kismetCatalogSs14.find((item) => item.name === equipped?.name);
  const slotMode = Boolean(plannerState.pacts.kismetSlotMode);
  if (kismet) {
    const boost = microFateEffectScale(plannerState.pacts, target.key);
    return kismetTooltipView({
      kismet,
      affixes: kismetAffixesWithRolls(kismet, equipped.rolls).map((affix) => ({
        text: boostedKismetAffixParts(affix, boost),
        coverage: lineCoverage(kismetAffixCoverage(affix, { key: target.key }), affix),
      })),
      boostNote: starTrailNote(boost) || "",
      nodeName: target.name,
      slotMode,
      extra: target.extra,
    });
  }
  const entry = target.spirit ? pactspiritCatalogSs14.find((spirit) => spirit.name === target.spirit) : null;
  const level = target.spirit ? selectedPactspiritLevel(target.spirit) : 1;
  return pactNodeTooltipView({
    name: target.name,
    effect: target.effect,
    ring: target.ring,
    icon: target.icon || null,
    spirit: target.spirit ? { name: target.spirit, level, rarity: entry?.rarity || "" } : null,
    rewards:
      target.ring === "outer" && target.spirit
        ? pactspiritEffectsAtLevel(target.spirit, level).map((effect) => ({
            text: effect,
            coverage: lineCoverage(pactEffectCoverage(effect), effect),
          }))
        : [],
    effectCoverage: target.effect ? lineCoverage(pactEffectCoverage(target.effect), target.effect) : null,
    slotMode,
    allocated: target.allocated,
    holdsKismet: Boolean(kismetKindForRing(target.ring)),
  });
}
// A Pactspirit at the level this build gives it (a slot's, or the one it would take when chosen).
function pactspiritTooltip(name, place) {
  const spirit = pactspiritCatalogSs14.find((entry) => entry.name === name);
  if (!spirit) return null;
  const outer = pactspiritTreesSs14[name]?.find((node) => node.ring === "outer");
  const effectsByLevel = [1, 2, 3, 4, 5, 6].map((level) => pactspiritEffectsAtLevel(name, level));
  return pactspiritTooltipView({
    spirit,
    level: selectedPactspiritLevel(name),
    effectsByLevel: effectsByLevel.some((effects) => effects.length) ? effectsByLevel : [],
    outer: outer ? { icon: outer.icon, name: outer.name } : null,
    place,
  });
}

export function selectedPactspiritLevel(name) {
  const fallback = plannerState.pacts.kismetSlotMode
    ? 1
    : selenaScorchingBeamPactsSs14.pactspirits.find((spirit) => spirit.name === name)?.rank || 1;
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
    selenaScorchingBeamPactsSs14.pactspirits.map((spirit) => spirit.name),
  );
  refreshPactCandidate();
}

// The Fate slot selector (apps/web/src/features/pacts/FateSlotSelectorDialog.tsx) is open for this Pactspirit.
let fateSlotSpirit = "";
function openFateSlotSelector(name) {
  fateSlotSpirit = name;
  viewSourceChanged("fateSlotSelector");
  openDialog("fate-slot-selector");
}
function selectFateSlots(choiceId) {
  const name = fateSlotSpirit,
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
  closeDialog("fate-slot-selector");
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
  refreshPactCandidate();
}
function clearKismetNode(key) {
  if (!plannerState.pacts.kismetSlots?.[key]) return;
  const slots = { ...plannerState.pacts.kismetSlots };
  delete slots[key];
  plannerState.pacts.kismetSlots = slots;
  refreshPactCandidate();
}
// The Kismet crafter (apps/web/src/features/pacts/KismetCrafterDialog.tsx) shows the "kismetCrafter" source for the slot
// it is open for: its kind's Kismets (the dialog searches them), the chosen one's values and preview.
let kismetCrafterSession = 0,
  kismetCrafterKind = "micro";
function kismetChoices(kind = activeKismetSlot?.kind) {
  return kismetCatalogSs14
    .filter((item) => item.kind === kind)
    .sort(
      (a, b) =>
        (a.rarity === "Legendary" ? -1 : 1) - (b.rarity === "Legendary" ? -1 : 1) || a.name.localeCompare(b.name),
    );
}
function kismetCrafterSource() {
  const kindLabel = kismetCrafterKind === "micro" ? "Micro" : "Medium",
    entry = kismetCatalogSs14.find((item) => item.name === selectedKismetName),
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
      search: searchText([item.name, item.rarity, ...item.affixes]),
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
  const entry = kismetCatalogSs14.find((item) => item.name === name && item.kind === activeKismetSlot?.kind);
  if (!entry) return;
  selectedKismetName = name;
  selectedKismetRolls = normalizeKismetRolls(entry);
  viewSourceChanged("kismetCrafter");
}
// A value as typed: kept while it is in range (a value out of range waits for setKismetRoll's commit).
function setKismetRoll(index, value) {
  const entry = kismetCatalogSs14.find((item) => item.name === selectedKismetName),
    control = entry && kismetRollControls(entry)[index];
  if (!control || !Number.isFinite(value) || value < control.min || value > control.max) return;
  selectedKismetRolls = Object.assign([...selectedKismetRolls], { [index]: value });
  viewSourceChanged("kismetCrafter");
}
// A typed value committed (leaving the field): snapped to its step and range.
function commitKismetRoll(index, text) {
  const entry = kismetCatalogSs14.find((item) => item.name === selectedKismetName);
  if (!entry) return;
  selectedKismetRolls = normalizeKismetRolls(entry, Object.assign([...selectedKismetRolls], { [index]: text }));
  viewSourceChanged("kismetCrafter");
}
function openKismetCrafter(key, kind) {
  activeKismetSlot = { key, kind };
  kismetCrafterKind = kind;
  const saved = plannerState.pacts.kismetSlots?.[key],
    entry = kismetCatalogSs14.find((item) => item.name === saved?.name && item.kind === kind) || kismetChoices()[0];
  selectedKismetName = entry?.name || "";
  selectedKismetRolls = entry ? normalizeKismetRolls(entry, saved?.name === entry.name ? saved.rolls : []) : [];
  kismetCrafterSession++;
  viewSourceChanged("kismetCrafter");
  openDialog("kismet-crafter");
  $("#kismet-search").focus();
}
function saveKismetSlot(clear = false) {
  if (!activeKismetSlot) return;
  const next = { ...(plannerState.pacts.kismetSlots || {}) };
  if (clear) delete next[activeKismetSlot.key];
  else {
    const entry = kismetCatalogSs14.find(
      (item) => item.name === selectedKismetName && item.kind === activeKismetSlot.kind,
    );
    if (!entry) return;
    const current = equippedKismetSummary(selenaScorchingBeamPactsSs14, {
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
  closeDialog("kismet-crafter");
  activeKismetSlot = null;
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
  const summary = equippedKismetSummary(selenaScorchingBeamPactsSs14, {
    ...plannerState.pacts,
    kismetSlotMode: true,
    kismetSlots: result.slots,
  });
  if (summary.microCount > summary.microMax || summary.mediumCount > summary.mediumMax) {
    showToast(`${kind === "micro" ? "Micro" : "Medium"} Kismet slots are full`);
    return;
  }
  plannerState.pacts.kismetSlots = result.slots;
  refreshPactCandidate();
  showToast(`Kismet ${result.action}`);
}
