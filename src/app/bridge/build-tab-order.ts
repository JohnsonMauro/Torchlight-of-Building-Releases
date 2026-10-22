// The order of the build's tabs (Hero Trait, Follower, Skills, Gear, Pacts, Talent), which the user sets by dragging a
// tab onto another (apps/web/src/ui/BuildTabs.tsx; stored per browser by apps/web/src/ui/build-tabs.ts). Pure.

/**
 * A stored order made whole: the known views in the stored order, then the ones it lacks in their default order.
 * Anything that is not a list of views (nothing stored, an old or broken value) gives the default order.
 */
export function buildTabOrder(stored: unknown, views: readonly string[]): string[] {
  const kept = Array.isArray(stored) ? [...new Set(stored.filter((view) => views.includes(view)))] : [];
  return [...kept, ...views.filter((view) => !kept.includes(view))];
}

/** `order` with `view` taken out and put in `target`'s place (so it lands before a later tab, after an earlier one). */
export function moveBuildTab(order: readonly string[], view: string, target: string): string[] {
  const from = order.indexOf(view);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  const next = order.filter((entry) => entry !== view);
  next.splice(to, 0, view);
  return next;
}
