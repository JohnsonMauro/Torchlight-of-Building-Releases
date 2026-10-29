// Carino's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and the badge handler they share (packages/engine/src/heroes/carino/traits.js carinoLineRead).
import { RETURNING_SWITCH, carinoModuleOf } from "./trait-lines.js";
import { carinoLineRead } from "./traits.js";

// Carino (B9; packages/engine/src/heroes/carino/traits.js carinoLineRead): each clause's status and its derived lines; the best-case switches once per call.
export function carinoBadge(line, module, ctx) {
  const { heroId, state, entries, timedEffects, entry, derive, carino } = ctx;
  const carinoState = state.carino || null;
  if (!carino.switched) {
    carino.switched = true;
    for (const item of carinoState?.switches || [])
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  if (module.key === "ouroboros" && carinoState?.returning && !carino.returning) {
    carino.returning = true;
    const hitting = (carinoState.returning.setups || []).filter((item) => item.active);
    timedEffects.push({
      id: RETURNING_SWITCH,
      label: "Evil Ouroboros: returning projectiles hit the dummy",
      source: module.label,
      target: "self",
      toggle: true,
      provisional: true,
      enabled: carinoState.returning.on,
      active: carinoState.returning.on && (hitting.length > 0 || !(carinoState.returning.setups || []).length),
      summary: hitting.length
        ? `${hitting.map((item) => item.name).join(", ")}: each projectile hits the dummy again on its way back`
        : "each penetrating projectile hits the dummy again on its way back",
      reason: carinoState.returning.on ? "best-case assumption (the dummy stands on the return path)" : "switched off",
      parts: [],
    });
  }
  const read = carinoLineRead(heroId, line.clean, carinoState, { revived: line.origin === "memory" });
  if (!read) {
    entry(line, { ...module, status: "Not modeled" }, false, "this Carino clause is not read");
    return;
  }
  const active = read.status === "In calc";
  entries.push({
    source: line.source,
    origin: line.origin || "trait",
    text: line.clean,
    active,
    conditionText: `${module.label}: ${read.reason}`,
    status: read.status,
    provisional: true,
    bodies: read.bodies.map((body) => ({ body, derivedText: active ? body : null, readers: ["hero"] })),
    condition: "heroModule",
    group: read.group || null,
    module: module.key,
  });
  if (active) for (const body of read.bodies) derive(body, line.source, read.reason);
}

export const CARINO_MODULES = Object.freeze([
  // Carino (hero trait audit B9, 2026-10-19; packages/engine/src/heroes/carino/traits.js settles the state, packages/engine/src/planner.js applies the use-rate factor, the
  // Special Ammo variant hits and the returning hits; these entries carry the badges and the derived lines).
  {
    key: "ammo",
    heroes: /^carino-/,
    label: "Carino: ammo",
    status: "Provisional",
    rule: 'Q-H8 recommended reading (provisional): one ammo per cast, not per projectile; the "when consuming ammo" bonuses apply to every Projectile cast. Ranger of Glory (and Zealot of War, by the Reload keyword): Projectile Skills are unavailable while reloading, so the Projectile casts run at r × M ÷ (M + R × r) (M: the magazine, R: the reload time, r: the measured Projectile casts per second); Ranger of Glory\'s Reload Speed takes 150% of the larger increased Attack / Cast Speed. Lethal Flash: casting interrupts the reload, no downtime.',
    // Carino (B9): every clause packages/engine/src/heroes/carino/traits.js reads (its revived lines included); plain lines (Projectile Quantity, additional
    // damage, Projectile Range) stay with the generic readers.
    lines: { test: (text) => carinoModuleOf(text) === "ammo" },
    badge: carinoBadge,
  },
  {
    key: "specialAmmo",
    heroes: /^carino-ranger-of-glory$/,
    label: "Carino: Special Ammo",
    status: "Provisional",
    rule: "Special Ammo (provisional): each slot's support (Ammo Expert's 2 slots, Well Prepared's Magnificent / Noble slot; not on the skill panel, able to support Projectile Skills) is refilled with the reload chance at every magazine reload and consumed by the next cast, which gains the support's hit effects at Lv. 20 and the \"if a Special Ammo is consumed\" lines; Magic Shot (50% per Special Ammo, every 8 s at most; Never Stopping extends it) makes casts consume 3 ammo (Landslide: all), reloads instant and the loaded supports apply together.",
    lines: {
      test: (text) =>
        carinoModuleOf(text) === "specialAmmo" || carinoModuleOf(text, { revived: true }) === "specialAmmo",
    },
    badge: carinoBadge,
  },
  {
    key: "heatUp",
    heroes: /^carino-zealot-of-war$/,
    label: "Carino: Heat Up",
    status: "Provisional",
    rule: "Heat Up (provisional; Max Heat Up Stacks = the magazine capacity, game records 274178304 / 241096224): Incinerated Glory's k-th ammo casts at k stacks, then Blank Firing at max stacks until Overheated forces the reload 10 s later (Extreme Heat: 10 s of Burning Red at +100% Heat Up Effect), the reload clears them; Ceasefire holds max stacks. Heat Up Effect from the moon (+50%) and Self-Imposed Shackles (+30% additional while standing still).",
    lines: {
      test: (text) => carinoModuleOf(text) === "heatUp" || carinoModuleOf(text, { revived: true }) === "heatUp",
    },
    badge: carinoBadge,
  },
  {
    key: "deflection",
    heroes: /^carino-lethal-flash$/,
    label: "Carino: Deflection",
    status: "Provisional",
    rule: "Deflection (provisional): held while a Deflection gain source holds (movement, Reaping, hit recently, not hit recently; Into the Night's 3 s met by its refresh); the dummy never attacks, so it is never consumed (best-case switch).",
    lines: {
      test: (text) => carinoModuleOf(text) === "deflection" || carinoModuleOf(text, { revived: true }) === "deflection",
    },
    badge: carinoBadge,
  },
  {
    key: "ouroboros",
    heroes: /^carino-lethal-flash$/,
    label: "Carino: returning Projectiles",
    status: "Provisional",
    rule: "Evil Ouroboros (provisional): a Horizontal Projectile skill with at least 1 Penetration passes through the dummy, reaches its max range and returns over 75% of it, hitting the dummy once more as a full hit (best-case switch: the dummy on the return path).",
    lines: { test: (text) => carinoModuleOf(text) === "ouroboros" },
    badge: carinoBadge,
  },
]);
