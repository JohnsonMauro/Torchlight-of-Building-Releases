// TOWER Sequence picker options for the shared searchable dropdown (src/app/app.js openSearchableSelect). The catalog has no
// sequence names, so the first effect line is the option's name; any further effect lines are its description, and the slot
// pattern ("3|4|7") is small secondary text ("Slots 3 · 4 · 7").
export function towerSequenceSlots(entry) {
  const slots = String(entry?.sequence || "")
    .split("|")
    .map((slot) => slot.trim())
    .filter(Boolean);
  return slots.length ? `Slots ${slots.join(" · ")}` : "";
}

export function towerSequenceOptionParts(entry) {
  const lines = String(entry?.modifier || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { name: lines[0] || "", description: lines.slice(1).join("\n"), slots: towerSequenceSlots(entry) };
}

/**
 * The TOWER Sequence picker's groups (by grade), each option with its description and slots.
 * @returns {{ group: string, options: { value: string, label: string, data: Record<string, string> }[] }[]}
 */
export function towerSequenceChoices(entries) {
  return ["Intermediate", "Advanced"].map((grade) => ({
    group: `${grade} Sequences`,
    options: entries
      .filter((entry) => entry.grade === grade)
      .map((entry) => {
        const { name, description, slots } = towerSequenceOptionParts(entry);
        return {
          value: entry.id,
          label: name,
          data: { ...(description ? { optionDescription: description } : {}), ...(slots ? { optionMeta: slots } : {}) },
        };
      }),
  }));
}
