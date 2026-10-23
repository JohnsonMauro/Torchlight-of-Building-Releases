export const talentFamilies = {
  "God of Might": ["The Brave", "Onslaughter", "Warlord", "Warrior"],
  "Goddess of Hunting": ["Marksman", "Bladerunner", "Druid", "Assassin"],
  "Goddess of Knowledge": ["Magister", "Arcanist", "Elementalist", "Prophet"],
  "God of War": ["Shadowdancer", "Ronin", "Ranger", "Sentinel"],
  "Goddess of Deception": ["Shadowmaster", "Psychic", "Warlock", "Lich"],
  "God of Machines": ["Machinist", "Steel Vanguard", "Alchemist", "Artisan"],
};
export const godTalentTrees = Object.keys(talentFamilies);
export const classTalentTrees = Object.values(talentFamilies).flat();

export function talentOptionsForSlot(slot, selectedTrees) {
  const source = slot === 0 ? godTalentTrees : slot === 1 ? talentFamilies[selectedTrees[0]] || [] : classTalentTrees;
  const occupied = new Set(selectedTrees.filter((_, index) => index !== slot));
  return source.filter((name) => !occupied.has(name));
}

export function normalizeTalentTreeSelection(value, fallback = ["Goddess of Deception", "Psychic", "Warlord", "Lich"]) {
  const input = Array.isArray(value) ? value : fallback;
  const result = ["", "", "", ""];
  if (input[0] === "") return result;
  result[0] = godTalentTrees.includes(input[0]) ? input[0] : fallback[0];
  result[1] = talentFamilies[result[0]].includes(input[1])
    ? input[1]
    : result[0] === fallback[0] && talentFamilies[result[0]].includes(fallback[1])
      ? fallback[1]
      : "";
  for (const slot of [2, 3])
    if (classTalentTrees.includes(input[slot]) && !result.includes(input[slot])) result[slot] = input[slot];
  return result;
}
