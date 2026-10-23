// Game text is read once. A reader wrapped here (game text → what it says) keeps each reading by its text, so the passes of
// one calculation (calculatePlanner compares the best cases, each pass reading every line again) and the calculations after
// it reuse the reading instead of running the regular expressions again. Only for readers whose result depends on the text
// alone: what depends on the build (a skill's tags, a condition) is applied to the reading by the caller.
//
// A reading is shared by every caller, so it is frozen (its objects and arrays; a Set cannot be): a caller that needs to
// change one copies it first, and one that forgets throws instead of changing the reading for everyone.

// Readings kept per reader before they all go (a long session of rolls and edits; the game data alone stays far below).
const LIMIT = 20000;

function freeze(value) {
  if (
    value &&
    typeof value === "object" &&
    !Object.isFrozen(value) &&
    !(value instanceof Set) &&
    !(value instanceof Map)
  ) {
    Object.freeze(value);
    for (const inner of Object.values(value)) freeze(inner);
  }
  return value;
}

/** `read` with each reading kept by its arguments (texts: a reader takes strings, never the build). */
export function readOnce(read) {
  const readings = new Map();
  return (...texts) => {
    const key = texts.length === 1 ? String(texts[0] ?? "") : texts.map((text) => String(text ?? "")).join("\u0000");
    const kept = readings.get(key);
    if (kept !== undefined || readings.has(key)) return kept;
    if (readings.size >= LIMIT) readings.clear();
    const reading = freeze(read(...texts));
    readings.set(key, reading);
    return reading;
  };
}
