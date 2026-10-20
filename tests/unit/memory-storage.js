// In-memory stand-in for localStorage / sessionStorage in Node tests. `writes` counts setItem calls, so a test can tell
// whether the planner wrote at all. `quota` (characters of keys and values, like a browser's per-origin limit) makes
// setItem throw a QuotaExceededError when the stored total would pass it.
export class MemoryStorage {
  #items = new Map();
  writes = 0;
  constructor({ quota = Infinity } = {}) {
    this.quota = quota;
  }
  getItem(key) {
    return this.#items.has(key) ? this.#items.get(key) : null;
  }
  setItem(key, value) {
    const text = String(value);
    const others = [...this.#items].reduce(
      (sum, [name, item]) => sum + (name === key ? 0 : name.length + item.length),
      0,
    );
    if (others + key.length + text.length > this.quota)
      throw Object.assign(new Error("The quota has been exceeded."), { name: "QuotaExceededError" });
    this.writes++;
    this.#items.set(key, text);
  }
  removeItem(key) {
    this.#items.delete(key);
  }
  key(index) {
    return [...this.#items.keys()][index] ?? null;
  }
  get length() {
    return this.#items.size;
  }
}
