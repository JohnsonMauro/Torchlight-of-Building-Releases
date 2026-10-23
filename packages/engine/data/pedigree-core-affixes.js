import { allProfessionTalentCatalogue } from "./talents/all-profession-trees.generated.js";
import { divinitySlateTreeFamilies } from "./divinity-slate-affixes.js";

const godForTree = Object.fromEntries(
  Object.entries(divinitySlateTreeFamilies).flatMap(([god, trees]) => trees.map((tree) => [tree, god])),
);

// Pedigree's Lv.1/Lv.2 labels describe its affix slots, not the tree's 12/24-point unlock.
export const pedigreeCoreAffixes = Object.entries(allProfessionTalentCatalogue).flatMap(([tree, catalogue]) =>
  (catalogue.coreTalents || []).flatMap((talent) =>
    ["Lv.1 Core Talent", "Lv.2 Core Talent"].map((name) => ({
      tree,
      god: godForTree[tree] || tree,
      name,
      talentName: talent.name,
      effect: talent.description.replaceAll(" | ", " · "),
      unlockPoints: talent.unlockPoints,
      maxDivinityEffect: null,
    })),
  ),
);
