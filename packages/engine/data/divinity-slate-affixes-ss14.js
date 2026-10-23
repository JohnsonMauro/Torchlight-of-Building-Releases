import { allProfessionTalentCatalogueSs14 } from "./talents/all-profession-trees-ss14.generated.js";
import { maxOneDivinityTalentEffectsSs14 } from "./divinity-slate-max-effect-ss14.generated.js";

export const divinitySlateTreeFamiliesSs14 = {
  "God of Might": ["God of Might", "The Brave", "Onslaughter", "Warlord", "Warrior"],
  "Goddess of Hunting": ["Goddess of Hunting", "Marksman", "Bladerunner", "Druid", "Assassin"],
  "Goddess of Knowledge": ["Goddess of Knowledge", "Magister", "Arcanist", "Elementalist", "Prophet"],
  "God of War": ["God of War", "Shadowdancer", "Ronin", "Ranger", "Sentinel"],
  "Goddess of Deception": ["Goddess of Deception", "Shadowmaster", "Psychic", "Warlock", "Lich"],
  "God of Machines": ["God of Machines", "Machinist", "Steel Vanguard", "Alchemist", "Artisan"],
};

const talentTypeLabel = { micro: "Micro Talent", medium: "Medium Talent", legendary: "Legendary Medium Talent" };

export const divinitySlateAffixesSs14 = Object.fromEntries(
  Object.entries(divinitySlateTreeFamiliesSs14).map(([god, trees]) => [
    god,
    trees.flatMap((tree) => (allProfessionTalentCatalogueSs14[tree]?.nodes || []).map((node) => ({
      tree,
      name: talentTypeLabel[node.type] || node.type,
      effect: node.description.replaceAll(" | ", " · "),
      maxDivinityEffect: maxOneDivinityTalentEffectsSs14.has([tree, talentTypeLabel[node.type] || node.type, node.description].join("\0")) ? 1 : null,
    }))),
  ]),
);
