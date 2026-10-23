// What the talent tree picker shows (apps/web/src/features/talents/TalentPanelPickerDialog.tsx), laid out as the game's:
// one column per god, its portrait and name over its God tree and its four class trees. Every tree shows; the ones the
// open slot cannot take are off, with the reason. Pure; src/app/talents/talents-controller.js publishes it
// (src/app/bridge/view-sources.ts "talentPicker").
import { allProfessionTalentCatalogue, talentFamilies, talentOptionsForSlot, tliArt } from "#engine";
import { godPortraits } from "../talents/god-portraits.js";
import { talentFamilyClass } from "./talents-view-model.ts";

export interface TalentPickerTreeView {
  name: string;
  kind: "God tree" | "Class tree";
  art: string | null;
  points: number;
  /** The open slot's tree. */
  current: boolean;
  /** In one of the build's four slots (the game's check mark). */
  inBuild: boolean;
  /** The open slot can take it. */
  available: boolean;
  /** Why the open slot cannot take it; "" when it can. */
  note: string;
}
export interface TalentPickerColumnView {
  god: string;
  familyClass: string;
  portrait: string | null;
  trees: TalentPickerTreeView[];
}
export interface TalentPickerView {
  title: string;
  columns: TalentPickerColumnView[];
}
export interface TalentPickerInput {
  /** The slot the picker is open for (0–3). */
  slot: number;
  selectedTrees: string[];
  /** Points by tree name. */
  points: Record<string, number>;
}

const families = talentFamilies as Record<string, string[]>;
const panelArt = (tliArt as unknown as { talentPanels: Record<string, string> }).talentPanels;
const catalogue = allProfessionTalentCatalogue as Record<string, { emblem?: string }>;
const portraits = godPortraits as Record<string, string>;

function slotTitle(slot: number, selectedTrees: string[]): string {
  if (slot === 0) return "Select a God tree";
  if (slot === 1) return `Select a ${selectedTrees[0] || "God"} class tree`;
  return `Select talent tree ${slot + 1}`;
}

/** Why the slot cannot take a tree it does not list. */
function unavailableNote(slot: number, name: string, god: boolean, selectedTrees: string[]): string {
  const taken = selectedTrees.indexOf(name);
  if (taken >= 0 && taken !== slot) return `Already in tree ${taken + 1}`;
  if (slot === 0) return "Tree 1 takes a God tree";
  if (slot === 1) return selectedTrees[0] ? `Tree 2 takes a ${selectedTrees[0]} class tree` : "Pick a God tree first";
  return god ? `Tree ${slot + 1} takes a class tree` : "";
}

export function talentPickerView({ slot, selectedTrees, points }: TalentPickerInput): TalentPickerView {
  const options = new Set(talentOptionsForSlot(slot, selectedTrees) as string[]);
  const tree = (name: string, god: boolean): TalentPickerTreeView => {
    const available = options.has(name);
    return {
      name,
      kind: god ? "God tree" : "Class tree",
      art: panelArt[name] || catalogue[name]?.emblem || null,
      points: points[name] ?? 0,
      current: selectedTrees[slot] === name,
      inBuild: selectedTrees.includes(name),
      available,
      note: available ? "" : unavailableNote(slot, name, god, selectedTrees),
    };
  };
  return {
    title: slotTitle(slot, selectedTrees),
    columns: Object.entries(families).map(([god, classTrees]) => ({
      god,
      familyClass: talentFamilyClass(god),
      portrait: portraits[god] ?? null,
      trees: [tree(god, true), ...classTrees.map((name) => tree(name, false))],
    })),
  };
}
