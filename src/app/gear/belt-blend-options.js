import { beltBlendsSs13 } from "../../data/gear/belt-blends-ss13.generated.js";

export const BELT_BLEND_CATEGORIES = ["Medium Talent", "Core Talent", "Aromatic Talent"];

export function beltBlendById(id) {
  return beltBlendsSs13.find((entry) => entry.id === id);
}

// Effect lines shown under the blend name in the searchable picker. Named talents carry a
// "[Name] " prefix on their first line; Medium Talents are named by their effect, so the
// secondary text only holds the lines the label does not already show.
export function beltBlendDescription(entry) {
  if (!entry?.modifier) return "";
  const text = entry.modifier.replace(/^\[[^\]]+\]\s*/, "").trim();
  if (text === entry.label) return "";
  return text.startsWith(`${entry.label}\n`) ? text.slice(entry.label.length + 1).trim() : text;
}

/**
 * The Belt Blend picker's groups, each option with its description (src/app/planner/searchable-select.js openSearchableSelect searches it).
 * @returns {{ group: string, options: { value: string, label: string, data: Record<string, string> }[] }[]}
 */
export function beltBlendChoices() {
  return BELT_BLEND_CATEGORIES.map((category) => ({
    group: category,
    options: beltBlendsSs13
      .filter((entry) => entry.category === category)
      .map((entry) => {
        const description = beltBlendDescription(entry);
        return { value: entry.id, label: entry.label, data: description ? { optionDescription: description } : {} };
      }),
  }));
}
