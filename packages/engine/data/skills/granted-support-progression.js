// Supports only an item or a revived memory grants, which TLIDB's support list and progression leave out (hand-kept, not
// generated). Each keeps the TLIDB keyword text as its base effect; a value without a level table holds at every level.
// - Advanced Elemental Impact (keyword 10173, tlidb-pages/memory-revival-2026-10-29): Three-Chambered Heart's "Lv. 40"
//   support. TLIDB, the keyword data and the client's Help Manual cache give only "+12%" with no level (2026-10-29): the
//   written value is read (owner, 2026-10-29: model what is written).
export const grantedSupportProgression = {
  "Advanced Elemental Impact": {
    baseEffect:
      "Supports skills that deal damage\n+12% additional damage for 2 other types of Elemental Damage if the supported skill recently dealt 1 type of Elemental Damage",
    columns: [],
  },
};
