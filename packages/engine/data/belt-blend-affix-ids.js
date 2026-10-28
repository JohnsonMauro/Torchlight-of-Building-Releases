// Belt blending affix ids the generated game id map (game-id-map.generated.js, `blends`) lacks: game affix id -> planner belt
// blend id (gear/belt-blends.generated.js). importGameIdMap (packages/engine/src/index.ts) adds them to the map's blends.
// Source: the client's Help Manual cache (UE_game/Local/CommonCache/HelpManualV2AffixData, version 16_en_89_1_v7, read
// 2026-10-27), its "Blending Rituals" rows matched to the blend table by name (Aromatic Talent), by exact text, or (Level 2
// Core Talent rows, whose text is a talent id) by the core that talent id names, which also fills the gap in the 3603 run.
// 3704002 was also seen on a real item: a Light Hunter Belt in a 2026-10-27 log, shown in game as "Blending Affix (1/1):
// Rotted Taboo". With these, every blend of the table has an id.
export const beltBlendAffixIds = {
  3603008: "belt-blend-063", // Play Safe (talent 31001200, Magister)
  3603021: "belt-blend-076", // Master Escapist (talent 21001400, Marksman)
  3603032: "belt-blend-087", // Tailored Remedy (talent 62001400, Steel Vanguard)
  3401016: "belt-blend-017", // Gains 1 stack(s) of Focus Blessing when consuming Spell Burst
  3401022: "belt-blend-023", // 120% of the increase/decrease on Knockback distance is also applied to damage bonuses
  3704000: "belt-blend-092", // Divine Grace
  3704001: "belt-blend-093", // Caged Fury
  3704002: "belt-blend-094", // Rotted Taboo
  3704003: "belt-blend-095", // Comradeship
  3704004: "belt-blend-096", // Hallowed Journey
  3704005: "belt-blend-097", // Thrice Lucky
};
