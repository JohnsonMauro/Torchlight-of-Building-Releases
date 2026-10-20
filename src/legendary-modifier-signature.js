export function legendaryModifierSignature(text) {
  return String(text || "")
    .replace(/\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/g, "#")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/\s+%/g, "%")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Idempotent: running it again on its own result changes nothing. A legendary
// line the catalog doesn't know (its signature isn't in knownSignatures) is
// still a legendary line, not an extra, so it is not appended a second time.
export function reconcileLegendaryModifiers(item, knownSignatures) {
  const legendary = new Set(item.legendaryModifiers || []);
  const extras = (item.modifiers || []).filter(
    (text) => !knownSignatures.has(legendaryModifierSignature(text)) && !legendary.has(text),
  );
  item.modifiers = [...(item.legendaryModifiers || []), ...extras];
  return item;
}
