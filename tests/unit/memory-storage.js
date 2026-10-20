// In-memory stand-in for localStorage / sessionStorage in Node tests. `writes` counts setItem calls, so a test can tell
// whether the planner wrote at all.
export class MemoryStorage {
  #items = new Map();
  writes = 0;
  getItem(key) {
    return this.#items.has(key) ? this.#items.get(key) : null;
  }
  setItem(key, value) {
    this.writes++;
    this.#items.set(key, String(value));
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
