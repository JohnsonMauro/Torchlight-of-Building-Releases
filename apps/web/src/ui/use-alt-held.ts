// Whether Alt is held: keyword rolls and revived memory lines show their full effect while it is.
import { useSyncExternalStore } from "react";

let held = false;
const listeners = new Set<() => void>();
const set = (value: boolean) => {
  if (held === value) return;
  held = value;
  for (const listener of listeners) listener();
};
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === "Alt") set(true);
};
const onKeyUp = (event: KeyboardEvent) => {
  if (event.key === "Alt") set(false);
};
const onBlur = () => set(false);

function subscribe(listener: () => void): () => void {
  if (!listeners.size) {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size) return;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}

export function useAltHeld(): boolean {
  return useSyncExternalStore(subscribe, () => held);
}
