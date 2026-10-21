// How the HERO tab names and draws a hero's memories and trait supports: the memory type of each tier, the memory icons,
// whether a memory is revived, and the heroes whose base trait takes a support. Shared by the HERO tab
// (src/app/bridge/hero-traits-view-model.ts) and the planner's memory dialogs and tooltips (src/app/hero/hero-memory-controller.js).
export const memoryTypesByTier = {
  level45: "Memory of Origin",
  level60: "Memory of Discipline",
  level75: "Memory of Progress",
};
export const heroMemoryIcons = {
  "Memory of Origin": "./src/assets/tli/gear/Memory_Origin.webp",
  "Memory of Discipline": "./src/assets/tli/gear/Memory_Discipline.webp",
  "Memory of Progress": "./src/assets/tli/gear/Memory_Progress.webp",
};
export const heroMemoryIcon = (type) => heroMemoryIcons[type] || heroMemoryIcons["Memory of Origin"];

export function heroMemoryIsRevived(memory) {
  return Boolean(
    memory &&
    ((memory.revivalMethod && memory.revivalMethod !== "none") ||
      memory.waxAndWane ||
      memory.risingMoon ||
      memory.revivedAffix),
  );
}

// Heroes whose base trait installs a support of their trait skill (the slot beside the base trait).
export const heroTraitSupportConfig = {
  "rosa-high-court-chariot": { hero: "High Court Chariot", skill: "Holy Domain" },
  "moto-charge-calling": { hero: "Charge Calling", skill: "Charge Calling" },
};
