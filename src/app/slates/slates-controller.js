// The Divinity Slates board, the Slate Inventory, the slate crafter and the slate editor.
import {
  canPlaceSlate,
  divinitySlateAffixes,
  isActiveJudgment,
  isCopySlate,
  judgmentAffectedSlateIds,
  judgmentAffixTargetPercent,
  scaleJudgmentAffix,
  slateSize,
  slateTransformRules,
} from "#engine";
import { closeDialog, dialogOpen, openDialog } from "../bridge/dialogs.ts";
import { displayTexts } from "../bridge/display-text.ts";
import { coverageView } from "../bridge/gear-item-view.ts";
import { slateTooltipView } from "../bridge/slate-tooltip-view.ts";
import { slatesView } from "../bridge/slates-view-model.ts";
import { slateLineCoverage } from "../planner/calculation-coverage.js";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { showToast, titleCase } from "../planner/page.js";
import { slateAffixSelectPools } from "../planner/searchable-select.js";
import {
  currentPlanner,
  equippedSlateIds,
  parkedSlates,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  setParkedSlates,
  setSlatePlacements,
  slatePlacements,
  slatesForBoard,
  withRenderPass,
} from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import {
  legendaryTalentSlotTypes,
  slateCraftedAffixGroups,
  slateGodFamilyClass,
  slateGodKey,
} from "./slate-catalog.js";
import {
  changeSlateCraft as changeSlateCraftDraft,
  craftedSlate,
  drawnSlateCraft,
  slateCraftFromSlate,
  slateCrafterView,
  slateSlotChoices,
} from "./slate-craft.ts";
import { craftedSlateForBoard, craftedSlateIcon, slateAffixFamilyClass, slateShapeCells } from "./slate-shapes.js";

let selectedSlateId = null;

// The affixes only one equipped slate can apply ("<tree>: <name>: <effect>").
const singleDivinityAffixes = new Set(
  Object.values(divinitySlateAffixes)
    .flat()
    .filter((affix) => affix.maxDivinityEffect === 1)
    .map((affix) => `${affix.tree}: ${affix.name}: ${affix.effect}`),
);
// A slate's tooltip (src/app/bridge/slate-tooltip-view.ts): its affixes by group as Judgment scales them, each with
// whether the calculation uses it, and a copy slate's copied affixes.
function slateTooltip(id) {
  const slate = slatesForBoard().find((item) => item.id === id);
  if (!slate) return null;
  const placed = equippedSlateIds.has(slate.id) && Boolean(slatePlacements[slate.id]);
  const affixes = slateAffixes(slate);
  const affected = judgmentAffectedSlateIds(slatesForBoard(), slatePlacements, equippedSlateIds).has(slate.id);
  const judgmentContext = {
    linked: affected,
    ownAuthority: Boolean(isActiveJudgment(slate) && placed),
  };
  const display = (affix) =>
    scaleJudgmentAffix(affix, slate.amplifiedPercent || 0, judgmentAffixTargetPercent(slate, affix, judgmentContext));
  const template = slate.template || slate.name;
  const crafted =
    slate.affixes && !legendaryTalentSlotTypes[template] && !slate.copyRule ? slateCraftedAffixGroups(slate) : null;
  const groups = crafted
    ? [
        ["Fixed Affixes", crafted.fixed],
        ["Random Affixes", crafted.random || crafted.brand || []],
      ]
    : slate.brands
      ? [
          ["Fixed Affixes", affixes],
          ["Brand Talent Nodes", slate.brands],
        ]
      : legendaryTalentSlotTypes[template]
        ? [["Talent Affixes", affixes]]
        : slate.copyRule
          ? [["Fixed Affix", affixes.length ? affixes : [slate.copyRule]]]
          : [
              ["Fixed Affixes", affixes.slice(0, 2)],
              ["Random Affixes", affixes.slice(2)],
            ];
  const copy = isCopySlate(slate);
  return slateTooltipView({
    slate: { name: slate.name, rarity: slate.rarity, icon: slate.icon || slate.cellIcon || "" },
    pose: slatePlacements[id] || parkedSlates[id] || slate,
    family: slateGodFamilyClass(slate.god),
    judgment: affected,
    groups: groups.map(([title, entries]) => ({ title, affixes: entries })),
    display,
    limited: (affix) => singleDivinityAffixes.has(affix),
    coverage: (affix) =>
      coverageView(
        /^Copies?\b/i.test(affix) ? (placed ? "In calc" : "Not equipped") : slateLineCoverage(display(affix), placed),
      ),
    familyOf: slateAffixFamilyClass,
    copy: copy
      ? {
          placed,
          copied: placed
            ? currentPlanner().resolvedSlates.find((item) => item.id === slate.id)?.copiedAffixSources || []
            : [],
        }
      : null,
    copiedCoverage: (affix) => coverageView(slateLineCoverage(affix, placed)),
  });
}
let slateEditMode = false;
let slatePlacementTarget = null;
let slateToolsPosition = null;
let slatePendingDrop = null;
// The slate crafter's draft (src/app/slates/slate-craft.ts); its god and Nether King type stay for the next slate.
let slateCraft = drawnSlateCraft({
  tab: "craft",
  god: "Goddess of Deception",
  netherType: "Judgment",
  template: "",
  editingId: null,
});
function parkSlateBesideGrid(slate, rotation = 0, flipX = 1, flipY = 1) {
  const stage = document.querySelector("#slate-board .slate-stage"),
    board = stage?.querySelector(".divinity-board");
  if (!stage || !board) return false;
  const stageRect = stage.getBoundingClientRect(),
    boardRect = board.getBoundingClientRect(),
    cell = boardRect.width / 6;
  const [columns, rows] = slateSize(slate, rotation, flipX, flipY),
    width = columns * cell,
    height = rows * cell;
  const blocked = [
    {
      x: boardRect.left - stageRect.left,
      y: boardRect.top - stageRect.top,
      width: boardRect.width,
      height: boardRect.height,
    },
  ];
  for (const [id, position] of Object.entries(parkedSlates)) {
    if (id === slate.id) continue;
    const other = slatesForBoard().find((item) => item.id === id);
    if (!other) continue;
    const [otherColumns, otherRows] = slateSize(
      other,
      position.rotation || 0,
      position.flipX || 1,
      position.flipY || 1,
    );
    blocked.push({
      x: (position.x / 100) * stageRect.width,
      y: (position.y / 100) * stageRect.height,
      width: otherColumns * cell,
      height: otherRows * cell,
    });
  }
  for (let y = 8; y + height <= stageRect.height; y += 12)
    for (let x = 8; x + width <= stageRect.width; x += 12) {
      if (
        blocked.some(
          (rect) =>
            x < rect.x + rect.width + 8 &&
            x + width + 8 > rect.x &&
            y < rect.y + rect.height + 8 &&
            y + height + 8 > rect.y,
        )
      )
        continue;
      setParkedSlates({
        ...parkedSlates,
        [slate.id]: {
          x: Math.round((x / stageRect.width) * 10000) / 100,
          y: Math.round((y / stageRect.height) * 10000) / 100,
          rotation,
          flipX,
          flipY,
        },
      });
      return true;
    }
  if (stageRect.height < 10000) {
    stage.style.minHeight = `${Math.ceil(stageRect.height + height + 24)}px`;
    if (stage.getBoundingClientRect().height > stageRect.height)
      return parkSlateBesideGrid(slate, rotation, flipX, flipY);
  }
  return false;
}
export const slateCommands = {
  // Divinity Slates board (apps/web/src/features/slates).
  selectSlate,
  clearSlateSelection,
  startSlateMove,
  placeSlateAtCell,
  transformSlate,
  saveSlateEditor,
  wheelTransformSlate,
  removeSlate,
  rightClickRemoveSlate,
  dropSlate,
  slateDragCancelled: () => {
    renderSlates();
    showToast("Slate returned to its original position");
  },
  finishPendingSlate,
  editSlate,
  // Slate Inventory (apps/web/src/features/slates/SlateInventoryDialog.tsx).
  placeCraftedSlate,
  startSlateCraft,
  deleteCraftedSlate,
  duplicateCraftedSlate,
  editCraftedSlate,
  removeCraftedSlate,
  changeSlateCrafter,
  registerSlateAffixSelect,
  addCraftedSlate,
  backToSlateInventory,
  openSlateInventory: () => {
    renderSlateInventory();
    openDialog("slate-inventory");
  },
};
export const slateQueries = {
  // A slate's tooltip, on the board or in the Slate Inventory (apps/web/src/features/slates/SlateTooltip.tsx).
  slateTooltip: (id) => withRenderPass(() => slateTooltip(id)),
};
export const slateViewSources = {
  // The Divinity Slates board's data (src/app/bridge/slates-view-model.ts).
  slates: () =>
    slatesView({
      slates: slatesForBoard(),
      placements: slatePlacements,
      parked: parkedSlates,
      equipped: equippedSlateIds,
      ui: {
        selectedId: selectedSlateId,
        toolsPosition: slateToolsPosition,
        editMode: slateEditMode,
        pendingId: slatePendingDrop?.id ?? null,
      },
    }),
  // The Slate Inventory.
  slateInventory: slateInventorySource,
  // The slate editor.
  slateEditor: slateEditorSource,
};

// ---- Slate Inventory commands (apps/web/src/features/slates/SlateInventoryDialog.tsx).
// A right-click on a slate: places it on the grid (the first free cells, its rotations tried), or beside a full grid.
function placeCraftedSlate(id) {
  const slate = slatesForBoard().find((item) => item.id === id),
    saved = (plannerState.slates?.inventory || []).find((item) => item.id === id),
    startRotation = slatePlacements[id]?.rotation ?? parkedSlates[id]?.rotation ?? saved?.rotation ?? 0,
    flipX = slatePlacements[id]?.flipX ?? parkedSlates[id]?.flipX ?? saved?.flipX ?? 1,
    flipY = slatePlacements[id]?.flipY ?? parkedSlates[id]?.flipY ?? saved?.flipY ?? 1;
  const rotations = slateTransformRules(slate).rotate
    ? [startRotation, 0, 90, 180, 270].filter((value, index, array) => array.indexOf(value) === index)
    : [0];
  let placement = null;
  for (const rotation of rotations) {
    for (let row = 1; row <= 6 && !placement; row += 1) {
      for (let column = 1; column <= 6; column += 1) {
        const candidate = { column, row, rotation, flipX, flipY };
        if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
          placement = candidate;
          break;
        }
      }
    }
    if (placement) break;
  }
  if (placement) {
    setSlatePlacements({ ...slatePlacements, [id]: placement });
    equippedSlateIds.add(id);
    delete parkedSlates[id];
    selectedSlateId = null;
    slateToolsPosition = null;
    slatePlacementTarget = null;
    slateEditMode = false;
    renderSlateInventory();
    persistPlannerState();
    showToast(`${slate.name} placed on the grid`);
  } else if (parkSlateBesideGrid(slate, startRotation, flipX, flipY)) {
    const next = { ...slatePlacements };
    delete next[id];
    setSlatePlacements(next);
    equippedSlateIds.delete(id);
    selectedSlateId = null;
    slateToolsPosition = null;
    persistPlannerState();
    renderCandidateViews();
    renderSlateInventory();
    showToast(`${slate.name} placed beside the full grid`);
  } else showToast("No space is available beside the grid for that slate");
}
function startSlateCraft() {
  slateCraft = drawnSlateCraft({
    ...slateCraft,
    tab: "craft",
    template: "",
    editingId: null,
    drawing: slateCraft.drawing + 1,
  });
  renderSlateCrafter();
}
function deleteCraftedSlate(id) {
  plannerState.slates.inventory = (plannerState.slates.inventory || []).filter((slate) => slate.id !== id);
  equippedSlateIds.delete(id);
  delete parkedSlates[id];
  const placements = { ...slatePlacements };
  delete placements[id];
  setSlatePlacements(placements);
  persistPlannerState();
  renderSlateInventory();
  showToast("Slate deleted");
}
function duplicateCraftedSlate(id) {
  const source = (plannerState.slates.inventory || []).find((slate) => slate.id === id);
  if (source) {
    plannerState.slates.inventory.push({
      ...structuredClone(source),
      id: globalThis.crypto?.randomUUID?.() || `slate-${Date.now()}`,
      name: `${source.name} Copy`,
    });
    persistPlannerState();
    renderSlateInventory();
    showToast("Slate duplicated");
  }
}
function editCraftedSlate(id) {
  const slate = (plannerState.slates.inventory || []).find((item) => item.id === id);
  if (slate) openCraftedSlateEditor(slate);
}
function removeCraftedSlate(id) {
  equippedSlateIds.delete(id);
  delete parkedSlates[id];
  const placements = { ...slatePlacements };
  delete placements[id];
  setSlatePlacements(placements);
  persistPlannerState();
  renderSlateInventory();
  showToast("Slate removed from grid");
}

export const slateAffixes = (slate) => plannerState.slates?.affixOverrides?.[slate.id] || slate.fixed || [];
// The Slate Inventory dialog (apps/web/src/features/slates/SlateInventoryDialog.tsx) shows the "slateInventory" source: the
// crafted slates, or, in the crafter's mode, the crafter (src/app/slates/slate-craft.ts slateCrafterView).
let slateInventoryMode = "inventory";
function renderSlateInventory() {
  slateInventoryMode = "inventory";
  viewSourceChanged("slateInventory");
}
function slateInventorySource() {
  return {
    mode: slateInventoryMode,
    crafter: slateInventoryMode === "crafter" ? slateCrafterView(slateCraft) : null,
    items: (plannerState.slates?.inventory || []).map((slate) => {
      const icon = craftedSlateIcon(slate),
        affixes = slate.affixes.filter(Boolean).length;
      return {
        id: slate.id,
        state: equippedSlateIds.has(slate.id) ? "equipped" : parkedSlates[slate.id] ? "staged" : "",
        icon: icon || "",
        shape: icon ? null : { godKey: slateGodKey(slate.god), cells: slateShapeCells(slate.shape) },
        ...displayTexts({ name: slate.name, detail: `${affixes} affix${affixes === 1 ? "" : "es"} · ${slate.god}` }),
      };
    }),
  };
}
function renderSlateCrafter() {
  slateInventoryMode = "crafter";
  viewSourceChanged("slateInventory");
}
// ---- Slate crafter commands (apps/web/src/features/slates/SlateCrafter.tsx).
function changeSlateCrafter(change) {
  slateCraft = changeSlateCraftDraft(slateCraft, change);
  viewSourceChanged("slateInventory");
}
// An affix select of the crafter: its choices in the searchable list, and a pick (null: the placeholder).
function registerSlateAffixSelect(select, index) {
  slateAffixSelectPools.set(select, {
    choices: slateSlotChoices(slateCraft, index),
    choose: (choice) =>
      changeSlateCrafter(choice ? { kind: "slot", index, choice } : { kind: "slot", index, value: "" }),
  });
}
function openCraftedSlateEditor(slate) {
  slateCraft = { ...slateCraftFromSlate(slate), drawing: slateCraft.drawing + 1 };
  renderSlateCrafter();
}
function backToSlateInventory() {
  slateCraft = { ...slateCraft, editingId: null };
  renderSlateInventory();
}
// The slate editor (apps/web/src/features/slates/SlateEditorDialog.tsx) shows the "slateEditor" source; each drawing
// (opening, a rotation) starts its affix fields over from the slate, as the planner's markup did.
let slateEditorSession = 0,
  slateEditorId = "";
function renderSlateEditor(slate) {
  slateEditorId = slate.id;
  slateEditorSession++;
  viewSourceChanged("slateEditor");
}
function slateEditorSource() {
  const slate = slatesForBoard().find((item) => item.id === slateEditorId);
  if (!slate) return null;
  const rules = slateTransformRules(slate);
  return {
    session: slateEditorSession,
    id: slate.id,
    title: `Edit ${titleCase(slate.rarity)} Slate`,
    name: slate.name,
    icon: slate.icon || slate.cellIcon || "",
    rotate: Boolean(rules.rotate),
    flip: Boolean(rules.flip),
    rarity: slate.rarity.toUpperCase(),
    affixes: displayTexts([...slateAffixes(slate)]),
  };
}
// The slate editor's Save Changes: the non-empty affix texts become the slate's affixes.
function saveSlateEditor(id, texts) {
  plannerState.slates.affixOverrides ||= {};
  plannerState.slates.affixOverrides[id] = texts.map((text) => text.trim()).filter(Boolean);
  persistPlannerState();
  closeDialog("slate-editor");
  renderCandidateViews();
  showToast("Slate affixes saved");
}

// The Divinity Slates board (apps/web/src/features/slates) re-reads its source (src/app/bridge/slates-view-model.ts).
export function renderSlates() {
  viewSourceChanged("slates");
}

// A rotated or flipped slate that no longer fits waits under the pointer (the board follows it) until a click places it.
function pickUpTransformedSlate(slate, current, candidate, action) {
  slatePendingDrop = { id: slate.id, original: { ...current }, transformed: candidate, action };
  setSlatePlacements({ ...slatePlacements, [slate.id]: candidate });
  selectedSlateId = null;
  slateToolsPosition = null;
  closeDialog("slate-editor");
  renderSlates();
  showToast(`Move the ${action} slate and click to place it`);
}

// The click that ends a waiting slate: `placement` is the grid position under it (null off the grid), `parked` the stage
// position beside the grid (null on the grid or off the stage), both measured by the board.
function finishPendingSlate({ placement, parked }) {
  if (!slatePendingDrop) return;
  const pending = slatePendingDrop,
    slate = slatesForBoard().find((item) => item.id === pending.id);
  slatePendingDrop = null;
  if (placement && slate && canPlaceSlate(slate, placement, slatePlacements, slatesForBoard())) {
    setSlatePlacements({ ...slatePlacements, [pending.id]: placement });
    persistPlannerState();
    showToast(`${pending.action} slate placed`);
  } else if (slate && parked) {
    setParkedSlates({ ...parkedSlates, [pending.id]: parked });
    equippedSlateIds.delete(pending.id);
    const next = { ...slatePlacements };
    delete next[pending.id];
    setSlatePlacements(next);
    persistPlannerState();
    showToast("Slate parked beside the grid");
  } else {
    setSlatePlacements({ ...slatePlacements, [pending.id]: pending.original });
    renderSlates();
    showToast("Invalid drop · slate restored");
  }
}

// Add to Inventory, or Save Changes on the slate being edited (an equipped slate whose new shape no longer fits moves to
// a free spot, or beside the grid).
function addCraftedSlate() {
  const originalSlate = (plannerState.slates.inventory || []).find((slate) => slate.id === slateCraft.editingId);
  const crafted = {
    id: globalThis.crypto?.randomUUID?.() || `slate-${Date.now()}`,
    ...craftedSlate(slateCraft, originalSlate),
  };
  plannerState.slates.inventory ||= [];
  const editedIndex = slateCraft.editingId
    ? plannerState.slates.inventory.findIndex((slate) => slate.id === slateCraft.editingId)
    : -1;
  let removedFromGrid = false;
  if (editedIndex >= 0) {
    crafted.id = slateCraft.editingId;
    plannerState.slates.inventory[editedIndex] = crafted;
    if (equippedSlateIds.has(crafted.id)) {
      const boardSlate = craftedSlateForBoard(crafted),
        current = slatePlacements[crafted.id];
      if (current && !canPlaceSlate(boardSlate, current, slatePlacements, slatesForBoard())) {
        let placement = null;
        for (let row = 1; row <= 6 && !placement; row += 1)
          for (let column = 1; column <= 6 && !placement; column += 1) {
            const candidate = { ...current, row, column };
            if (canPlaceSlate(boardSlate, candidate, slatePlacements, slatesForBoard())) placement = candidate;
          }
        if (placement) setSlatePlacements({ ...slatePlacements, [crafted.id]: placement });
        else {
          equippedSlateIds.delete(crafted.id);
          const placements = { ...slatePlacements };
          delete placements[crafted.id];
          setSlatePlacements(placements);
          parkSlateBesideGrid(boardSlate, crafted.rotation || 0, crafted.flipX || 1, crafted.flipY || 1);
          removedFromGrid = true;
        }
      }
    }
  } else plannerState.slates.inventory.push(crafted);
  slateCraft = { ...slateCraft, editingId: null };
  persistPlannerState();
  renderSlateInventory();
  if (removedFromGrid) renderCandidateViews();
  showToast(
    removedFromGrid
      ? `${crafted.name} moved beside the grid; its new shape does not fit`
      : editedIndex >= 0
        ? `${crafted.name} updated`
        : `${crafted.name} added to Slate Inventory`,
  );
}

// ---- Divinity Slates board (apps/web/src/features/slates): the board reads the "slates" source; these carry out its edits.
function selectSlate(id, toolsPosition) {
  slateToolsPosition = toolsPosition;
  selectedSlateId = id;
  slatePlacementTarget = id;
  renderSlates();
}
// A click away from the slates and their tools, while the board is shown.
function clearSlateSelection() {
  if (!selectedSlateId || !ui.talentSlateMode) return;
  selectedSlateId = null;
  slateToolsPosition = null;
  if (!slateEditMode) slatePlacementTarget = null;
  renderSlates();
}
function startSlateMove(id) {
  slatePlacementTarget = id;
  slateEditMode = true;
  renderSlates();
  showToast("Choose an empty board cell");
}
// Move mode: the cell the slate's top-left corner goes to.
function placeSlateAtCell(column, row) {
  if (!slateEditMode || !slatePlacementTarget) return;
  const slate = slatesForBoard().find((item) => item.id === slatePlacementTarget),
    previous = slatePlacements[slate.id] || parkedSlates[slate.id] || {};
  const candidate = {
    column,
    row,
    rotation: previous.rotation || 0,
    flipX: previous.flipX || 1,
    flipY: previous.flipY || 1,
  };
  if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    setSlatePlacements({ ...slatePlacements, [slate.id]: candidate });
    equippedSlateIds.add(slate.id);
    delete parkedSlates[slate.id];
    persistPlannerState();
    renderCandidateViews();
  } else showToast("That slate overlaps or leaves the statue board");
}
// Rotates ({ rotate: 1 | -1 }) or flips ({ flip: "x" | "y" }) a slate; one that no longer fits waits under the pointer.
function transformSlate(id, change) {
  const slate = slatesForBoard().find((item) => item.id === id);
  if (!slate || !slateTransformRules(slate)[change.rotate ? "rotate" : "flip"]) return;
  const parked = !!parkedSlates[slate.id],
    current = parked ? parkedSlates[slate.id] : slatePlacements[slate.id];
  if (!current) return;
  const key = change.flip === "y" ? "flipY" : "flipX",
    candidate = change.rotate
      ? { ...current, rotation: ((current.rotation || 0) + change.rotate * 90 + 360) % 360 }
      : { ...current, [key]: -Number(current[key] || 1) };
  if (parked) {
    setParkedSlates({ ...parkedSlates, [slate.id]: candidate });
    persistPlannerState();
  } else if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    setSlatePlacements({ ...slatePlacements, [slate.id]: candidate });
    persistPlannerState();
    if (change.rotate && dialogOpen("slate-editor")) renderSlateEditor(slate);
  } else pickUpTransformedSlate(slate, current, candidate, change.rotate ? "Rotated" : "Flipped");
}
// The wheel over the board with a slate selected: down rotates clockwise (Pedigree of Gods flips horizontally), up the
// other way (Pedigree of Gods flips vertically).
function wheelTransformSlate(down) {
  const slate = slatesForBoard().find((item) => item.id === selectedSlateId);
  if (!slate || (!slateTransformRules(slate).rotate && !slateTransformRules(slate).flip)) return;
  const parked = !!parkedSlates[selectedSlateId],
    current = parked ? parkedSlates[selectedSlateId] : slatePlacements[selectedSlateId];
  if (!current) return;
  const pedigree = slate.template === "Pedigree of Gods" || slate.name === "Pedigree of Gods";
  const axis = down ? "flipX" : "flipY";
  const candidate = pedigree
    ? { ...current, [axis]: -(current[axis] || 1) }
    : { ...current, rotation: ((current.rotation || 0) + (down ? 90 : -90) + 360) % 360 };
  if (parked) {
    setParkedSlates({ ...parkedSlates, [selectedSlateId]: candidate });
    persistPlannerState();
    renderSlates();
  } else if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    setSlatePlacements({ ...slatePlacements, [selectedSlateId]: candidate });
    persistPlannerState();
    renderSlates();
  } else pickUpTransformedSlate(slate, current, candidate, pedigree ? "Flipped" : "Rotated");
}
// Removes an equipped or parked slate; for another slate, starts Move mode with it.
function removeSlate(id) {
  if (equippedSlateIds.has(id) || parkedSlates[id]) {
    equippedSlateIds.delete(id);
    delete parkedSlates[id];
    const next = { ...slatePlacements };
    delete next[id];
    setSlatePlacements(next);
    selectedSlateId = null;
    slateToolsPosition = null;
  } else {
    slatePlacementTarget = id;
    slateEditMode = true;
  }
  persistPlannerState();
  renderCandidateViews();
}
// The end of a drag: `placement` is the grid position under the slate (null off the grid), `parked` its stage position
// beside the grid (null on the grid or off the stage), both measured by the board.
function dropSlate(id, { placement, parked }) {
  const slate = slatesForBoard().find((item) => item.id === id);
  if (slate && placement && canPlaceSlate(slate, placement, slatePlacements, slatesForBoard())) {
    setSlatePlacements({ ...slatePlacements, [id]: placement });
    equippedSlateIds.add(id);
    delete parkedSlates[id];
    persistPlannerState();
    showToast("Slate placed on grid");
  } else if (slate && parked) {
    setParkedSlates({ ...parkedSlates, [id]: parked });
    equippedSlateIds.delete(id);
    const next = { ...slatePlacements };
    delete next[id];
    setSlatePlacements(next);
    persistPlannerState();
    showToast("Slate parked beside the grid");
  } else {
    renderSlates();
    showToast("That slate does not fit there");
  }
}
// Right-click on a slate: takes an equipped or parked slate off the board; false for any other (the browser menu opens).
function rightClickRemoveSlate(id) {
  if (!equippedSlateIds.has(id) && !parkedSlates[id]) return false;
  equippedSlateIds.delete(id);
  delete parkedSlates[id];
  const placements = { ...slatePlacements };
  delete placements[id];
  setSlatePlacements(placements);
  persistPlannerState();
  renderCandidateViews();
  showToast("Slate removed");
  return true;
}
function editSlate(id) {
  const crafted = (plannerState.slates.inventory || []).find((item) => item.id === id);
  if (crafted) {
    openCraftedSlateEditor(crafted);
    openDialog("slate-inventory");
  } else {
    const slate = slatesForBoard().find((item) => item.id === id);
    if (slate) {
      renderSlateEditor(slate);
      openDialog("slate-editor");
    }
  }
}
