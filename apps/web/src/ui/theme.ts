// The colour theme: <html data-theme="dark|light">, read by apps/web/src/styles/app.css. The stored choice wins;
// without one, the system's preference. Applied by boot.tsx before the first render, switched from the header.

export type Theme = "dark" | "light";

const STORAGE_KEY = "tli-builder:theme:v1";

function storedTheme(): Theme | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Sets the stored (or system) theme on <html>. */
export function applyTheme(): void {
  document.documentElement.dataset.theme = storedTheme() ?? systemTheme();
}

/** Switches dark ↔ light and remembers the choice. */
export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next);
  } catch {
    // Without storage the choice lasts until the page reloads.
  }
  return next;
}
