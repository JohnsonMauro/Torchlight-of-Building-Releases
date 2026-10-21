// Reads the planner answers on demand for the React UI (apps/web), beside the view sources it publishes and the
// commands it carries out: what a tooltip shows is read when it opens, never published ahead. Each section's
// controller (src/app/<section>/*) defines its queries; src/app/app.js provides them all when it loads. A query never
// changes the open build.

/**
 * @typedef {object} PlannerQueries
 * @property {(target: { slot: string } | { inventoryId: string }) => import("./gear-item-view.ts").GearTooltipView | null}
 *   gearTooltip An equipped slot's or an Inventory item's tooltip; null for an empty slot.
 * @property {(target: { coordinate: string, art: string | null, locked: boolean, prismAffected: boolean }) =>
 *   ({ kind: "node", view: import("./talent-tooltip-view.ts").TalentNodeTooltipView }
 *   | { kind: "prism", view: import("./talent-tooltip-view.ts").PrismTooltipView }) | null} talentNodeTooltip
 *   A node of the open tree as the trees show it; the installed prism's tooltip on its node; null for no such node.
 * @property {(target: { threshold: number, locked: boolean } | { prism: true }) =>
 *   import("./talent-tooltip-view.ts").CoreTalentTooltipView | null} coreTalentTooltip A core slot of the open tree,
 *   or the installed prism shown among the cores (null when there is none).
 * @property {(target: { spirit: string | null, key: string | null, name: string, effect: string, ring: string,
 *   icon: string, allocated: boolean, extra: boolean }) => import("./pact-tooltip-view.ts").PactTooltipView}
 *   pactNodeTooltip A Pactspirit tree node (or a Fate slot's extra Kismet slot) as the section shows it.
 * @property {(name: string) => import("./pact-tooltip-view.ts").PactTooltipView | null} pactspiritTooltip
 * @property {(id: string) => import("./slate-tooltip-view.ts").SlateTooltipView | null} slateTooltip A slate on the
 *   board or in the Slate Inventory.
 * @property {(target: { name: string, levelKey: string, selected: boolean }) =>
 *   import("./trait-tooltip-view.ts").TraitTooltipView | null} heroTraitTooltip A hero trait at its level in this build.
 * @property {(target: { followerId: string, rarityId: string | null }) =>
 *   import("./trait-tooltip-view.ts").TraitTooltipView | null} followerTooltip A follower's card (a selector card's
 *   rarity, else the build's).
 * @property {(name: string) => import("./trait-tooltip-view.ts").TraitTooltipView | null} followerSkillTooltip A
 *   Tartarus Skill's card.
 * @property {(target: { inventoryId: string } | { tier: string }) =>
 *   import("./memory-tooltip-view.ts").MemoryTooltipView | null} heroMemoryTooltip A memory in the inventory, or the one
 *   in a slot ("base", "level45"…).
 * @property {(kind: string) => import("./memory-tooltip-view.ts").ScentTooltipView | null} sageScentTooltip The scent
 *   ingredient or elixir in a slot.
 * @property {(target: { row?: number | null, skill?: string, support?: string, heroSupportId?: string,
 *   editable?: boolean }) => import("./skill-tooltip-view.ts").SkillTooltipView | null} skillTooltip A skill (on a
 *   board row, or by name) or a support (of a board row's skill, of a named skill, or in a hero trait's support slot);
 *   `editable` for a hero panel slot.
 * @property {(target: { source: string, category: string }) => DamageSourceTooltipView} damageSourceTooltip A Stats
 *   damage path source: the card of what it names, or the breakdown of what feeds it.
 */
/**
 * @typedef {{ kind: "gear", view: import("./gear-item-view.ts").GearTooltipView }
 *   | { kind: "pact", view: import("./pact-tooltip-view.ts").PactTooltipView }
 *   | { kind: "slate", view: import("./slate-tooltip-view.ts").SlateTooltipView }
 *   | { kind: "trait", view: import("./trait-tooltip-view.ts").TraitTooltipView }
 *   | { kind: "memory", view: import("./memory-tooltip-view.ts").MemoryTooltipView }
 *   | { kind: "skill", view: import("./skill-tooltip-view.ts").SkillTooltipView }
 *   | { kind: "summary", title: string, body: string }} DamageSourceTooltipView
 */

/** @type {PlannerQueries | null} */
let queries = null;

/** @param {PlannerQueries} implementation */
export function providePlannerQueries(implementation) {
  queries = implementation;
}

/** @returns {PlannerQueries} */
export function plannerQueries() {
  if (!queries) throw new Error("The planner has not loaded yet");
  return queries;
}
