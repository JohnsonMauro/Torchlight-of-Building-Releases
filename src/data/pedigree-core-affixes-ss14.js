import { allProfessionTalentCatalogueSs14 } from "./talents/all-profession-trees-ss14.generated.js";
import { divinitySlateTreeFamiliesSs14 } from "./divinity-slate-affixes-ss14.js";

const godForTree = Object.fromEntries(
  Object.entries(divinitySlateTreeFamiliesSs14).flatMap(([god, trees]) => trees.map((tree) => [tree, god])),
);

// Pedigree's Lv.1/Lv.2 labels describe its affix slots, not the tree's 12/24-point unlock.
export const pedigreeCoreAffixesSs14 = Object.entries(allProfessionTalentCatalogueSs14).flatMap(([tree, catalogue]) =>
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
