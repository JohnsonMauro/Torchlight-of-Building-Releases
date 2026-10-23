// What a Divinity Slate can be made of: the gods and their shape art, the legendary templates with their copy rules
// and talent slots, the Nether King pools, and an affix as a searchable select's choice. Pure; used by the slate crafter
// (src/app/slates/slate-craft.ts) and the planner's board and tooltips (src/app/slates/slates-controller.js).
import {
  divinitySlateAffixesSs14,
  divinitySlateTreeFamiliesSs14,
  netherKingFixedAffixesSs14,
  netherKingUltimateAffixesSs14,
  PEDIGREE_OF_GODS,
  pedigreeSlotTypes,
} from "#engine";

export const slateAsset = (name) => `./src/assets/tli/slates/${name}`;
export const SLATE_GODS = [
  "Goddess of Deception",
  "Goddess of Hunting",
  "Goddess of Knowledge",
  "God of Machines",
  "God of Might",
  "God of War",
];
export const slateGodKey = (name) =>
  ({
    "Goddess of Deception": "deception",
    "Goddess of Hunting": "hunting",
    "Goddess of Knowledge": "knowledge",
    "God of Machines": "machines",
    "God of Might": "might",
    "God of War": "war",
  })[name] || "deception";
export const slateGameCaptureByName = {
  "Fallen Starlight": "./src/assets/tli/slates/game-captures/fallen-starlight.webp",
  "A Corner of Divinity": "./src/assets/tli/slates/game-captures/corner-of-divinity.webp",
  "Pedigree of Gods": "./src/assets/tli/slates/game-captures/pedigree-of-gods.webp",
  "Sparks of Moth Fire": "./src/assets/tli/slates/game-captures/sparks-of-moth-fire.webp",
  "When Sparks Set the Prairie Ablaze": "./src/assets/tli/slates/game-captures/prairie-ablaze.webp",
  "Space Rift": "./src/assets/tli/slates/game-captures/space-rift.svg",
  "Residence of Stars": "./src/assets/tli/slates/game-captures/residence-of-stars.svg",
  "Nether King's Divinity: Judgment": "./src/assets/tli/slates/game-captures/nether-king-judgment.png",
  "Nether King's Divinity: Contamination": "./src/assets/tli/slates/game-captures/nether-kings-contamination.svg",
  "Nether King's Divinity: Offspring": "./src/assets/tli/slates/game-captures/nether-king-offspring.svg",
};
/** The legendary templates in the crafter's grid: [art, name]. */
export const LEGENDARY_SLATE_TEMPLATES = [
  ["game-captures/sparks-of-moth-fire.webp", "Sparks of Moth Fire"],
  ["game-captures/fallen-starlight.webp", "Fallen Starlight"],
  ["game-captures/corner-of-divinity.webp", "A Corner of Divinity"],
  ["game-captures/space-rift.svg", "Space Rift"],
  ["game-captures/pedigree-of-gods.webp", "Pedigree of Gods"],
  ["game-captures/residence-of-stars.svg", "Residence of Stars"],
  ["game-captures/prairie-ablaze.webp", "When Sparks Set the Prairie Ablaze"],
];
export const sparksOfMothFireCopyRules = [
  "Copies the last Talent on the adjacent slate above to this slate. Unable to copy the Core Talent.",
  "Copies the last Talent on the adjacent slate on the left to this slate. Unable to copy the Core Talent.",
  "Copies the last Talent on the adjacent slate below this slate. Unable to copy the Core Talents.",
  "Copies the last Talent on the adjacent slate on the right to this slate. Unable to copy the Core Talent.",
];
export const sparksOfMothFireDirections = ["↑ Above", "← Left", "↓ Below", "→ Right"];
export const residenceOfStarsCopyRule =
  "Copies the Medium Talents on the adjacent slate to this slate. Unable to copy Legendary Medium Talents.";
export const prairieAblazeCopyRule = "Copies the last Talent on all adjacent slates. Unable to copy Core Talents.";
export const spaceRiftCopyRules = [
  "Copies the Medium Talents, Legendary Medium Talents, and Ultimate Nether King Talents on the adjacent slate on the left to this slate",
  "Copies the Medium Talents, Legendary Medium Talents, and Ultimate Nether King Talents on the adjacent slate on the right to this slate",
];
const allGodSlateTalentTypes = ["Micro Talent", "Medium Talent", "Legendary Medium Talent"];
export const legendaryTalentSlotTypes = {
  "Fallen Starlight": Array.from({ length: 4 }, () => allGodSlateTalentTypes),
  "A Corner of Divinity": Array.from({ length: 2 }, () => allGodSlateTalentTypes),
  [PEDIGREE_OF_GODS]: pedigreeSlotTypes,
};
export const allDivinitySlateAffixes = Object.entries(divinitySlateAffixesSs14).flatMap(([god, affixes]) =>
  affixes.map((affix) => ({ ...affix, god })),
);
export const slateGodFamilyClass = (god) =>
  divinitySlateTreeFamiliesSs14[god] ? `talent-family-${god.toLowerCase().replaceAll(" ", "-")}` : "";
export const netherKingFixedPool = netherKingFixedAffixesSs14.map((affix) => ({
  ...affix,
  tree: "Nether King",
  god: "Nether King",
}));
export const netherKingBrandPool = [
  ...allDivinitySlateAffixes,
  ...netherKingFixedPool,
  ...netherKingUltimateAffixesSs14.map((affix) => ({ ...affix, tree: "Nether King", god: "Nether King" })),
];
export const godSlateCaptureByKey = {
  hunting: "goddess-of-hunting",
  knowledge: "goddess-of-knowledge",
  machines: "god-of-machines",
  might: "god-of-might",
  war: "god-of-war",
};
export const godSlateShapeCapture = (god, shape) => `./src/assets/tli/slates/game-captures/${god}-${shape}.png`;
export const slateShapeCodes = ["Z1", "L1", "O1", "T1"];
/** A god's shape art for the crafter (its four game shapes; the first is the god's Divinity capture). */
export function godSlateShapeArt(godKey, index) {
  if (index === 0 && godSlateCaptureByKey[godKey])
    return slateAsset(`game-captures/${godSlateCaptureByKey[godKey]}.svg`);
  if (index === 0 && godKey === "deception") return slateAsset("game-captures/goddess-of-deception-divinity.webp");
  return godSlateShapeCapture(godKey, slateShapeCodes[index]);
}
/** An affix as a slate affix select's choice (src/app/planner/searchable-select.js openSearchableSelect lists them). */
export function slateAffixChoice(affix, fallbackGod, legendary = false) {
  const { tree, name, effect, god, talentName, maxDivinityEffect } = affix;
  const details = `${name}: ${legendary && talentName ? `${talentName} — ` : ""}${effect}`;
  return {
    value: `${tree}: ${details}`,
    textContent: `${tree} · ${name} — ${legendary && talentName ? `${talentName}: ` : ""}${effect}`,
    dataset: {
      affixTree: tree,
      affixDetails: details,
      affixFamily: (god || fallbackGod).toLowerCase().replaceAll(" ", "-"),
      maxDivinityEffect: maxDivinityEffect === 1 ? "1" : "",
    },
  };
}

const netherKingFixedChoices = new Set(
  netherKingFixedPool.map((affix) => slateAffixChoice(affix, "Nether King").value),
);
/** A crafted slate's affixes by group: fixed and random, or a Nether King slate's fixed and Brand Talent Nodes. */
export function slateCraftedAffixGroups(slate) {
  const saved = slate.affixGroups;
  if (slate.god !== "Nether King")
    return saved || { fixed: (slate.affixes || []).slice(0, 2), random: (slate.affixes || []).slice(2) };
  if (saved) {
    const fixed = (saved.fixed || []).filter((affix) => !affix || netherKingFixedChoices.has(affix));
    const brand = [
      ...(saved.fixed || []).filter((affix) => affix && !netherKingFixedChoices.has(affix)),
      ...(saved.brand || saved.random || []),
    ];
    return { fixed, brand };
  }
  const affixes = slate.affixes || [];
  let fixedCount = 0;
  while (fixedCount < 2 && netherKingFixedChoices.has(affixes[fixedCount])) fixedCount += 1;
  return { fixed: affixes.slice(0, fixedCount), brand: affixes.slice(fixedCount) };
}
