// Repairs applied to stored gear when a build loads, and the legendary line signatures they compare.
import {
  allPlaceholderTemplates,
  folkloreRingModifier,
  legendaryCorrodedModifiersSs14,
  legendaryGearSs14,
  legendaryModifierSignature,
  normalizeSunsEmbraceItem,
  reconcileLegendaryModifiers,
  selenaScorchingBeamGearSs14,
} from "#engine";

export function upgradeExistingCorrodedItems(state) {
  const capturedById = new Map(selenaScorchingBeamGearSs14.items.map((item) => [`captured-${item.slot}`, item]));
  const upgrade = (item) => {
    if (!item) return item;
    if (item.name === "Sun's Embrace") return normalizeSunsEmbraceItem(item);
    const captured =
      capturedById.get(item.sourceInventoryId) ||
      selenaScorchingBeamGearSs14.items.find((entry) => entry.name === item.name);
    if (captured?.corrosionModifiers?.length && !item.corrosionModifiers?.length) {
      const legacyCorrosion =
        item.name === "Coldness Tracer's Tear" ? /^(?:\+8 Dexterity|You can cast 1 additional Curses)$/i : null;
      if (legacyCorrosion) {
        item.modifiers = (item.modifiers || []).filter((text) => !legacyCorrosion.test(text));
        item.corrosionModifiers = [...captured.corrosionModifiers];
        if (captured.implicitModifiers) item.implicitModifiers = [...captured.implicitModifiers];
        if (captured.legendaryModifiers) item.legendaryModifiers = [...captured.legendaryModifiers];
      }
    }
    const legendarySource = legendaryGearSs14.find(
      (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
    );
    if (legendarySource && item.legendaryModifiers?.length) {
      const knownLegendarySignatures = legendaryKnownModifierSignatures(legendarySource);
      reconcileLegendaryModifiers(item, knownLegendarySignatures);
    }
    return item;
  };
  (state.equipmentInventory || []).forEach(upgrade);
  Object.values(state.equipmentOverrides || {}).forEach(upgrade);
  for (const override of Object.values(state.equipmentOverrides || {})) {
    const source = (state.equipmentInventory || []).find((item) => item.id === override.sourceInventoryId);
    if (source?.rarity && !override.rarity) override.rarity = source.rarity;
  }
}
export function modifierSignature(text) {
  return legendaryModifierSignature(text);
}
export function legendaryKnownModifierSignatures(source) {
  const options =
    source.id === "Folklore_of_Locking_Fingers"
      ? [
          folkloreRingModifier("left"),
          folkloreRingModifier("right"),
          folkloreRingModifier("left", true),
          folkloreRingModifier("right", true),
        ]
      : [];
  return new Set(
    [
      ...source.modifiers,
      ...(legendaryCorrodedModifiersSs14[source.id] || []),
      ...options,
      ...allPlaceholderTemplates(source.id),
    ].map(modifierSignature),
  );
}
