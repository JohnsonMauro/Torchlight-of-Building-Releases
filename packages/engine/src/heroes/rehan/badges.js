// Rehan's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and the badge handler they share (packages/engine/src/heroes/rehan/traits.js rehanLineRead).
import { rehanModuleOf } from "./trait-lines.js";
import { rehanLineRead } from "./traits.js";

// Rehan (B10; packages/engine/src/heroes/rehan/traits.js rehanLineRead): each clause's status and its derived lines; the best-case switches once per call.
export function rehanBadge(line, module, ctx) {
  const { heroId, state, entries, timedEffects, entry, derive, rehan } = ctx;
  const rehanState = state.rehan || null;
  if (!rehan.switched) {
    rehan.switched = true;
    for (const item of rehanState?.switches || [])
      timedEffects.push({
        ...item,
        source: module.label,
        target: "self",
        toggle: true,
        provisional: true,
        parts: [],
      });
  }
  const read = rehanLineRead(heroId, line.clean, rehanState, { revived: line.origin === "memory" });
  if (!read) {
    entry(line, { ...module, status: "Not modeled" }, false, "this Rehan clause is not read");
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
    group: null,
    module: module.key,
  });
  if (active)
    for (const body of read.bodies)
      derive(
        body,
        line.source,
        read.reason,
        read.key === "tunnelPenalty" ? { rehanNonBurst: true } : { rehanPhase: "average" },
      );
}

export const REHAN_MODULES = Object.freeze([
  // Rehan (hero trait audit B10, 2026-10-19; packages/engine/src/heroes/rehan/traits.js settles the state, packages/engine/src/planner.js adds Burst as a triggered hit source and
  // applies Tunnel Vision, Disarmed and the Seething Spirit's casts; these entries carry the badges and the derived lines).
  {
    key: "rage",
    heroes: /^rehan-/,
    label: "Rehan: Rage / Berserk",
    status: "Provisional",
    rule: "Q-H1 recommended reading (provisional): Max Rage 100 (TLIDB Rage keyword) + \"Max Rage\" lines; Berserk at Max Rage lasts until Rage runs out (Max Rage ÷ the net drain: Anger 15/s, Seething Silhouette 10/s + 10 per Melee Attack cast; Righteous Fury, Frenzy Furious, Growing Anger, Fury's Onslaught and Hysteria change it); Rage outside Berserk from the measured uses (10 per Melee Attack use, 5 per channel stack, 15 per Ranged use with Starfall Wasteland) × (1 + Rage gained); uptime = Berserk ÷ (Berserk + fill). The per-Rage bonuses read twice Max Rage in Berserk (the Berserk keyword) and Max ÷ 2 outside, time-averaged over the cycle (the 5 s / 20 s windows too); Disarmed pauses the player's Attack Skills.",
    // Rehan (B10): every clause packages/engine/src/heroes/rehan/traits.js reads (its revived lines included); plain lines (Hysteria's Missing Life, Split Form's
    // Max Life and Life Regain, Ritual's Movement Speed, Ancestral Hate's defensive lines) stay with the generic readers.
    lines: { test: (text) => rehanModuleOf(text) === "rage" || rehanModuleOf(text, { revived: true }) === "rage" },
    badge: rehanBadge,
  },
  {
    key: "burst",
    heroes: /^rehan-anger$/,
    label: "Rehan: Burst",
    status: "Provisional",
    rule: 'Burst (TLIDB keyword; game row config_skill_damage 90000: 340% Weapon Damage, one Lv. 1 row; Burst Blast: row 90003, 1166–1944 Spell Physical at 288%) is a triggered hit source: once per Attack Skill use that hits while Berserk, at most once per 0.3 s ÷ (1 + Burst Cooldown Recovery Speed: Artificial Moon, Rampaging), × the Berserk uptime; +10% additional damage per +1 Skill Level (tag-matching level lines), "per 1 levels" read as the character level. Tunnel Vision\'s -80% applies to every other skill (Q-H15, best-case switch, default applied). Provisional.',
    lines: { test: (text) => rehanModuleOf(text) === "burst" || rehanModuleOf(text, { revived: true }) === "burst" },
    badge: rehanBadge,
  },
  {
    key: "spirit",
    heroes: /^rehan-seething-silhouette$/,
    label: "Rehan: Seething Spirit",
    status: "Provisional",
    rule: "Seething Spirit (TLIDB keyword: casts your Non-Mobility, Non-Channeled Main Melee Attack Skill; Starfall Wasteland: a Ranged Projectile Skill): it casts the Main Skill at your own use rate (× 0.7 with Fury's Onslaught) for the whole Berserk (Ritual of Offering) or while the Main Skill is used within every 2 s (Fury's Onslaught), each cast a full use with the Berserk-phase lines, Ritual's +X% and Fury's game-record offset; Growing Anger's Rage per Spirit cast; Starfall's extra projectile and return. Provisional.",
    lines: { test: (text) => rehanModuleOf(text) === "spirit" || rehanModuleOf(text, { revived: true }) === "spirit" },
    badge: rehanBadge,
  },
]);
