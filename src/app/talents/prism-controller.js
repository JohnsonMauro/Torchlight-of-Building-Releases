// Prisms: the inventory, the crafter and placing a prism on a talent node.
import {
  etherealPrismBases,
  inverseImageRoll,
  inverseImageRolls,
  prismAddedCoreEffect,
  prismAffixes,
  prismArea,
  prismBaseAffixesForBase,
  prismBaseEffect,
  prismLegendaryAffixesForBase,
  prismRareAffixesForBase,
  prismReplacesCore,
  prismSupportsLegendaryAffix,
} from "#engine";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { displayTexts } from "../bridge/display-text.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { coverageView } from "../bridge/gear-item-view.ts";
import { prismTooltipView } from "../bridge/talent-tooltip-view.ts";
import { prismAffixCoverage, prismAffixCoverageReason } from "../planner/calculation-coverage.js";
import { showToast } from "../planner/page.js";
import { persistPlannerState, plannerState, renderCandidateViews, talentRanks } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { prismIcon, prismName } from "./prism-icons.js";
import {
  clearInverseReflectedRanks,
  professionTreeLayoutsAll,
  reconcileTalentRanksAfterPrismChange,
  renderTalents,
} from "./talent-trees.js";

let activePrismTreeSlot = 1;
let prismDraft = null;
let prismEditingId = null;
// The crafter's page: "pick" (the type's bases as cards) or "form" (the picked base's affixes and the preview).
let prismStep = "pick";
export let pendingPrismPlacement = null;
export const prismCommands = {
  openPrismInventory,
  openPrismCrafter: () => openPrismCrafter(),
  setPrismType,
  pickPrismBase,
  repickPrism,
  setPrismAffix,
  setInverseRoll,
  cancelPrismCraft,
  confirmPrismCraft,
  editCraftedPrism,
  installCraftedPrism,
  deleteCraftedPrism,
  unequipPrism,
  cancelPrismPlacement,
  dropPrism,
};
export const prismViewSources = {
  // The prism inventory.
  prismInventory: prismInventorySource,
  // The Prism crafter.
  prismCrafter: prismCrafterSource,
};

// A prism's affix sections, as the crafter's preview and the prism tooltip show them: an Inverse Image's exclusive effect
// and mod values, or an Ethereal Prism's base affix and its random affixes. `kind` names the coverage badge's affix.
function prismAffixSectionsView(item) {
  if (item.type === "inverse")
    return [
      {
        className: "base",
        heading: "Prism Exclusive Effect",
        lines: [{ kind: "base", text: prismBaseEffect(item.type, item.base) }],
      },
      {
        className: "inverse-fixed",
        heading: "Fixed Affixes",
        lines: Object.entries(inverseImageRolls).map(([kind, range]) => {
          const value = inverseImageRoll(item, kind);
          return { kind, label: range.label, value, sign: inverseRollSign(value) };
        }),
      },
    ];
  return [
    {
      className: "base",
      heading: "Base Affix",
      // A base affix that adds an effect to the core (Haze's, from the game log) is the prism's own line; else the base's.
      lines: [
        {
          kind: "base",
          text: prismAddedCoreEffect(item)
            ? item.baseAffix
            : prismBaseEffect(item.type, item.base, item.legendaryAffix),
        },
      ],
    },
    ...[
      ["radiusAffix", "Radius Affix"],
      ["rareAffix", "Rare Affix"],
      ["legendaryAffix", "Legendary Affix"],
    ]
      .filter(([key]) => item[key] && (key !== "legendaryAffix" || prismSupportsLegendaryAffix(item)))
      .map(([key, heading]) => ({ className: key, heading, lines: [{ kind: key, text: item[key] }] })),
  ];
}
// An installed prism's tooltip (src/app/bridge/talent-tooltip-view.ts), each affix with whether the calculation uses it.
export function prismTooltip(item) {
  return prismTooltipView({
    name: prismName(item),
    icon: prismIcon(item) || "",
    inverse: item.type === "inverse",
    area: prismArea(item),
    sections: prismAffixSectionsView(item),
    coverage: (kind) => coverageView(prismAffixCoverage(item, kind), prismAffixCoverageReason(item, kind)),
  });
}
// The prism inventory's data (apps/web/src/features/talents/PrismInventoryDialog.tsx) for the tree slot it is open for.
function prismInventorySource() {
  const panel = plannerState.talents.selectedTrees[activePrismTreeSlot],
    installed = plannerState.talents.installedPrisms || {};
  return displayTexts({
    slot: activePrismTreeSlot + 1,
    items: (plannerState.talents.prismInventory || []).map((item) => {
      const usedAt = Object.entries(installed).find(([, id]) => id === item.id)?.[0] || "";
      return {
        id: item.id,
        name: prismName(item),
        icon: prismIcon(item) || "",
        detail: `${item.type === "inverse" ? "Inverse Image" : "Ethereal Prism"} · ${prismArea(item)} area${usedAt ? ` · Installed in ${usedAt}` : ""}`,
        equipped: usedAt === panel,
        installedElsewhere: Boolean(usedAt) && usedAt !== panel,
      };
    }),
    installedHere: Boolean(installed[panel]),
  });
}
// Prism inventory commands (apps/web/src/features/talents/PrismInventoryDialog.tsx).
function editCraftedPrism(id) {
  const item = plannerState.talents.prismInventory.find((entry) => entry.id === id);
  if (item) openPrismCrafter(item);
}
// Deleting a prism takes it off every tree it is installed in.
function deleteCraftedPrism(id) {
  for (const [name, itemId] of Object.entries(plannerState.talents.installedPrisms || {}))
    if (itemId === id) {
      const item = plannerState.talents.prismInventory.find((entry) => entry.id === id);
      clearInverseReflectedRanks(name, item, plannerState.talents.installedPrismNodes[name]);
      delete plannerState.talents.installedPrisms[name];
      delete plannerState.talents.installedPrismNodes[name];
      if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(name);
    }
  plannerState.talents.prismInventory = plannerState.talents.prismInventory.filter((item) => item.id !== id);
  persistPlannerState();
  renderCandidateViews();
  viewSourceChanged("prismInventory");
}
// Unequip current Prism: the tree the inventory is open for loses its prism.
function unequipPrism() {
  const name = plannerState.talents.selectedTrees[activePrismTreeSlot],
    item = plannerState.talents.prismInventory.find((entry) => entry.id === plannerState.talents.installedPrisms[name]);
  clearInverseReflectedRanks(name, item, plannerState.talents.installedPrismNodes[name]);
  delete plannerState.talents.installedPrisms[name];
  delete plannerState.talents.installedPrismNodes[name];
  if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(name);
  persistPlannerState();
  renderCandidateViews();
  viewSourceChanged("prismInventory");
}
export function openPrismInventory() {
  activePrismTreeSlot = plannerState.talents.selectedTrees.indexOf(ui.activeTalentPanel);
  if (activePrismTreeSlot <= 0) return;
  viewSourceChanged("prismInventory");
  openDialog("prism-inventory-dialog");
}
function inverseRollSign(value) {
  return value < 0 ? "negative" : value > 0 ? "positive" : "zero";
}
// The Prism crafter (apps/web/src/features/talents/PrismCrafterDialog.tsx) shows the "prismCrafter" source.
function renderPrismCrafter() {
  viewSourceChanged("prismCrafter");
}
const prismAffixOptionLabel = (kind, affix) =>
  kind === "legendary" && affix.includes("Gains a stack of Fortitude")
    ? `Fortitude — ${affix.match(/Owns (\d+) additional/)?.[1] || "?"} additional stack(s) — ${affix}`
    : affix;
const newEtherealDraft = () => ({
  type: "ethereal",
  base: "",
  radiusAffix: "",
  rareAffix: "",
  legendaryAffix: "",
  baseAffix: "",
});
function prismCrafterSource() {
  const draft = prismDraft || newEtherealDraft(),
    hasLegendary = prismSupportsLegendaryAffix(draft),
    replaces = prismReplacesCore(draft),
    icon = prismIcon(draft);
  const list = (kind, label) => {
    const options =
      kind === "rare"
        ? prismRareAffixesForBase(draft.base)
        : kind === "legendary"
          ? prismLegendaryAffixesForBase(draft.base)
          : prismAffixes[kind];
    return {
      kind,
      label,
      value: draft[`${kind}Affix`] || "",
      choices: options.map((affix) => ({ value: affix, label: prismAffixOptionLabel(kind, affix) })),
    };
  };
  const typeLabel = draft.type === "inverse" ? "Inverse Image" : "Ethereal Prism",
    step = prismStep === "form" && draft.base ? "form" : "pick";
  return displayTexts({
    title: `${prismEditingId ? "Edit" : "Craft"} ${draft.type === "inverse" ? "Inverse Image" : "Prism"}`,
    editing: Boolean(prismEditingId),
    type: draft.type,
    step,
    picks:
      step === "pick"
        ? (draft.type === "inverse" ? ["Inverse Image"] : etherealPrismBases).map((base) => ({
            value: base,
            label: base,
            icon: prismIcon({ type: draft.type, base }) || "",
            // What the base holds or can roll, for the search over the cards (every base rolls the same radius affixes).
            lines: [
              prismBaseEffect(draft.type, base),
              ...(draft.type === "ethereal"
                ? [
                    ...prismBaseAffixesForBase(base),
                    ...prismRareAffixesForBase(base),
                    ...prismLegendaryAffixesForBase(base).map((affix) => prismAffixOptionLabel("legendary", affix)),
                  ]
                : []),
            ],
          }))
        : [],
    path:
      step === "form"
        ? [
            { label: typeLabel, back: true },
            { label: draft.base, back: false },
          ]
        : [],
    inverse:
      step === "form" && draft.type === "inverse"
        ? {
            icon: prismIcon(draft),
            description: prismBaseEffect(draft.type, draft.base),
            rolls: Object.entries(inverseImageRolls).map(([kind, range]) => {
              const value = inverseImageRoll(draft, kind),
                width = range.max - range.min,
                zero = (100 * (0 - range.min)) / width,
                current = (100 * (value - range.min)) / width;
              return {
                kind,
                label: range.label,
                min: range.min,
                max: range.max,
                value,
                sign: inverseRollSign(value),
                start: Math.min(zero, current),
                end: Math.max(zero, current),
              };
            }),
          }
        : null,
    ethereal:
      step === "form" && draft.type === "ethereal"
        ? {
            base: draft.base,
            fixed: draft.base
              ? {
                  label: replaces ? "Core Talent" : "Prism Effect",
                  note: replaces
                    ? "This prism replaces the panel core talent"
                    : "This prism does not replace the panel core talent",
                  effect: prismBaseEffect(draft.type, draft.base, draft.legendaryAffix),
                }
              : null,
            // A base that rolls its base affix (Haze): the effect it adds to the panel's core, shown without the lead line.
            baseAffix: prismBaseAffixesForBase(draft.base).length
              ? {
                  value: draft.baseAffix || "",
                  choices: prismBaseAffixesForBase(draft.base).map((affix) => ({
                    value: affix,
                    label: prismAddedCoreEffect({ type: "ethereal", baseAffix: affix }),
                  })),
                }
              : null,
            count: [draft.radiusAffix, draft.rareAffix, hasLegendary && draft.legendaryAffix].filter(Boolean).length,
            max: hasLegendary ? 3 : 2,
            lists: [
              list("radius", "Radius"),
              list("rare", "Rare"),
              ...(hasLegendary ? [list("legendary", "Legendary")] : []),
            ],
          }
        : null,
    preview:
      step === "form"
        ? {
            inverse: draft.type === "inverse",
            icon: icon || "",
            name: prismName(draft),
            area: prismArea(draft),
            sections: prismAffixSectionsView(draft),
          }
        : null,
    canSave: step === "form",
    saveLabel: prismEditingId ? "Save Changes" : "Craft",
  });
}
// The crafter's type tabs: a new draft of that type (an Inverse Image starts at its worst rolls).
function setPrismType(type) {
  const inverse = type === "inverse";
  prismDraft = {
    type,
    base: inverse ? "Inverse Image" : "",
    radiusAffix: "",
    rareAffix: "",
    legendaryAffix: "",
    baseAffix: "",
    ...(inverse ? { inverseRolls: { micro: -100, medium: -100, legendary: -100 } } : {}),
  };
  prismStep = "pick";
  renderPrismCrafter();
}
// A base card picked: the form for that base, which keeps only the base, rare and legendary affixes it can roll.
function pickPrismBase(base) {
  if (!prismDraft) return;
  prismDraft.base = base;
  if (!prismBaseAffixesForBase(prismDraft.base).includes(prismDraft.baseAffix)) prismDraft.baseAffix = "";
  if (!prismRareAffixesForBase(prismDraft.base).includes(prismDraft.rareAffix)) prismDraft.rareAffix = "";
  if (!prismLegendaryAffixesForBase(prismDraft.base).includes(prismDraft.legendaryAffix))
    prismDraft.legendaryAffix = "";
  prismStep = "form";
  renderPrismCrafter();
}
// The form's path back to the type's bases (the draft keeps its affixes for the next base).
function repickPrism() {
  prismStep = "pick";
  renderPrismCrafter();
}
function setPrismAffix(kind, value) {
  if (!prismDraft) return;
  prismDraft[`${kind}Affix`] = value;
  renderPrismCrafter();
}
// An Inverse Image's mod value, rounded and kept in its range.
function setInverseRoll(kind, number) {
  if (prismDraft?.type !== "inverse" || !Number.isFinite(number)) return;
  const range = inverseImageRolls[kind];
  prismDraft.inverseRolls = {
    ...prismDraft.inverseRolls,
    [kind]: Math.max(range.min, Math.min(range.max, Math.round(number))),
  };
  renderPrismCrafter();
}
// Cancel or the close button: back to the prism inventory.
function cancelPrismCraft() {
  closeDialog("prism-crafter-dialog");
  openPrismInventory();
}
function confirmPrismCraft() {
  if (!prismDraft?.base || prismStep !== "form") return;
  const editing = Boolean(prismEditingId),
    item = {
      ...prismDraft,
      legendaryAffix: prismSupportsLegendaryAffix(prismDraft) ? prismDraft.legendaryAffix : "",
      id: prismEditingId || globalThis.crypto?.randomUUID?.() || `prism-${Date.now()}`,
    };
  if (editing) {
    const index = plannerState.talents.prismInventory.findIndex((entry) => entry.id === prismEditingId);
    if (index < 0) return;
    plannerState.talents.prismInventory[index] = item;
  } else plannerState.talents.prismInventory.push(item);
  persistPlannerState();
  closeDialog("prism-crafter-dialog");
  renderCandidateViews();
  viewSourceChanged("prismInventory");
  openDialog("prism-inventory-dialog");
  showToast(`${prismName(item)} ${editing ? "updated" : "crafted"}`);
}
function openPrismCrafter(item = null) {
  closeDialog("prism-inventory-dialog");
  prismEditingId = item?.id || null;
  prismDraft = item
    ? { ...item, ...(item.inverseRolls ? { inverseRolls: { ...item.inverseRolls } } : {}) }
    : newEtherealDraft();
  prismStep = item ? "form" : "pick";
  renderPrismCrafter();
  openDialog("prism-crafter-dialog");
}
function installCraftedPrism(id) {
  const item = (plannerState.talents.prismInventory || []).find((entry) => entry.id === id),
    panel = plannerState.talents.selectedTrees[activePrismTreeSlot];
  if (!item || !panel) return;
  const other = Object.entries(plannerState.talents.installedPrisms || {}).find(
    ([name, installedId]) =>
      name !== panel &&
      (plannerState.talents.prismInventory || []).find((entry) => entry.id === installedId)?.type === item.type,
  );
  if (other) {
    showToast(`${item.type === "inverse" ? "Inverse Image" : "Ethereal Prism"} is already installed in ${other[0]}`);
    return;
  }
  pendingPrismPlacement = { id, panel };
  closeDialog("prism-inventory-dialog");
  renderTalents();
}
export function placeCraftedPrism(coordinate) {
  if (!pendingPrismPlacement) return;
  const { id, panel } = pendingPrismPlacement,
    item = (plannerState.talents.prismInventory || []).find((entry) => entry.id === id);
  if (!item || ui.activeTalentPanel !== panel) return;
  if (!professionTreeLayoutsAll[panel]?.nodes.some((node) => node.coordinate.join(",") === coordinate)) return;
  const previous = (plannerState.talents.prismInventory || []).find(
    (entry) => entry.id === plannerState.talents.installedPrisms?.[panel],
  );
  clearInverseReflectedRanks(panel, previous, plannerState.talents.installedPrismNodes?.[panel]);
  clearInverseReflectedRanks(panel, item, coordinate);
  plannerState.talents.installedPrisms = { ...(plannerState.talents.installedPrisms || {}), [panel]: id };
  plannerState.talents.installedPrismNodes = {
    ...(plannerState.talents.installedPrismNodes || {}),
    [panel]: coordinate,
  };
  talentRanks.set(`${panel}:${coordinate}`, 0);
  if (previous?.type === "inverse" || item.type === "inverse") reconcileTalentRanksAfterPrismChange(panel);
  pendingPrismPlacement = null;
  persistPlannerState();
  renderCandidateViews();
  showToast(`${prismName(item)} installed on node ${coordinate}`);
}
function cancelPrismPlacement() {
  clearPendingPrism();
  renderTalents();
}
// Opening a tree drops a prism still waiting for its node.
export function clearPendingPrism() {
  pendingPrismPlacement = null;
}
// The end of a drag of the installed prism: onto another node of the open tree it moves there; anywhere else it stays.
function dropPrism(coordinate) {
  const panel = ui.activeTalentPanel,
    origin = plannerState.talents.installedPrismNodes?.[panel];
  const valid =
    coordinate && professionTreeLayoutsAll[panel]?.nodes.some((node) => node.coordinate.join(",") === coordinate);
  if (!valid) {
    showToast("Invalid drop · Prism returned to its original node");
    return;
  }
  if (coordinate === origin) return;
  const item = plannerState.talents.prismInventory.find(
    (entry) => entry.id === plannerState.talents.installedPrisms?.[panel],
  );
  clearInverseReflectedRanks(panel, item, origin);
  clearInverseReflectedRanks(panel, item, coordinate);
  plannerState.talents.installedPrismNodes[panel] = coordinate;
  talentRanks.set(`${panel}:${coordinate}`, 0);
  if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(panel);
  persistPlannerState();
  renderCandidateViews();
  showToast(`Prism moved to node ${coordinate}`);
}
