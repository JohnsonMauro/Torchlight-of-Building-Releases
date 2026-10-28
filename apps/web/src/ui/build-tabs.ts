// The build's tabs, one per part of the character as in the game, in the order this browser's user dragged them into
// (BuildTabs; the planner's click handler opens a tab's section from its data-view). Stored like the theme: a viewer's
// preference, not part of a build.
import { useSyncExternalStore } from "react";
import { buildTabOrder, moveBuildTab } from "@legacy/app/bridge/build-tab-order.ts";

export interface BuildTab {
  /** The section it opens (#<view>-view) and the workspace view that lights it. */
  view: string;
  label: string;
  /** Its controls help topic (help-topics.ts). */
  help: string;
}

export const BUILD_TABS: readonly BuildTab[] = [
  { view: "hero", label: "Hero Trait", help: "hero" },
  { view: "follower", label: "Follower", help: "follower" },
  { view: "skills", label: "Skills", help: "skills" },
  { view: "equipment", label: "Gear", help: "gear" },
  { view: "pacts", label: "Pacts", help: "pacts" },
  { view: "talents", label: "Talent", help: "talents" },
];
const VIEWS = BUILD_TABS.map((tab) => tab.view);
export const BUILD_TAB_ORDER_KEY = "tli-builder:build-tab-order:v1";

function storedOrder(): string[] {
  try {
    const text = globalThis.localStorage?.getItem(BUILD_TAB_ORDER_KEY);
    return buildTabOrder(text ? JSON.parse(text) : null, VIEWS);
  } catch {
    return [...VIEWS];
  }
}

let order = storedOrder();
let tabs = order.map((view) => BUILD_TABS.find((tab) => tab.view === view) as BuildTab);
const listeners = new Set<() => void>();

/** Puts `view` in `target`'s place and remembers the order. */
export function moveTab(view: string, target: string): void {
  order = moveBuildTab(order, view, target);
  tabs = order.map((entry) => BUILD_TABS.find((tab) => tab.view === entry) as BuildTab);
  try {
    globalThis.localStorage?.setItem(BUILD_TAB_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Without storage the order lasts until the page reloads.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The build's tabs in the user's order. */
export function useBuildTabs(): readonly BuildTab[] {
  return useSyncExternalStore(subscribe, () => tabs);
}
