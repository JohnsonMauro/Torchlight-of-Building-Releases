// Open questions (Character → Damage path, bottom section): the interactions and math readings the planner is not sure
// about, listed only when the current build actually uses them. Players who test in game can answer them; the copy button
// turns the applicable ones into plain text for Discord or Reddit.
//
// Each entry:
//   id, title          stable id and a short player-facing title
//   question           the open question in one or two plain sentences
//   evidence           "provisional" | "user-supplied" | "game code (not tested)" | "game data (partial)" | "unknown" (the pill on
//                      the card)
//   current            what the planner assumes now, starting with its evidence class
//   alternatives       [{ reading, effect }]: the other readings and a short static effect text (no extra planner passes)
//   test               the in-game check that would settle it
//   source             the research note or CLAUDE.md section
//   appliesWhen(ctx)   true when the build uses the skill / item / talent / trait / mechanic (ctx from openQuestionContext)
//
// Pure module: reads the planner result and the state, never recomputes damage.

import { isExclusiveRevival } from "../../engine/heroes/hero-exclusive-revivals.js";

const names = (list, pick = (item) => item?.name) => (list || []).map(pick).filter(Boolean);
const count = (list, name) => list.filter((item) => item === name).length;
const coreName = (source) =>
  String(source || "")
    .replace(/^.*?core:\s*/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();

/** The facts the registry's `appliesWhen` checks read, from the planner's resolved data. */
export function openQuestionContext(planner, state = planner?.state) {
  const setups = (planner?.activation?.setups || []).filter((setup) => setup && setup.enabled !== false);
  const supportsOf = (setup) =>
    (setup.supports || []).filter((support) => support && support.enabled !== false).map((support) => support.name);
  const texts = (planner?.modifierTexts || []).filter((entry) => entry && entry.text);
  const items = names(planner?.equipment?.candidateItems);
  const skillHits = (planner?.skillHits || []).filter((hit) => hit && hit.modeled !== false && !hit.inactiveReason);
  const setupByKey = new Map(setups.map((setup) => [setup.setupKey, setup]));
  return {
    heroId: state?.hero?.selectedHeroId || "",
    setups,
    setupNames: new Set(setups.map((setup) => setup.name)),
    supports: new Set(setups.flatMap(supportsOf)),
    items,
    itemCount: (name) => count(items, name),
    hasItem: (name) => items.includes(name),
    cores: new Set(texts.filter((entry) => entry.origin === "core").map((entry) => coreName(entry.source))),
    texts,
    hasText: (pattern) => texts.some((entry) => pattern.test(entry.text)),
    skillHits,
    skillHitSetup: (hit) => setupByKey.get(hit.setupKey) || null,
    components: skillHits.flatMap((hit) => (hit.components || []).map((component) => ({ hit, component }))),
    minions: Array.isArray(planner?.minions) ? planner.minions : [],
    ailments: planner?.ailments || {},
    enemyAilments: new Set(names(planner?.mechanics?.enemyAilments?.types)),
    lineState: planner?.lineEffects?.state || {},
    planner: planner || {},
  };
}

// A core the build has from any place: the talent panel or an Ethereal Prism (origin core), a Pedigree of Gods slate or a
// "[Core]" gear grant (`grantedCore`).
const hasCore = (ctx, name) =>
  ctx.cores.has(name) ||
  ctx.texts.some(
    (entry) =>
      entry.grantedCore === name ||
      (entry.origin === "slate" &&
        new RegExp(`Core Talent: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
          `${entry.source} ${entry.text} ${entry.bracketText || ""}`,
        )),
  );
const youga = (ctx) => (ctx.planner.yougaUltimateOne?.active ? ctx.planner.yougaUltimateOne : null);
const coreApplied = (ctx) => Boolean(youga(ctx)?.core?.applied);
const recalls = (ctx) => Boolean(youga(ctx)?.recallHits) && (youga(ctx)?.recallsPerProjectile || 0) > 0;
const dance = (ctx) =>
  ctx.heroId === "selena-dance-of-the-deep" && ctx.planner.danceOfTheDeep?.selected ? ctx.planner.danceOfTheDeep : null;
const activeEntries = (state) => (state?.entries || []).filter((entry) => entry?.active);

// Answered items stay out (e.g. Freeze at 100+ Frostbite Rating, user-confirmed 2026-10-18).
const YOUGA_NOTES =
  "research/youga-recall-mechanics-2026-10-18.md; research/youga-homing-frost-bolt-audit-2026-10-18.md";
// The follower's chosen Tartarus Skill support affixes (src/engine/followers/follower-model.js, 2026-10-19): [{ name, slot, skill }].
const FOLLOWER_AFFIX_NOTES = "research/followers/tartarus-skill-affixes-2026-10-19.md";
// The follower letter rework (2026-10-19): letter rarities, the initial skill, the ULT special effects.
const FOLLOWER_LETTER_NOTES =
  "research/followers/tartarus-skill-affixes-2026-10-19.md (Letter rarities, initial skill and ULT special effects)";
const followerAffixes = (ctx) =>
  (ctx.planner.follower?.selection?.skills || []).flatMap((entry) =>
    (entry.affixes || []).map((item) => ({ name: item.affix.name, slot: item.slot, skill: entry.skill.name })),
  );
const hasFollowerAffix = (ctx, name) => followerAffixes(ctx).some((item) => item.name === name);

// Hero trait audit 2026-10-19 (research/hero-traits-audit-2026-10-19.md, batch B1): Bing's sixth rank (Q-H2) and the
// hero-exclusive revived affixes (Q-H11). The equipped memories with a hero-exclusive revival (src/engine/heroes/hero-exclusive-revivals.js).
const HERO_TRAIT_AUDIT = "research/hero-traits-audit-2026-10-19.md";
// A trait of this loadout is picked and carries lines ("Hero trait: <name> (Lv N…)"; hero trait audit B2).
const traitPicked = (ctx, heroId, name) =>
  ctx.heroId === heroId &&
  ctx.texts.some((entry) => entry.origin === "trait" && String(entry.source || "").startsWith(`Hero trait: ${name} (`));
const equippedExclusiveRevivals = (ctx) => {
  const hero = ctx.planner.state?.hero || {};
  const ids = new Set(Object.values(hero.equippedMemoryIds || {}).filter(Boolean));
  return (hero.memoryInventory || []).filter((memory) => ids.has(memory.id) && isExclusiveRevival(memory.revivedAffix));
};

export const OPEN_QUESTIONS = Object.freeze([
  {
    id: "youga-recall-falloff",
    title: "Recall: does Shotgun falloff hit Recalled passes?",
    question:
      "When a bolt is Recalled and hits the same target again, does the Shotgun Effect count it as a repeat hit (60%), or is it a full hit?",
    evidence: "provisional",
    current:
      "Provisional: every Recalled pass is a full hit; only the first cast's own bolts take the Shotgun falloff. Game data shows no built-in Return penalty, but the repeat-hit counter was not traced (R2).",
    alternatives: [
      {
        reading: "Each Recall wave takes the cast's falloff (2.2 of 3 bolts per wave)",
        effect: "about ×0.76 on the total (Homing Frost Bolt build)",
      },
      { reading: "Every hit after the first from one cast deals 60%", effect: "about ×0.64 on the total" },
    ],
    test: "Dummy run with and without the Jump support (Recalls 3 → 1). Full Recalls predict about ×1/2.74; the falloff reading about ×1/2.61.",
    source: `${YOUGA_NOTES} (R2, audit Q3)`,
    appliesWhen: (ctx) => recalls(ctx),
  },
  {
    id: "youga-recall-rehit",
    title: "Recall: do Recalled bolts hit the dummy again?",
    question:
      "Does each Recalled bolt hit the dummy again as a fresh hit with full damage, at most once per Recall pass?",
    evidence: "user-supplied",
    current:
      "User-supplied (2026-10-18): yes, a full-damage fresh hit per Recall pass. Game code supports it (the return routine clears the bolt's hit list), but the hit component's last step was not traced (R7).",
    alternatives: [
      {
        reading: "Recalled bolts never hit the dummy (Centralization still builds)",
        effect: "about ×0.1 on the total",
      },
      { reading: "They never hit and Centralization is lost too", effect: "about ×0.07 on the total" },
    ],
    test: "Run the dummy without pressing Stasis Vault. The planner predicts a drop of about ×7 to ×10; a small drop means the Recall share is overstated.",
    source: `${YOUGA_NOTES} (R7)`,
    appliesWhen: (ctx) => recalls(ctx),
  },
  {
    id: "youga-core-manual-casts",
    title: "Clockwork Core: do your own casts fire bolts?",
    question:
      "While the Clockwork Core exists, does casting the supported skill also fire it, or does it only place or move the Core?",
    evidence: "game code (not tested)",
    current:
      "Game code (user-decided 2026-10-18): your own casts fire nothing; they only summon or move the Core, and only the Core's Tangle triggers hit. Still to be confirmed by an in-game test (R1).",
    alternatives: [
      { reading: "Your casts also fire bolts with all the Core bonuses", effect: "about ×2 on the total" },
      {
        reading: "Your casts fire bolts without the Core tag (no Core lines, no Recall)",
        effect: "about ×1.07 on the total",
      },
    ],
    test: "Cast once to place the Core with Stasis Vault up, then stop casting for 5 s. The recount's 5 s average should stay the same; it halves if your casts also fire.",
    source: `${YOUGA_NOTES} (R1)`,
    appliesWhen: (ctx) => coreApplied(ctx),
  },
  {
    id: "youga-core-tangles",
    title: "Clockwork Core: how many Tangles fire per interval?",
    question:
      "Does every Tangle on the Core (Max Tangle Quantity, 2 at base) trigger the skill each casting interval, or only one?",
    evidence: "user-supplied",
    current:
      "User-supplied (2026-10-18): every attached Tangle triggers it. The skill text and the Tangle fields (base 2, highest 4) support it (R1b).",
    alternatives: [
      {
        reading: "One Tangle triggers per casting interval",
        effect: "about ×0.75 on the total (×0.5 of the Core triggers)",
      },
    ],
    test: 'Count the bolt volleys the Core fires over a few seconds against the casting interval (the Config switch "Clockwork Core: every Tangle triggers the skill" shows the planner\'s two readings).',
    source: `${YOUGA_NOTES} (R1b)`,
    appliesWhen: (ctx) => coreApplied(ctx) && youga(ctx)?.tangles?.reading !== false,
  },
  {
    id: "youga-stasis-vault-modifiers",
    title: "Stasis Vault: what applies to it, and does it boost Recalled projectiles?",
    question:
      "Which modifiers apply to Stasis Vault itself: its supports' lines (such as Increased Area's Skill Area and additional damage), Spell / Area / Persistent lines and Skill Area? Do any of them raise the damage of the projectiles it Recalls? And does Skill Area matter against a single target?",
    evidence: "game data (partial)",
    current:
      "Game data (partial; not tested in game): Stasis Vault deals no damage of its own. Its skill data has no damage entry and its buff carries no modifiers, so damage lines on it (its supports' additional damage, Spell / Area / Persistent damage) read No DPS effect. A Recalled hit stays the bolt's own: the Recall routine only adds the Recall tag to the bolt's damage. Support lines are scoped to the skill they support, so the Vault's supports are not passed to Recalled hits. Skill Area widens the 10 m vault (50% of the bonuses, up to 140%). The Recall count and the Vault uptime do not depend on the radius, and the dummy stands inside it, so no figure moves.",
    alternatives: [
      {
        reading: "Increased Area's +20.8% additional damage reaches Recalled hits (90.5% of the bolt damage)",
        effect: "about ×1.19 on the total (Homing Frost Bolt build)",
      },
      {
        reading: "The Vault's support damage reaches every bolt the Core fires while the Vault is up",
        effect: "about ×1.21 on the total (Homing Frost Bolt build)",
      },
      {
        reading:
          "Skill Area on the Vault changes the Recalls on one dummy (for example, bolts that end their flight before a wider edge do not Recall)",
        effect: "unknown size; the planner's figures do not move with it now",
      },
    ],
    test: "Dummy run with and without Increased Area on Stasis Vault, all else equal, comparing the recount's last 5 s: the planner predicts no change, the Recalled-hits reading about ×1.19. Then the same with a different damage support on the Vault.",
    source: `research/youga-recall-mechanics-2026-10-18.md ("Increased Area on Stasis Vault")`,
    appliesWhen: (ctx) => {
      const ts = youga(ctx)?.traitSkills;
      return Boolean(ts?.vault?.active) && ts.pressed !== false;
    },
  },
  {
    id: "on-the-sublime-pair",
    title: "Two On the Sublime: separate or shared buff?",
    question:
      'With two On the Sublime equipped, does each wand\'s "+2% additional Spell Projectile Damage per Spell Projectile generated recently, up to 10" stack on its own, or do both feed one buff?',
    evidence: "provisional",
    current:
      "Provisional: two separate buffs, ×1.2 × 1.2 = ×1.44 (the planner's rule for two copies of an additional line). Game record 587878912 points to one shared buff (35117), but its stack cap was not extracted.",
    alternatives: [
      { reading: "One shared buff, capped at 10 stacks (×1.2)", effect: "about ×0.83 on the skill's hits" },
      { reading: "One shared buff at +4% per stack (×1.40)", effect: "about ×0.97 on the skill's hits" },
    ],
    test: "Look at the buff bar while casting: one On the Sublime icon with a 10-stack counter, or two icons.",
    source: "research/youga-homing-frost-bolt-audit-2026-10-18.md (Q1, R4)",
    appliesWhen: (ctx) => ctx.itemCount("On the Sublime") >= 2,
  },
  {
    id: "gale-pool",
    title: "Gale: which Projectile Speed counts?",
    question:
      "Gale turns 60% of the Projectile Speed bonus into additional Projectile Damage. Does that pool hold only increased Projectile Speed, including the skill's own support lines and buffs?",
    evidence: "provisional",
    current:
      'Provisional (game record 114414): only increased Projectile Speed counts, including the skill\'s own support clauses, the Aura and buffs such as Centralization. "+X% additional Projectile Speed" is left out.',
    alternatives: [
      {
        reading: "Only the character-sheet Projectile Speed counts (no skill-scoped lines or buffs)",
        effect: "about ×0.88 on the Homing Frost Bolt build",
      },
      {
        reading: "Additional Projectile Speed counts too",
        effect: "a little higher (On the Sublime's +15% would join)",
      },
    ],
    test: "Compare the character panel's Projectile Speed with the skill's damage bonus, with and without a skill-only Projectile Speed support.",
    source: "research/youga-homing-frost-bolt-audit-2026-10-18.md (fix 3, Q4, R6)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => (hit.projectileSpeed?.converters || []).length > 0),
  },
  {
    id: "homing-frost-bolt-row-1282",
    title: "Homing Frost Bolt: what is game row 1282?",
    question:
      "The game files give Homing Frost Bolt a second damage row (Cold 317–475 at Lv.20, 73% effectiveness, 0.4× the bolt's row) that the skill card never mentions. Does it deal damage?",
    evidence: "unknown",
    current: "Unknown: not modeled; only the bolt's own row (792–1188) is used.",
    alternatives: [
      { reading: "Row 1282 is an extra Cold hit with each bolt", effect: "up to about ×1.4 on the bolt's hit damage" },
    ],
    test: "Watch the damage numbers of a single bolt on the dummy: one number per bolt, or a second smaller one.",
    source: "src/engine/skills/skill-hit-profiles.js (Homing Frost Bolt note)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.name === "Homing Frost Bolt"),
  },
  {
    id: "frost-magus-gap",
    title: "Frost Magus reads about 3× the Iris runs",
    question:
      "The planner's Frost Magus damage is about 3× the user's Iris dummy runs, with or without Nourishment. Which part of the Magus model is too high?",
    evidence: "unknown",
    current:
      "Unknown: nothing fitted. Model vs runs: ×2.83 (Trait Skill never pressed) and ×3.25 (pressed on cooldown) on the average. The +30% per Nourishment stack is confirmed by the tooltip.",
    alternatives: [
      {
        reading: "A missing factor of roughly ×0.33 on the Magus (cause not found)",
        effect: "about ×0.33 on the Magus's damage",
      },
    ],
    test: "A Summon Frost Magus run with one Magus and no gear, noting the Magus's per-hit numbers and skill casts per second.",
    source: "CLAUDE.md (Iris Nourishment runs); research/residual-batch-2026-10-12.md §5.3 run 7",
    appliesWhen: (ctx) => ctx.minions.some((minion) => minion?.minionKey === "frost-magus"),
  },
  {
    id: "instant-smash-trauma",
    title: "Instant Smash in the game's Trauma damage?",
    question:
      'Does Instant Smash ("+1% additional Trauma Damage for every +2% Critical Strike Damage") reach Trauma in game? A panel test suggested it may be inactive (possibly the Max Active Divinity rule).',
    evidence: "provisional",
    current: "Provisional: applied from its text, crit damage gained in combat included.",
    alternatives: [
      {
        reading: "Instant Smash is inactive",
        effect: "Trauma divided by its multiplier (about ×0.23 on the Trauma fixture's +341%)",
      },
    ],
    test: "Compare the panel's Trauma DPS with the slate equipped and removed, and check whether another Divinity slate blocks it.",
    source: "research/game-log-comparison-2026-10-09.md; CLAUDE.md (ailment crit)",
    appliesWhen: (ctx) =>
      ctx.hasText(/additional Trauma Damage for every \+?[\d.]+% Critical Strike Damage/i) &&
      Boolean(ctx.ailments.trauma?.modeled),
  },
  {
    id: "nether-king-window",
    title: 'Nether King: how long is "recent"?',
    question:
      '"+X% Critical Strike Damage per recent non-Critical Strike, up to 4 stacks": how long does a non-crit count as recent?',
    evidence: "provisional",
    current: "Provisional: stacks = expected non-crit hits in the last 4 s, capped at 4.",
    alternatives: [
      {
        reading: "A shorter window, or stacks reset on a crit",
        effect: "fewer stacks: little change on fast hitters, a smaller crit damage bonus on slow ones",
      },
    ],
    test: "Watch the buff counter while hitting the dummy, then stop and time how long the stacks last.",
    source: "CLAUDE.md (Nether King correction 2026-10-15)",
    appliesWhen: (ctx) => ctx.hasText(/Critical Strike Damage per recent (?:non-)?Critical Strike/i),
  },
  {
    id: "full-mana-sealed",
    title: "Full Mana with Sealed Mana",
    question: "Does Sealed Mana count against Full Mana, the way Sealed Life counts against Full Life?",
    evidence: "provisional",
    current:
      "Provisional (by analogy with Full Life): Full Mana needs at least 95% of Max Mana unsealed and filled, so this build is not at Full Mana.",
    alternatives: [
      { reading: "Sealed Mana is ignored for Full Mana", effect: 'the build\'s "at Full Mana" lines turn on' },
    ],
    test: 'With Mana sealed by Auras, check whether an "at Full Mana" line shows as active on the character panel.',
    source: "CLAUDE.md (Full Life, 2026-10-12); src/engine/text/line-conditions.js",
    appliesWhen: (ctx) => ctx.hasText(/\bFull Mana\b/i) && (ctx.lineState.manaRemainingPercent ?? 100) < 95,
  },
  {
    id: "centralize-fixed-fervor",
    title: "Centralize on a fixed Fervor Rating",
    question:
      "When hit, can Centralize consume half of a fixed Fervor Rating (Unmatched Valor's 130), and can its +25% Rating on hit raise a fixed Rating?",
    evidence: "provisional",
    current:
      'Best case not hit (user-confirmed). With the "Centralize: not hit" switch off, half of the held Rating is assumed consumed (provisional); whether part 1 raises a fixed Rating is unconfirmed.',
    alternatives: [
      { reading: "A fixed Rating cannot be consumed", effect: "no damage loss when hit" },
      { reading: "Part 1 raises a fixed Rating", effect: "a higher Fervor Rating when hit" },
    ],
    test: "With a fixed Fervor Rating, get hit and watch the Fervor Rating number on the panel.",
    source: "CLAUDE.md (Centralize, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Centralize"),
  },
  {
    id: "impermanence-lines",
    title: "Impermanence: do all three lines apply?",
    question:
      "Do Impermanence's general ±32% Min / Max line and its Physical −90% Min / +80% Max line both apply to Physical damage?",
    evidence: "user-supplied",
    current:
      "User-supplied reading (2026-10-14, not an in-game test): all three apply; every hit gets −32% / +32%, and Physical (converted too) also gets −90% / +80%.",
    alternatives: [
      {
        reading: "The Physical line replaces the general one for Physical damage",
        effect: "a different Physical average hit; its size depends on the min / max spread",
      },
    ],
    test: "Compare a Physical skill's panel damage range with and without Impermanence.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Impermanence"),
  },
  {
    id: "core-consumption-gain-rate",
    title: "Consumption cores: how often is the stack gained?",
    question:
      "Thunderclap, Waiting Attack and Stab In The Back spend an Agility Blessing stack or Blur. The build gains it from a source whose rate the planner does not model (Mobility Skill use, evading, Energy Shield charging, crowd control, movement per metre, max-stack grants). How often does that source fire against the dummy?",
    evidence: "unknown",
    current:
      'Not modeled: the core is left out (badge Not modeled, naming the source). With a modeled source (a timed gain, "upon inflicting damage. Interval", a chance on hit or crit, Blur on Reap or per Wilt stacks) the share of casts that find a stack is min(1, gain rate ÷ Main Skill cast rate) (user-confirmed 2026-10-18). What a cast consumes is answered (user-supplied 2026-10-19, Google AI Mode answer): Thunderclap 1 Agility stack per Main Skill cast, Stab In The Back the whole Blur; only the gain rate of these sources stays open.',
    alternatives: [
      {
        reading: "The source fires at least as often as the Main Skill is cast",
        effect: "the full bonus on every cast (Thunderclap +35% Lightning, Stab In The Back +30%)",
      },
      {
        reading: "The source fires about once per its own cooldown",
        effect: "a share below 1: a fraction of the bonus",
      },
    ],
    test: "With the core and only that gain source, watch the Agility stack count (or the Blur icon) while casting the Main Skill at the dummy, and count how often a cast finds a stack.",
    source:
      "research/core-talents-audit-2026-10-18.md §6 Q5; research/google-ai-mode-answers-2026-10-19.md; src/engine/talents/consumption-procs.js",
    appliesWhen: (ctx) => {
      const consumption = ctx.planner.lineEffects?.state?.consumption;
      return (
        Boolean(consumption) &&
        [consumption.agility, consumption.blur, consumption.waitingAttack].some((item) => item && item.active === null)
      );
    },
  },
  {
    id: "core-thunderclap-held-agility",
    title: "Thunderclap: are Agility stacks held when the casts outpace the gain?",
    question:
      "Thunderclap spends 1 Agility Blessing stack on each Main Skill cast that finds one. When the build casts faster than it gains Agility, does it still hold Agility stacks (and their +2% additional damage and +4% Attack and Cast Speed each) between casts?",
    evidence: "provisional",
    current:
      "Provisional (core audit batch B3): when the gain rate keeps up with the cast rate, Agility stays at max stacks; when it does not, each gained stack is spent by the next cast and none are held (Agility's own effect is lost). One stack per Main Skill cast is user-supplied 2026-10-19 (Google AI Mode answer); whether stacks are held between casts is still open.",
    alternatives: [
      {
        reading: "A gained stack is held until the next cast (half a cast interval on average)",
        effect: "a little Agility kept: slightly higher damage and speed",
      },
      { reading: "Thunderclap never lowers the held stacks below 1", effect: "one stack's effect kept: higher damage" },
    ],
    test: "With Thunderclap and a slow Agility source (one stack per second), cast quickly at the dummy and watch the Agility stack count between casts.",
    source: "research/core-talents-audit-2026-10-18.md §5 B3; src/engine/talents/consumption-procs.js",
    appliesWhen: (ctx) => hasCore(ctx, "Thunderclap"),
  },
  {
    id: "core-juggernaut-stacks",
    title: "Juggernaut: do your Minions' crits add stacks?",
    question:
      "Juggernaut gives the enemy a stack on each of your Critical Strikes (8 s, up to 10). Do your Minions' Critical Strikes add stacks too?",
    evidence: "game data (partial)",
    current:
      "Provisional (core audit batch B4): only your own crits add stacks; Minion crits add none. Answered (user-supplied 2026-10-19): each stack keeps its own 8 s timer, and the Armor part compounds (Armor × 0.9 ^ stacks).",
    alternatives: [{ reading: "Minion crits add stacks too", effect: "more stacks for Minion builds" }],
    test: "With Juggernaut on a Minion build whose Minions crit, let only the Minions hit the dummy and watch whether its Juggernaut debuff icon gains stacks.",
    source: "research/core-talents-audit-2026-10-18.md §4.4 (Juggernaut), §5 B4; src/engine/combat-states.js",
    appliesWhen: (ctx) => hasCore(ctx, "Juggernaut"),
  },
  {
    id: "core-towering-presence-weapon-damage",
    title: "Towering Presence: which weapon damage reaches your Spells?",
    question:
      "Towering Presence \"Adds 100% of the Main-Hand Weapon damage to Spells\" (game field 2006260, no other reader in the files). Is it the weapon's own damage (its base and local affixes) added as flat damage that the spell's damage effectiveness scales? And does the Scorching Beam take it?",
    evidence: "provisional",
    current:
      "Provisional: the main-hand weapon's own damage per type (base and local affixes, without the Two-Handed or Off-Hand bonuses) is added to every Spell skill hit as added flat damage, scaled by each skill's damage effectiveness. Attacks don't get it. The Scorching Beam ledger has no added Physical part, so the beam doesn't take it yet. The crit line (game record 838374) adds 75% of the weapon's final rating to each Spell skill's base rating.",
    alternatives: [
      {
        reading: "The weapon damage is added at full value, not scaled by the skill's damage effectiveness",
        effect: "higher spell hits for skills under 100% effectiveness",
      },
      { reading: "The Two-Handed and main-hand bonuses count too", effect: "higher spell hits with a two-hander" },
    ],
    test: "With Towering Presence and a plain weapon, compare a spell's tooltip damage with and without the weapon equipped.",
    source: "research/core-talents-audit-2026-10-18.md §5 B5; src/engine/talents/towering-presence.js",
    appliesWhen: (ctx) => hasCore(ctx, "Towering Presence"),
  },
  {
    id: "core-stab-in-the-back-blur",
    title: "Stab In The Back: how long is Blur up?",
    question:
      "Stab In The Back ends Blur on each Main Skill cast made while Blur is active. Blur's own effects (Blur Rating, Daze, Stealth Stab, the Blur DoT lines) then hold only until the next cast. How much Blur uptime is left?",
    evidence: "provisional",
    current:
      "Provisional (core audit batch B3): the +30% applies to the share of casts that find Blur, min(1, Blur gain rate ÷ cast rate) (user-confirmed 2026-10-18); a cast consumes the whole Blur (user-supplied 2026-10-19, Google AI Mode answer); Blur's own effects still follow the Blur condition (held), not the consumption.",
    alternatives: [
      {
        reading: "Blur is up only between its gain and the next cast (uptime ≈ the same share)",
        effect: "lower damage where Blur's own effects matter (Daze, Blur DoT lines, Subtle Impact)",
      },
    ],
    test: "With Stab In The Back and a Blur source, cast the Main Skill repeatedly and watch how long the Blur icon stays between casts.",
    source:
      "research/core-talents-audit-2026-10-18.md §5 B3; src/engine/talents/consumption-procs.js; src/engine/combat/blur-effects.js",
    appliesWhen: (ctx) => hasCore(ctx, "Stab In The Back"),
  },
  {
    id: "core-three-birds-splits",
    title: "Three Birds with One Stone: do the extra splits hit the dummy?",
    question:
      '"+2 to Parabolic Projectile Splits quantity": do the split projectiles land on the same single target, and how many Splits does Thunderbolt Overload have before the +2?',
    evidence: "user-supplied",
    current:
      "User-supplied 2026-10-19 (Google AI Mode answer, not tested in game; uncertain): each landing parabolic projectile splits 2 more times, and the splits land as area explosions on the same target at the skill's after-split damage (−50% on Bombard, Corrosive Shot, Flame Jet's bombs), with no Shotgun falloff. Thunderbolt Overload's per-Split bonus is not applied: its base Split count is not in the data.",
    alternatives: [
      {
        reading: "The splits fly off and need other targets",
        effect: "no extra damage on one dummy (the reading before 2026-10-19)",
      },
      { reading: "The splits take Shotgun falloff on the same target", effect: "less than 1 hit per split" },
    ],
    test: "Cast Bombard or Flame Jet at the dummy with and without the core, and count the damage numbers per cast.",
    source: "research/google-ai-mode-answers-2026-10-19.md; src/engine/skills/skill-hit-model.js parabolicSplit",
    appliesWhen: (ctx) =>
      hasCore(ctx, "Three Birds with One Stone") &&
      ctx.setups.some((setup) => (setup.tags || []).includes("Parabolic")),
  },
  // Core audit batch B7 (Minion): a reading still open, shown only with the core.
  {
    id: "core-rally-module-count",
    title: "Rally: how many Module Minions?",
    question:
      'Rally gives "Synthetic Troop Minions summoned at a time +1". A Module\'s Max Minion Quantity is a placeholder in the game text: does the extra Minion stay within it?',
    evidence: "user-supplied",
    current:
      "User-supplied 2026-10-19 (Google AI Mode answer, not tested in game; uncertain): +1 Minion per cast, Module summons included, up to the skill's max quantity. The planner counts 1 + 1 Module Minions (the Module's max is not in the data). Synthetic Troop summons with a published maximum are already at it.",
    alternatives: [
      { reading: "A Module's max quantity is 1", effect: "×0.5 on the Module's damage (no second Minion)" },
    ],
    test: "Summon a Module with Rally and count the Minions on the field.",
    source: "research/google-ai-mode-answers-2026-10-19.md; src/engine/minions/minion-damage-model.js",
    appliesWhen: (ctx) =>
      hasCore(ctx, "Rally") && ctx.minions.some((minion) => minion.modeled && minion.family === "module"),
  },
  {
    id: "joined-force-base",
    title: "Joined Force: 60% of what?",
    question:
      "Is Joined Force's 60% taken from the off-hand's local base damage (after its own local affixes) and added to the main hand before global multipliers?",
    evidence: "user-supplied",
    current:
      "User-supplied reading (2026-10-14, not an in-game test): yes; speed and crit come from the main hand only.",
    alternatives: [{ reading: "60% of the off-hand's flat added damage only", effect: "lower attack damage" }],
    test: "Compare the main-hand attack damage on the panel with and without Joined Force, and with a different off-hand.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Joined Force"),
  },
  {
    id: "steep-strike-attempts",
    title: "Thunder Slash: Steep Strike attempts",
    question:
      "Does Thunder Slash store one Steep Strike attempt per 2 Multistrikes, checked on each attack, with Cat's Scratch and the skill's Steep increment in one pool?",
    evidence: "user-supplied",
    current:
      "User-supplied reading (2026-10-14/15, not an in-game test): one attempt per 2 repeat attacks, checked per attack; a use with a stored attempt is a Steep Strike.",
    alternatives: [
      { reading: "Attempts are counted once per Multistrike sequence", effect: "fewer Steep Strikes per use" },
    ],
    test: "Count Steep Strikes over 20 Thunder Slash uses while standing still.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.steepStrike?.multistrikeAttempts),
  },
  {
    id: "big-stride-window",
    title: "Big Stride: is the window held while moving?",
    question:
      "Is every attack a Steep Strike while you keep moving, or only the attacks within 4 s after each 8 m moved?",
    evidence: "user-supplied",
    current:
      'User-supplied reading (2026-10-15): the window stays open while moving, so every use is a Steep Strike while "Moved recently" is on.',
    alternatives: [
      { reading: "One 4 s window per 8 m moved", effect: "fewer Steep Strikes when attacking while repositioning" },
    ],
    test: "Count Steep Strikes while circling the dummy compared with standing still.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.steepStrike?.window),
  },
  {
    id: "blade-cluster-hits",
    title: "Blade Cluster: extra Steep Strike hits",
    question:
      'Does "Generates 2 additional Steep Strikes when the supported skill launches a Steep Strike" mean two more Steep Strike hits on the same target per launch?',
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-15): yes, the Steep Strike part hits 3 times per launch.",
    alternatives: [
      {
        reading: "2 more stored attempts instead (the earlier reading)",
        effect: "about ×0.35 on the Erika fixture's sustained figure",
      },
    ],
    test: "Count the Steep Strike damage numbers per launch on the dummy.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => (hit.steepStrike?.clusterHits || 0) > 0),
  },
  {
    id: "rate-driven-buffs",
    title: "Buff uptimes taken from hit rates",
    question:
      "Are these buffs' uptimes right: Tremble's Numbed Effect (crit hits/s × 2 s), Bull's Rage's Euphoria (6 s per Activation Medium trigger or cooldown), Periodic Burst (2 s per 6 s or the Mobility cooldown)?",
    evidence: "provisional",
    current: "Provisional (2026-10-14): uptime from the planner's measured hit rates and cooldowns, capped at 100%.",
    alternatives: [
      { reading: "The buff refreshes less often than the rate suggests", effect: "a lower uptime share for that buff" },
    ],
    test: "Watch each buff icon over a 20 s dummy run and time how long it is up.",
    source: "CLAUDE.md (rate-driven buffs 2026-10-14)",
    appliesWhen: (ctx) =>
      [ctx.planner.critNumbedBuffs, ctx.planner.empowerEffects, ctx.planner.periodicBurst].some(
        (state) => activeEntries(state).length > 0,
      ),
  },
  {
    id: "shotgun-fan-count",
    title: "How many projectiles of a fan reach the dummy?",
    question:
      "Standing close, how many projectiles of this skill's fan hit the dummy? Only Chromatic Shot was measured.",
    evidence: "provisional",
    current:
      "Provisional: about half land standing close, ceil(n / 2), and one at range (observed for Chromatic Shot only).",
    alternatives: [
      { reading: "All projectiles land when close", effect: "more Shotgun hits, each at the falloff coefficient" },
      { reading: "Only one lands", effect: "a single hit per cast" },
    ],
    test: "Within 6 m, count the damage numbers per cast on the dummy, with and without Multiple Projectiles.",
    source: "CLAUDE.md (Shotgun Effect); src/engine/combat/shotgun-effect.js",
    appliesWhen: (ctx) =>
      ctx.components.some(
        ({ hit, component }) =>
          hit.name !== "Chromatic Shot" &&
          ["fan", "half"].includes(component.shotgun?.reach) &&
          (component.shotgun?.count || 0) > 1,
      ),
  },
  {
    id: "pantheon-swiftness-aura-effect",
    title: "Pantheon's Elegy: scaled by Aura Effect?",
    question:
      "Is Precise: Swiftness's gained \"+120% Attack and Cast Speed\" scaled by that Aura's Aura Effect, like its base values?",
    evidence: "provisional",
    current: "Provisional: yes, scaled by the Aura's Aura Effect (precedent: Deep Pain takes the general Aura Effect).",
    alternatives: [{ reading: "A flat +120%, not scaled", effect: "lower Cast Speed with Aura Effect sources" }],
    test: "Read the panel's Cast Speed with and without an Aura Effect source (for example Aura Amplification) on Precise: Swiftness.",
    source: "CLAUDE.md (Pantheon's Elegy, 2026-10-15)",
    appliesWhen: (ctx) =>
      ctx.hasItem("Pantheon's Elegy") &&
      (ctx.setupNames.has("Precise: Swiftness") || ctx.hasText(/Precise: Swiftness/i)),
  },
  {
    id: "dance-lv5-value",
    title: "Dance of the Deep at LV.5: +1% or 0?",
    question: "At base trait level 5, is the Terra Skill Damage line +1% additional (TLIDB) or 0 (patch notes)?",
    evidence: "provisional",
    current: "Provisional (TLIDB, user decision 2026-10-15): +1% additional Terra Skill Damage.",
    alternatives: [{ reading: "0 at LV.5", effect: "about ×0.99 on Terra hits" }],
    test: "Read the LV.5 base trait tooltip in game.",
    source: "CLAUDE.md (Dance of the Deep base trait)",
    appliesWhen: (ctx) => Boolean(dance(ctx)) && (ctx.planner.heroMemories?.baseTraitLevel || 0) >= 5,
  },
  {
    id: "crimson-gash-hits",
    title: "Crimson Gash on Terra hits",
    question:
      "How do Gash stacks (+12% additional Terra Skill Damage each, up to 8, 3 s) apply to Terra hits? Does each stack keep its own timer?",
    evidence: "unknown",
    current:
      "Unknown: the damage part is not modeled on hits (it never reaches a Terra skill's own DoT). Its −40% Terra Charge recovery per stack is modeled.",
    alternatives: [
      {
        reading: "Every Terra hit takes the held stacks",
        effect: "×1.12 per held stack on Terra hits (×2.48 at 8 stacks)",
      },
    ],
    test: "Compare a Terra hit's damage number at 0 Gash stacks and at several stacks.",
    source: "CLAUDE.md (Crimson Gash); research/selena-traits-2026-10-13.md",
    appliesWhen: (ctx) =>
      ctx.hasItem("Crimson Gash") &&
      Boolean(dance(ctx)?.mainIsTerra) &&
      ctx.skillHits.some((hit) => (ctx.skillHitSetup(hit)?.tags || []).includes("Terra")),
  },
  {
    id: "wind-rhythm-terra",
    title: "Wind Rhythm on a Terra: does Cast Speed speed it up?",
    question:
      "Does Activation Medium: Wind Rhythm recast the Terra every cooldown ÷ (1 + Cooldown Recovery + share × Cast Speed)?",
    evidence: "provisional",
    current:
      "Provisional (DonTheCrown's Selena DoT sheet v0.3): yes, with the planner's own Cast Speed for the skill. This cadence feeds The Cycle I Resist and Terra Charge.",
    alternatives: [
      {
        reading: "Cast Speed does not shorten the trigger interval",
        effect: "far fewer recasts (about 9.5 → 2 per second on the Frost Terra v2 build)",
      },
    ],
    test: "Count Terra casts over 10 s with Wind Rhythm, then add or remove a Cast Speed source.",
    source: "CLAUDE.md (Wind Rhythm on a recast Terra DoT); research/donthecrown-selena-calc-v0.3.md",
    appliesWhen: (ctx) => Object.keys(ctx.planner.windRhythmTerra || {}).length > 0,
  },
  {
    id: "terra-charge-restoration-gap",
    title: "Terra Charge Restoration: +10% unaccounted",
    question:
      "On the Frost Terra v2 build the panel reads 115.5% Terra Charge Restoration; the planner finds 105.5% (Growth Ring 30 + Ground Divide 75.5). Where do the other +10% come from?",
    evidence: "unknown",
    current: "Unknown: only the listed sources are counted.",
    alternatives: [{ reading: "A missing +10% source", effect: "slightly faster Terra Charge" }],
    test: "Remove items, slates and kismets one at a time and watch the panel's Terra Charge Restoration.",
    source: "CLAUDE.md (item-granted supports, Frost Terra v2)",
    appliesWhen: (ctx) => Boolean(dance(ctx)?.mainIsTerra) && (dance(ctx)?.charges?.recoverySources || []).length > 0,
  },
  {
    id: "ill-omen-reap-purification",
    title: "Ill Omen with Reap Purification on a Boss",
    question:
      "With Reap Purification, does every Ill Omen stack deal 2.5% Max Life as True Damage on a Boss continuously, bypassing the once-only Boss rule?",
    evidence: "provisional",
    current: "Provisional (the user's source): yes, continuous on every tier.",
    alternatives: [{ reading: "The Boss lockout still applies", effect: "Ill Omen fires once on a Boss" }],
    test: "A long Boss or dummy run with Reap Purification, watching for repeated True Damage numbers.",
    source: "src/engine/ailments/ill-omen.js; research/google-ai-mode-answers-2026-10-13.md",
    appliesWhen: (ctx) => Boolean(ctx.planner.illOmen?.reapPurification?.active),
  },
  {
    id: "trauma-town-sheet-gap",
    title: "Trauma: town sheet additional damage",
    question:
      "The in-game town sheet's general additional damage (3457%, ×35.57 on the Trauma fixture) is far below the planner's hit ledger (×229). Which combat layers does the game leave out of that line?",
    evidence: "unknown",
    current:
      "Unknown: the ledger keeps the combat layers (Tide, Idyll, Aim, Blur, Supercharge, Focus Blessing, Feud); nothing fitted.",
    alternatives: [{ reading: "The town sheet only excludes combat buffs", effect: "no change to dummy figures" }],
    test: "The in-game breakdown of the additional damage line in town and in combat.",
    source: "CLAUDE.md (generic ailment engine, open gap)",
    appliesWhen: (ctx) => Boolean(ctx.ailments.trauma?.modeled),
  },
  {
    id: "bard-song-non-channeled",
    title: "Bard Song on non-channeled skills",
    question:
      "In Bard, non-channeled skills channel Bard Song into a bubble that uses the skill. What are its channel interval and max stacks, and does that use count as Channeled?",
    evidence: "unknown",
    current: "Unknown: not modeled; those skills keep their normal casts.",
    alternatives: [
      {
        reading: "Bard Song changes their cadence and takes the −20% Channeled penalty",
        effect: "lower damage for these skills; size unknown",
      },
    ],
    test: "Time the Bard Song bubbles for one of these skills and compare its damage with and without Bard.",
    source: "research/selena-traits-2026-10-13.md (T5, Q3)",
    appliesWhen: (ctx) =>
      ctx.heroId === "selena-sing-with-the-tide" && (ctx.planner.singWithTheTide?.bardSong?.skills || []).length > 0,
  },
  {
    id: "scorching-beam-bard-residual",
    title: "Scorching Beam: Bard bubble share",
    question:
      "The Bard bubble part of Scorching Beam comes from a no-gear calibration, scaled to this build's Fire Resistance and Scorch uptime. Does it scale that way?",
    evidence: "provisional",
    current:
      "Provisional: the measured Bard residual, with Fire Resistance scaled from the level-85 dummy calibration (30%) and Scorch uptime estimated from chance and duration.",
    alternatives: [
      {
        reading: "The bubble scales differently with resistance and Scorch",
        effect: "only the Bard-related part of the beam figure moves",
      },
    ],
    test: "A Scorching Beam dummy run in Bard with Scorch on and off.",
    source: "src/engine/skills/scorching-beam-delivery.js; research/dummy-54s-gap-2026-10-09.md",
    appliesWhen: (ctx) =>
      ctx.heroId === "selena-sing-with-the-tide" &&
      ctx.setupNames.has("Scorching Beam") &&
      Boolean(ctx.planner.bardDelivery?.applicable) &&
      Boolean(ctx.planner.bardDelivery?.extrapolatedConditions),
  },
  {
    id: "follower-affix-third-slot",
    title: "Tartarus Skill: what can the third support slot hold?",
    question:
      "A tier III Tartarus Skill has two random support slots and an 'Empty Support Skill Slot or Random Support Skill'. Does that third slot roll from the skill's Drop pool when it drops, and does Tempering fill an empty one from the Forge pool only?",
    evidence: "provisional",
    current:
      "Provisional: the third slot takes either a Drop affix (rolled on drop) or a Forge affix (Tempering), so the planner offers both pools there and only the Drop pool in the first two slots (TLIDB pools; game text: Tempering has a 20% chance to fill the empty slot).",
    alternatives: [
      {
        reading: "The third slot only ever holds a Tempering (Forge) affix",
        effect: "Drop affixes leave the third slot's list",
      },
      {
        reading: "Tempering can roll any affix of the skill",
        effect: "Forge affixes also join the first two slots' lists",
      },
    ],
    test: "Look at a few tier III Tartarus Skills that dropped with a filled third slot, and at one Tempered skill: which affixes appear in the third slot?",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => followerAffixes(ctx).some((item) => item.slot === 2),
  },
  {
    id: "follower-affix-pain-amplification",
    title: "Pain Amplification (follower): whose Affliction, and does the DoT taken reach you?",
    question:
      "The follower skill's Pain Amplification clears 10 Affliction when it deals damage (every 2 s) and gives +12% additional Damage Over Time taken for 8 s. Does it clear your Affliction on the dummy, and does the +12% reach your damage over time?",
    evidence: "unknown",
    current: "Not modeled: neither the Affliction clear nor the +12% Damage Over Time taken is applied.",
    alternatives: [
      {
        reading: "+12% DoT taken reaches your DoT; the clear touches only the follower's own Affliction",
        effect: "about ×1.12 on your damage over time while the follower hits",
      },
      {
        reading: "It also clears 10 of your Affliction every 2 s",
        effect: "your Affliction average drops; the net effect depends on your Affliction rate",
      },
    ],
    test: "Dummy run with a DoT build: the follower skill with and without Pain Amplification, comparing the Affliction readout and the damage.",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => hasFollowerAffix(ctx, "Pain Amplification"),
  },
  {
    id: "follower-scorching-pulse-stacks",
    title:
      "Scorching Pulse (follower): how long does each Reaping Duration stack last, and how fast does the follower Reap?",
    question:
      "Origin Tartarus: Scorching Pulse gives '+30% Reaping Duration for the Follower and allies for each Reaping dealt recently. Stacks up to 10'. Does each stack keep its own 4 s, or does a new stack refresh all of them? And are the follower's Reap sources read right: Rekindled Embers' extra cast (no cast time, cooldown untouched, nothing rolled inside its 1 s gate), Reaping Agony (one Reap per 1 s per copy while the follower's DoT is on the dummy) and Rising Heat (+3% per whole +5% of your Reaping Recovery Speed)?",
    evidence: "game data (partial)",
    current:
      "Game data: the stack affix (16649485) fires on the follower's own Reaping event (trigger 1000032), so your Reaps add none, and grants a 4 s stack (node 306, stacking mode 3, up to 10) to the follower and its allies. The planner reads each stack as keeping its own 4 s: stacks = min(10, the follower's Reaps in the last 4 s), with Reaps/s = its Scorching Pulse casts + Rekindled Embers' extra casts (20% per cast, p ÷ (1 + p × casts inside the 1 s gate)) + 1 per second per Reaping Agony while its DoT is up (ceil(DoT s ÷ 1 s) per DoT window otherwise). Base cadence: 1 stack (+30%). The 5 s / 20 s windows build the stacks from 0. Rising Heat adds min(300, 3 × whole 5% steps of your Reaping Recovery Speed) to the follower's Reap duration only.",
    alternatives: [
      {
        reading: "Each new stack refreshes all stacks",
        effect:
          "a follower that Reaps more often than every 4 s (Cooldown Reduction, Rekindled Embers, Reaping Agony) builds to 10 stacks: up to +300%",
      },
      {
        reading: "Rekindled Embers' extra cast resets or uses the cooldown, or rolls again",
        effect: "fewer or more extra casts than 20% of the follower's casts",
      },
      {
        reading: "Reaping Agony's 1 s gate is shared by all copies, or Reaps whenever any follower damage ticks",
        effect: "at most 1 Reap a second from Reaping Agony in total, or more than 1 per copy",
      },
      {
        reading: "Rising Heat scales smoothly (3/5 per 1%) rather than per whole 5%",
        effect: "up to +2.4% more on the follower's Reap duration",
      },
    ],
    test: "Equip Origin Scorching Pulse on a Witch Rat and hit the dummy with a DoT build. Count the Reaping Duration buff stacks next to your buff bar: about 1 at the base cadence; then add Cooldown Reduction / Rekindled Embers / Reaping Agony (with a follower DoT such as Black Hole or Additional Ignite) and check whether the count matches 4 × the follower's Reaps per second or climbs to 10.",
    source: "research/followers/scorching-pulse-2026-10-19.md",
    appliesWhen: (ctx) =>
      (ctx.planner.follower?.selection?.skills || []).some(
        (entry) => entry.skill?.name === "Origin Tartarus: Scorching Pulse",
      ),
  },
  {
    id: "follower-affix-catalyst",
    title: "Catalyst (follower): whose Affliction rises?",
    question:
      "Catalyst on a follower skill reads '+50 Affliction inflicted per second'. Is that the follower's own Affliction rate, or does it raise the Affliction on the dummy that your damage over time reads?",
    evidence: "unknown",
    current: "Not modeled: no Affliction is added.",
    alternatives: [
      {
        reading: "It adds to the dummy's Affliction your DoT reads",
        effect: "a higher Affliction average for your damage over time",
      },
    ],
    test: "Dummy run with a DoT build: the Affliction readout with the follower skill with and without Catalyst.",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => hasFollowerAffix(ctx, "Catalyst"),
  },
  {
    id: "follower-special-plague",
    title: "Plague (ULT follower): whose Wilt gains the Non-Erosion Damage taken?",
    question:
      "The Plague letter's special effect reads '-30% additional Wilt Duration' and 'Inflicted Wilt gains an additional effect: +1% additional Non-Erosion Damage taken (multiplies)'. Does it act on your Wilt on the dummy or only on Wilt the follower inflicts, and is the +1% per Wilt stack?",
    evidence: "game data (partial)",
    current:
      "Not modeled: neither line is applied (game modifier 600000008 stores -30 and 1; the follower's Witch Rat skills inflict no Wilt unless a support affix adds a Wilt chance).",
    alternatives: [
      {
        reading: "Your Wilt gains it, +1% per stack (multiplies)",
        effect: "up to about ×1.35 on your non-Erosion damage at 30 Wilt stacks, and your Wilt lasts 30% less",
      },
      {
        reading: "Only the follower's own Wilt gains it",
        effect: "nothing for a build whose follower inflicts no Wilt",
      },
    ],
    test: "Dummy run with a Wilt build and a non-Erosion hit: the Plague follower against another Witch Rat letter, comparing the hit damage and the Wilt duration.",
    source: FOLLOWER_LETTER_NOTES,
    appliesWhen: (ctx) => ctx.planner.follower?.selection?.follower?.id === "plague",
  },
  {
    id: "follower-special-barbarian-intimidation",
    title: "Wild Barbarian King (ULT follower): whose Steep Strike inflicts Barbarian Intimidation?",
    question:
      "The Wild Barbarian King letter's special effect 'Inflicts Barbarian Intimidation on enemies when Steep Strike hits an enemy' (game buff: +15% additional Critical Strike Damage taken for 5 s). Do your Steep Strikes inflict it, or only the follower's own (its Mammoth skills launch none)?",
    evidence: "game data (partial)",
    current:
      "Not modeled: no Critical Strike Damage taken is applied (the value is from the game's buff data; TLIDB does not publish it).",
    alternatives: [
      {
        reading: "Your Steep Strikes inflict it",
        effect:
          "+15% additional Critical Strike Damage taken on the crit share of your hits while you land Steep Strikes",
      },
    ],
    test: "Dummy run with a Steep Strike build and crits: the Wild Barbarian King follower against another Mammoth letter, comparing the crit damage.",
    source: FOLLOWER_LETTER_NOTES,
    appliesWhen: (ctx) => ctx.planner.follower?.selection?.follower?.id === "wild-barbarian-king",
  },
  {
    id: "bing-creative-genius-sixth-rank",
    title: "Bing – Creative Genius: do the traits reach a sixth rank?",
    question:
      "With the base trait's Artificial Moon line \"+1 to Non-Base Hero Trait Level\" active, do Creative Genius's 45 / 60 / 75 traits go past level 5 to their sixth value?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit Q-H2, recommended reading): the moon line adds +1 to every non-base trait and opens a level cap of 6 for Bing – Creative Genius only (the game tier table holds ranks 1–6 and TLIDB prints six values); the sixth value is read from the trait text. Other heroes stay capped at 5.",
    alternatives: [
      {
        reading: "The cap stays 5 (the +1 only helps traits below level 5)",
        effect: "each maxed trait reads its fifth value instead of the sixth",
      },
    ],
    test: "Equip an Artificial Moon memory and a base-slot memory that takes the base trait to LV.5, with Ultimate 50 memories (+2 to Hero Trait Level) in the 45 / 60 / 75 slots; read a trait's level and value in the game tooltip (LV.6 and the sixth value, or LV.5).",
    source: `${HERO_TRAIT_AUDIT} (F2, Q-H2)`,
    appliesWhen: (ctx) => ctx.heroId === "bing-creative-genius" && Boolean(ctx.planner.heroMemories?.artificialMoon),
  },
  {
    id: "hero-exclusive-revived-affixes",
    title: "Hero-exclusive revived affixes: which loadout, and only one revived memory?",
    question:
      'Does a hero-exclusive revived affix ("Hero Trait Exclusive: …") work only while that loadout is selected, and does only one revived memory count, so it and an Artificial Moon memory exclude each other?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit Q-H11, recommended reading): its lines apply only while the selected loadout matches the \"Hero Trait Exclusive\" line, and only the first revived memory in slot order (Lv45, Lv60, Lv75) counts (the app already allows only one). Lines a generic reader takes are in calc (for example Sweet Pain's conversion and Corrosion Focus, The Place of Oracle's Max Blessing Stacks); lines that need a hero engine are badged Not modeled and wait for that hero's batch.",
    alternatives: [
      {
        reading: "The affix works on any loadout of the hero",
        effect: "its plain lines would also apply on the hero's other loadouts",
      },
      {
        reading: "An Artificial Moon memory and an exclusive revival can both be active",
        effect: "the base trait's Artificial Moon lines would apply together with the revival",
      },
    ],
    test: "Equip the memory on its loadout and on another loadout of the same hero, and compare the character panel or a dummy run; then try to equip an Artificial Moon memory beside it.",
    source: `${HERO_TRAIT_AUDIT} (F3, Q-H11)`,
    appliesWhen: (ctx) => equippedExclusiveRevivals(ctx).length > 0,
  },
  // Hero trait audit batch B2 (2026-10-19): plain trait wordings read with a provisional reading, each shown only while the trait is picked.
  {
    id: "erika-twinblade-dual-wield-speed",
    title: "Twinblade Onslaught: which Attack Speed bonus does it remove?",
    question:
      '"No additional Attack Speed bonus is granted while Dual Wielding. Instead, +X% additional Attack Damage": does it remove only the Dual Wielding status\'s +10% additional Attack Speed, or also "+X% Attack Speed while Dual Wielding" lines from gear and talents?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2): the Dual Wielding status's +10% additional Attack Speed is dropped (its sibling line drops the status's Attack Block Chance); other \"while Dual Wielding\" Attack Speed lines still apply; +X% additional Attack Damage while Dual Wielding (game affix 15625477).",
    alternatives: [
      {
        reading: "Every Attack Speed bonus tied to Dual Wielding is removed",
        effect: 'gear / talent "+X% Attack Speed while Dual Wielding" lines would stop applying',
      },
    ],
    test: 'Dual wield with and without the trait, once with a "+X% Attack Speed while Dual Wielding" item, and read the character panel\'s Attack Speed.',
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "erika-vendettas-sting", "Twinblade Onslaught"),
  },
  {
    id: "carino-endless-frenzy-knockback",
    title: "Endless Frenzy: which Knockback distance counts?",
    question:
      '"For every +1% Knockback distance, +0.6% additional damage": does it count only the build-wide "+X% Knockback distance" lines, or also Knockback distance scoped to the supported skill?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B2; game affix 914731264 converts attribute 34301 to additional damage, up to 100 stacks): the build-wide "+X% Knockback distance" lines are summed; "for the supported skill" lines are not counted.',
    alternatives: [
      {
        reading: "Skill-scoped Knockback distance counts too",
        effect: "a Knockback support on the Main Skill would add stacks",
      },
    ],
    test: 'Pick Endless Frenzy, add a "+X% Knockback distance for the supported skill" support, and compare the character panel\'s additional damage.',
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "carino-zealot-of-war", "Endless Frenzy"),
  },
  {
    id: "thea-prophecy-of-truth-slates",
    title: "Prophecy of Truth: do slate Legendary Medium Talents count?",
    question:
      '"+3% additional damage for each Legendary Medium Talent allocated": do Legendary Medium Talents granted by Divinity Slates count, or only the ones allocated on the talent panels?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2; game affix 15579581): only allocated talent-panel nodes of the Legendary Medium type count (replaced nodes left out), up to the cap.",
    alternatives: [
      {
        reading: "Slate Legendary Medium Talents count too",
        effect: "builds with Divinity Slate Legendary Medium Talents would reach the cap sooner",
      },
    ],
    test: "Pick Prophecy of Truth, equip a slate with a Legendary Medium Talent, and compare the character panel's additional damage with and without it.",
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "thea-wisdom-of-the-gods", "Prophecy of Truth"),
  },
  {
    id: "thea-divine-spirit-outside-realm",
    title: "Divine Spirit: outside the Divine Realm, and how is Missing Life counted?",
    question:
      'Divine Spirit\'s "+2.3% damage for every 3% Missing Life when outside the Divine Realm": on the training dummy, are you outside the Realm while it is on the dummy, and does Missing Life count whole 3% steps?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B2): Missing Life is the Life-lost state (0 unless the Life group assumes Low Life: 65% lost), counted in whole 3% steps (21 steps); it applies while you stand outside the Realm, the "Divine Realm position" choice (outside by default, compared by damage; hero trait audit B7). Its "additional damage taken" line is your own defence: no DPS effect.',
    alternatives: [
      { reading: "You stand inside the Realm on the dummy", effect: "the line would not apply" },
      { reading: "Missing Life counts in fractions of 3%", effect: "slightly more damage (21.67 steps)" },
    ],
    test: "With Life lowered to a known share, read the character panel's damage bonus inside and outside the Divine Realm.",
    source: `${HERO_TRAIT_AUDIT} (§5 B2, Q-H9)`,
    appliesWhen: (ctx) => traitPicked(ctx, "thea-incarnation-of-the-gods", "Divine Spirit"),
  },
  {
    id: "moto-radiation-field-auras",
    title: "Radiation Field: which Auras count?",
    question:
      '"+8% additional damage for every Aura affecting you and your Minions" and "+10% additional Attack and Cast Speed when you or your Minions are affected by an Aura": does the count include Auras from other sources (items, followers, Minions), and are your Minions always inside your Auras?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2; game affixes 14298797 and 8377909, copied to the Minions): your active Aura types count (as the other per-Aura lines); your Minions stand inside them (best case), so the Minions get the same bonus.",
    alternatives: [
      { reading: "Each Aura counts once for you and once for your Minions", effect: "twice the count" },
      { reading: "Minions outside the Aura radius", effect: "the Minion share would be lower" },
    ],
    test: "Pick Radiation Field with one and then two Auras active, and read the character panel's additional damage and Attack Speed.",
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "moto-order-calling", "Radiation Field"),
  },
  {
    id: "iris-world-within-resistance",
    title: "World Within: which resistance value, and which Magus reads Armor?",
    question:
      '"For every 1% Fire, Cold, Lightning or Erosion Resistance, or every 500 Armor, +1% chance for the corresponding Spirit Magi to use an Enhanced Skill": is the resistance the capped (effective) value or the uncapped total, and is the Rock Magus the one that reads Armor?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2; game affix 9009957): Fire Magus reads Fire, Frost Magus Cold, Thunder Magus Lightning, Erosion Magus Erosion Resistance (effective, capped, negative as 0), Rock Magus Armor (stat-sheet pool without Aura buffs); whole steps, up to +60%.",
    alternatives: [
      { reading: "The uncapped resistance total", effect: "builds over the resistance cap would reach +60% sooner" },
    ],
    test: "Summon one Magus with a known resistance above and below the cap, and count its Enhanced Skill casts on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "iris-growing-breeze", "World Within"),
  },
  {
    id: "rosa-unsullied-blade-spell-to-attack",
    title: "Unsullied Blade: which Spell Damage bonuses reach Attacks?",
    question:
      '"Bonus and additional bonus to Spell Damage also apply to Attack Damage": which lines does the game copy (every Spell Damage line from gear, talents, Auras and conditions, typed ones such as "Spell Fire Damage"), and does a skill with both tags take a line twice?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2; game affix 101070122): every damage line scoped to Spell alone (increased and additional, typed ones included, resolved conditional bodies and the Aura ledger's Spell lines) also reaches Attack skills as the same line with Attack for Spell; Spell crit, speed and Minion lines are not copied.",
    alternatives: [
      {
        reading: "Only the base trait's own Spell bonus is shared",
        effect: "gear and talent Spell Damage would not reach attacks",
      },
    ],
    test: 'Equip a "+X% Spell Damage" item on an attack build with Unsullied Blade and compare the attack\'s tooltip damage with and without it.',
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "rosa-unsullied-blade" &&
      ctx.hasText(/^Bonus and additional bonus to Spell Damage (?:and )?also apply to Attack Damage$/i),
  },
  {
    id: "gemma-ice-to-blaze-fixed-resistance",
    title: 'Ice to Blaze: what does "fixed" Fire Resistance ignore?',
    question:
      '"The Fire Resistance of Frostbitten enemies is fixed at -5%": does the fixed value ignore every resistance reduction (Scorch, Fire\'s Allure, max-Affliction lines) while penetration still applies, and which wins if Fueling also fixes it at 0?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B2; game affix 514114784): while the dummy is Frostbitten its Fire Resistance is the fixed value, no reduction changes it, penetration still applies (the Fueling reading); Fueling's 0 wins over it.",
    alternatives: [
      {
        reading: "Reductions still apply on top of the fixed value",
        effect: "lower Fire Resistance with Scorch or Fire's Allure",
      },
    ],
    test: "Frostbite the dummy with Ice to Blaze, with and without a Fire Penetration line and a Scorch source, and compare Fire hit damage.",
    source: `${HERO_TRAIT_AUDIT} (§5 B2)`,
    appliesWhen: (ctx) => traitPicked(ctx, "gemma-ice-fire-fusion", "Ice to Blaze"),
  },
  // Hero trait audit B3 (2026-10-19; src/engine/heroes/gemma-traits.js, src/engine/heroes/hero-trait-modules.js): Gemma's provisional readings.
  {
    id: "gemma-frostfire-rampage-cycle",
    title: "Frostfire Rampage: do casts during the cooldown count?",
    question:
      '"Enters Frostfire Rampage after casting Fire or Cold Skills 5 time(s)" with a 10 s cooldown: do casts made during the cooldown (and during the Rampage) count toward the next 5, and do general Skill Effect Duration and Cooldown Recovery Speed lines change the Rampage?',
    evidence: "game code (not tested)",
    current:
      "Provisional (Q-H4; the game record adds 1 to a counter on every cast and fires the Rampage behind a cooldown check): one Rampage every max(cooldown, 5 casts ÷ Fire / Cold casts per second); cooldown 10 s ÷ ((1 + Frostfire Rampage Cooldown Recovery Speed) × (1 + additional)); duration 5 s × (1 + Frostfire Rampage Duration); only the Frostfire-scoped lines are read; with own buffs pre-built the first Rampage starts at t = 0. Ice-Fire Radiance's end bonus fades linearly over 3 s.",
    alternatives: [
      {
        reading: "Only casts after the cooldown ends count",
        effect: "a slower cycle: 5 casts after each cooldown, lower uptime for slow casters",
      },
      {
        reading: "General Skill Effect Duration / Cooldown Recovery Speed also apply",
        effect: "a longer or more frequent Rampage",
      },
    ],
    test: "Cast a Cold skill at a steady rate on the dummy and time the Rampage icon's start and end over a few cycles, with and without Restless Ice-Fire.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H4, §5 B3)`,
    appliesWhen: (ctx) => traitPicked(ctx, "gemma-ice-fire-fusion", "Ice-Fire Fusion"),
  },
  {
    id: "gemma-cold-pulse-cadence",
    title: "Cold Pulse: cadence, Frostbite and its own damage",
    question:
      "Cold Pulse fires on Cold Damage every 4 s: does its Frostbite stay on the dummy between pulses, how much damage does the pulse itself deal, and does Blooming Frost Flower's extra pulse fire on the pulse's own Frostbite?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B3): a pulse every 4 s (Dance of Frost: 2 s) from the first Cold hit; Frostbite held between pulses; the pulse's own damage is not published and not counted; Blooming adds a pulse with each Frostbite infliction at most every 2 s (with each base pulse, or every 2 s with another Frostbite source on hit); Dance of Frost's stacks count the pulse hits in the last 8 s (up to 4); Frigid Infusion's -45% Cold Resistance is applied as resistance − 45 for the time it is up.",
    alternatives: [
      {
        reading: "Frostbite expires between 4 s pulses",
        effect: "lower Cold Damage taken without another Frostbite source",
      },
      { reading: "Cold Pulse deals damage of its own", effect: "more damage than the planner shows" },
    ],
    test: "Hit the dummy with a Cold skill and Frostbitten Heart only, and watch the Frostbite icon and the pulse's damage numbers over 10 s.",
    source: `${HERO_TRAIT_AUDIT} (§5 B3)`,
    appliesWhen: (ctx) => traitPicked(ctx, "gemma-frostbitten-heart", "Frostbitten Heart"),
  },
  {
    id: "gemma-first-flake-deemed-rating",
    title: "First Flake of Strange Snow: how is the deemed Frostbite Rating counted?",
    question:
      '"Each type of Crowd Control Effect, Ailment, and Curse afflicting an enemy is deemed to have 50 additional Frostbite Rating, up to 350": does the deemed rating add on top of the inflicted rating past its cap, is the 350 a cap on the deemed part or on the total, does it count toward Freeze, and does Frostbite (both an Ailment and a Crowd Control Effect) count once or twice?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B3): +50 per distinct type (each ailment, Paralysis, each curse; Frostbite and Freeze once each), the deemed part capped at 350 and added on top of the inflicted rating; it counts for Freeze; -50% additional Frostbite Effect multiplies the Frostbite Effect.",
    alternatives: [
      { reading: "350 caps the total rating", effect: "lower Cold Damage taken with many types" },
      { reading: "Frostbite counts as both an Ailment and a Crowd Control type", effect: "+50 more rating" },
    ],
    test: "With First Flake equipped, Frostbite the dummy with one and then two curses active and read the Cold hit damage (or the dummy's Frostbite Rating).",
    source: `${HERO_TRAIT_AUDIT} (§5 B3)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "gemma-frostbitten-heart" && ctx.hasText(/deemed to have \d+ additional Frostbite Rating/i),
  },
  {
    id: "gemma-purgatory-charges",
    title: "Purgatory charges and Infernal Damnation's ramp",
    question:
      "With +1 Max Purgatory Charges, do the charges recover one at a time (so the long-run uptime stays duration ÷ cooldown) or together? Does Infernal Damnation count whole seconds active (+10% at 1 s, +20% at 2 s, …)?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B3): charges recover one at a time on the 8 s cooldown, so only the 5 s / 20 s windows gain (a Purgatory is recast at once while a charge is ready); Infernal Damnation's stacks are the whole seconds since the current Purgatory was cast, reset by each new cast.",
    alternatives: [
      {
        reading: "Charges recover in parallel",
        effect: "Purgatory held all the time with Groaning Echo (uptime 100%)",
      },
      { reading: "Infernal Damnation grows continuously", effect: "about +5% more on average" },
    ],
    test: "With Groaning Echo, time how long Purgatory stays down between casts over 40 s on the dummy; with Infernal Damnation, read the buff's stacks each second.",
    source: `${HERO_TRAIT_AUDIT} (§5 B3)`,
    appliesWhen: (ctx) =>
      traitPicked(ctx, "gemma-flame-of-pleasure", "Groaning Echo") ||
      traitPicked(ctx, "gemma-flame-of-pleasure", "Infernal Damnation"),
  },
  {
    id: "gemma-banquet-scorch",
    title: "Banquet of Bliss: the Lv. 40 Scorch value and curse slot",
    question:
      '"Enemies within range of Purgatory are cursed by Lv. 40 Scorch": what is Scorch\'s Fire Damage taken at Lv. 40, and does this Scorch take one of your curse slots?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B3): Scorch's value from the Lv20 (39%) and Lv31 (45%) records, extended linearly (Lv40 ≈ 49.9%), × (1 + Curse Effect), at the Purgatory uptime; it takes no curse slot; a Scorch skill already on the dummy is the same curse (no second copy). Standing beyond 1 m (no -30% damage taken) is a best-case switch.",
    alternatives: [{ reading: "The Scorch takes a curse slot", effect: "a skill curse beyond the limit would drop" }],
    test: "With Banquet of Bliss, read Scorch's tooltip on the dummy (or compare Fire hit damage inside and outside Purgatory).",
    source: `${HERO_TRAIT_AUDIT} (§5 B3)`,
    appliesWhen: (ctx) => traitPicked(ctx, "gemma-flame-of-pleasure", "Banquet of Bliss"),
  },
  {
    id: "gemma-dress-licker-conversion",
    title: "Dress Licker: what does the Physical → Fire taken conversion change?",
    question:
      '"Converts 100% of Physical Damage taken by enemies within the range of Purgatory to Fire Damage": does the converted damage take the dummy\'s Fire Resistance and Fire Damage taken debuffs instead of its Armor, and does it also convert Physical damage over time (Trauma)?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B3): on skill hits only, the Physical share × Purgatory uptime is taken as Fire (Fire Resistance, non-Physical armour, Fire Damage taken debuffs; the player's own Physical bonuses already applied); Physical damage over time keeps its Physical mitigation.",
    alternatives: [
      {
        reading: "Physical damage over time converts too",
        effect: "Trauma and Physical DoTs would take Fire Resistance",
      },
    ],
    test: "Hit the dummy with a Physical attack inside and outside Purgatory with Dress Licker, and compare the damage numbers.",
    source: `${HERO_TRAIT_AUDIT} (§5 B3)`,
    appliesWhen: (ctx) => traitPicked(ctx, "gemma-flame-of-pleasure", "Dress Licker"),
  },
  // Hero trait audit B4 (2026-10-19; src/engine/heroes/youga-spacetime.js, src/engine/heroes/hero-trait-modules.js): Youga – Spacetime Illusion and Spacetime
  // Elapse's provisional readings (Q-H5, Q-H6).
  {
    id: "youga-illusion-rate",
    title: "Spacetime Illusion: how often does it cast with Eeeendless Mana or Make it Quick?",
    question:
      'With Eeeendless Mana ("no longer has Cast Frequency limitations"), how many times per second does the Spacetime Illusion use your Main Skill? With Make it Quick as well ("no longer has casting actions"), is there any limit left?',
    evidence: "provisional",
    current:
      "Provisional (Q-H5): without Eeeendless Mana the Illusion uses the Main Skill (1 + Cast Frequency) ÷ 1.5 s per Illusion; with Eeeendless Mana it casts with its own casting action at your Main Skill cast rate (for a slow skill this is fewer uses than the Cast Frequency rate); with Make it Quick as well the planner keeps that rate and does not model an unlimited one. Make it Quick alone changes no figure (the Illusion's casting action is not modeled).",
    alternatives: [
      {
        reading: "Eeeendless Mana keeps the Cast Frequency rate as a minimum",
        effect: "never fewer Illusion uses than without it",
      },
      {
        reading: "With both traits the Illusion casts as fast as the server allows",
        effect: "far more Illusion damage than the planner shows",
      },
    ],
    test: "Count the Illusion's casts on the dummy over 10 s with Eeeendless Mana, then with Eeeendless Mana and Make it Quick, and compare with your own cast rate.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H5, §5 B4)`,
    appliesWhen: (ctx) =>
      traitPicked(ctx, "youga-spacetime-illusion", "Eeeendless Mana") ||
      traitPicked(ctx, "youga-spacetime-illusion", "Make it Quick"),
  },
  {
    id: "youga-illusion-stacks",
    title: "Spacetime Illusion: Cooldown, Cast Frequency and Mana stacks",
    question:
      "How are Me and Myself's steps counted (+5% Cooldown Recovery Speed and 2.5% additional each in whole steps, or one combined count), how many I'm Out of Mana stacks does the Illusion hold (how long is \"recently\"), and do Eeeendless Mana's and Make it Quick's additional Illusion Damage add together?",
    evidence: "game data (partial)",
    current:
      "Provisional (hero trait audit B4; game records 1300001 / 1300011 / 1300021 / 1300022 / 1300032): the moon's +1.5% Cooldown Recovery Speed stacks = min(10, casts per second by you and the Illusion × 8 s); Me and Myself counts whole steps of +5% increased (the stat sheet plus the moon) and 2.5% additional separately; I'm Out of Mana's stacks = min(10, Illusion casts per second × 4 s) with Mana always sufficient; Eeeendless Mana's and Make it Quick's conversions add into one additional Illusion Damage term (same attribute), Make it Quick reading the character's increased Cast Speed only.",
    alternatives: [
      {
        reading: "Me and Myself counts (increased + 2 × additional) ÷ 5 in one step count",
        effect: "one more step in some builds",
      },
      { reading: '"Recently" is longer than 4 s, or Mana runs out', effect: "more or fewer I'm Out of Mana stacks" },
    ],
    test: "Read the Illusion's Cast Frequency and the I'm Out of Mana buff's stacks on the character panel while casting on the dummy, with and without a Cooldown Recovery Speed item.",
    source: `${HERO_TRAIT_AUDIT} (§5 B4)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "youga-spacetime-illusion" &&
      ctx.texts.some(
        (entry) =>
          entry.origin === "trait" &&
          /Cooldown Recovery Speed every time you or the Spacetime Illusion casts|^For every \+5 ?% Cooldown Recovery Speed|for each time Spacetime Illusion consumed Mana recently|of the bonuses for Cast Speed is also applied to additional Spacetime Illusion Damage/i.test(
            entry.text,
          ),
      ),
  },
  {
    id: "youga-illusion-spell-burst",
    title: "Spacetime Illusion and Spell Burst",
    question:
      'Does the Spacetime Illusion have its own Spell Burst charge (Max Spell Burst and charge time as yours), and with Telepathy Expert does each of its Spell Bursts also fire yours? Is "Spell Burst Hit Damage" the hit damage of skills cast by Spell Burst, and does Fifth Cosmic Velocity\'s 2 stacks every 0.03 s keep Spell Burst always full?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B4): the Illusion\'s casts of a Spell Main Skill that can Spell Burst activate its own Spell Burst (same Max Spell Burst and charge time as yours); with Telepathy Expert each of those also attempts yours, so your activations come from your casts and the Illusion\'s; "-20% additional Spell Burst Hit Damage" is read as "additional Hit Damage for skills cast by Spell Burst"; Fifth Cosmic Velocity fills Max Spell Burst in 0.03 s × ⌈Max ÷ 2⌉ when that is shorter than the charge time.',
    alternatives: [
      {
        reading: "The Illusion consumes your Spell Burst (no charge of its own)",
        effect: "fewer Spell Burst casts without Telepathy Expert",
      },
      {
        reading: "Fifth Cosmic Velocity's stacks are gained only on cast",
        effect: "a slower charge with more than 2 Max Spell Burst",
      },
    ],
    test: "With Max Spell Burst on a Spell Main Skill and the Illusion out, count the automatic casts over 10 s, with and without Telepathy Expert.",
    source: `${HERO_TRAIT_AUDIT} (§5 B4)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "youga-spacetime-illusion" &&
      (ctx.hasText(/^\+\d+ Max Spell Burst$/i) ||
        ctx.hasText(/When Spacetime Illusion consumes Spell Burst|of Spell Burst Charge\. Interval/i)),
  },
  {
    id: "youga-twisted-spacetime-turbulence",
    title: "Twisted Spacetime: what does Turbulence deal to one dummy?",
    question:
      'On the training dummy alone, does each move of Twisted Spacetime deal the whole record (50% × (1 + "to all recorded damage") of the DoT and Reaping damage since the last move) to the dummy at once, how often does it move, and does Spacetime Speed-up count the seconds since the Spacetime was first cast?',
    evidence: "provisional",
    current:
      'Provisional (Q-H6): damage over time casts Twisted Spacetime at once and again every casting interval (2 s; To Myself in Another Spacetime 1 s); each recast moves it and extends it by 2 s, so it never ends; each move deals the dummy the whole record at once, record% × (1 + Spacetime Pause + Speed-up × whole seconds lasted, up to 5) of the DoT and Reaping damage since the previous move; "Additional Damage" is not counted (no separate model); Turbulence damage is not recorded again and takes no further mitigation; durations change no dummy damage; Spacetime Upheaval\'s +X% additional Damage Over Time holds the whole time.',
    alternatives: [
      {
        reading: "Turbulence deals the record over its duration",
        effect: "the same total, released later (lower 5 s figure)",
      },
      { reading: "The record is shared with the player or other units", effect: "less Turbulence damage on the dummy" },
    ],
    test: "With Spacetime Elapse and a DoT skill, read the dummy recount's total over 20 s with and without Spacetime Pause; the gap is the Turbulence share.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H6, §5 B4)`,
    appliesWhen: (ctx) => traitPicked(ctx, "youga-spacetime-elapse", "Spacetime Elapse"),
  },
  {
    id: "youga-to-myself-reap",
    title: "To Myself in Another Spacetime: the Reap's interval",
    question:
      '"When dealing damage to enemies in Twisted Spacetime, Reaps 1s of Damage Over Time. This effect has a 2s interval for the same target": does Reaping Recovery Speed shorten the 2 s interval?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B4): a Reaping source of 1 s of every DoT on the dummy once per 2 s, the interval fixed (Reaping Recovery Speed does not shorten it); Reaping Duration applies; the dummy is always in Twisted Spacetime while DoT ticks.",
    alternatives: [
      {
        reading: "Reaping Recovery Speed shortens the interval",
        effect: "more Reaps per second with Reaping Recovery Speed",
      },
    ],
    test: "With To Myself in Another Spacetime and a Reaping Recovery Speed item, count the Reap numbers on the dummy over 10 s.",
    source: `${HERO_TRAIT_AUDIT} (§5 B4)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "youga-spacetime-elapse" &&
      ctx.hasText(/^When dealing damage to enemies in Twisted Spacetime, Reaps/i),
  },
  // Hero trait audit B5 (2026-10-19; src/engine/heroes/erika-traits.js, src/engine/heroes/vendetta-model.js, src/engine/heroes/hero-trait-modules.js): Erika – Lightning
  // Shadow and Vendetta's Sting. Shown only for those Erika loadouts.
  {
    id: "erika-feline-figure-cadence",
    title: "Lightning Shadow: how often Feline Figure Numbs the dummy",
    question:
      '"When Electrify is owned, triggers Feline Figure ... Can only be triggered once on each enemy": on a single dummy, how often does Feline Figure fire, and how many Numbed stacks does it leave?',
    evidence: "provisional",
    current:
      "Provisional (Q-H10 recommended reading): Feline Figure deals no damage; it fires once per Electrify window (10 s; Skill Effect Duration does not lengthen it, best case), or every 1 s with Charging Equation; each trigger inflicts Numbed stacks equal to the Electrify stacks (held at max: movement is constant), each lasting 2 s (4 s with Electroplated Motif); the dummy holds at most 10. The figures use the average stacks.",
    alternatives: [
      {
        reading: "Feline Figure fires again whenever Electrify is regained (every few seconds while moving)",
        effect: "more Numbed stacks held without Charging Equation",
      },
      {
        reading: "Skill Effect Duration lengthens the Electrify window and so the wait between triggers",
        effect: "fewer Numbed stacks with Skill Effect Duration",
      },
    ],
    test: "Lightning Shadow without Charging Equation, moving around the dummy: watch the Numbed stack count on the dummy over 20 s.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H10)`,
    appliesWhen: (ctx) => traitPicked(ctx, "erika-lightning-shadow", "Lightning Shadow"),
  },
  {
    id: "erika-numbed-effect-readings",
    title: "Lightning Shadow: Charging Equation, Swift as Lightning and Charging Tail",
    question:
      'Charging Equation\'s "+X% additional Numbed Effect for every stack of Numbed enemies have", Swift as Lightning\'s stacks "for every 4 stack(s) of Numbed inflicted" and Charging Tail\'s Feline Figure crit: which counts and which crit chance do they use?',
    evidence: "provisional",
    current:
      "Provisional: Charging Equation counts the dummy's stacks right after a Feline Figure trigger (steady state, up to 10); Swift as Lightning holds min(10, Numbed stacks inflicted per second × 10 s ÷ 4) (a rate, not whole steps); Feline Figure crits at the Main Skill's crit chance, and its Numbed takes Charging Tail's +50% when one of its triggers in the last 10 s crit. Wild Lightning reads the stat sheet's Movement Speed plus the trait's own Movement Speed lines, held in full.",
    alternatives: [
      {
        reading: "Charging Equation counts the stacks before the trigger adds its own",
        effect: "a smaller Numbed Effect bonus",
      },
      {
        reading: "Feline Figure has its own base crit chance (e.g. 5%)",
        effect: "Charging Tail's share changes with the Main Skill's crit",
      },
    ],
    test: "Read the Numbed Effect and the Swift as Lightning buff count on the character panel while Feline Figure fires on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B5)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "erika-lightning-shadow" &&
      (traitPicked(ctx, "erika-lightning-shadow", "Charging Equation") ||
        traitPicked(ctx, "erika-lightning-shadow", "Swift as Lightning") ||
        ctx.hasText(/^Feline Figure can now land Critical Strikes$/i)),
  },
  {
    id: "erika-vendetta-grant",
    title: "Vendetta's Sting: the Vendetta in Active slot 3",
    question:
      '"Replace the skill in the third slot with Vendetta": is the granted Vendetta (or Endless Vendetta with Swift Stalk) a Lv. 20 skill, and is the skill it replaces simply unused?',
    evidence: "provisional",
    current:
      "Provisional (Q-H12 recommended reading, the same rule as Youga's Spacetime Dictator): Active slot 3 holds a Lv. 20 Vendetta (Endless Vendetta with Swift Stalk), taking no Energy; the skill placed there stays saved and is left out of the calculation, and so is a Vendetta the user placed in another slot.",
    alternatives: [
      {
        reading: "The granted Vendetta takes the replaced skill's level and supports",
        effect: "no damage change (Vendetta's damage is the Main Skill's)",
      },
    ],
    test: "Pick Vendetta's Sting with a skill in Active slot 3 and read the slot's skill and level in game.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H12)`,
    appliesWhen: (ctx) => traitPicked(ctx, "erika-vendettas-sting", "Vendetta's Sting"),
  },
  {
    id: "erika-incisive",
    title: "Vendetta's Sting: Incisive's uptime and effect",
    question:
      'Incisive ("up to +20% additional Attack Damage at 2m. Lasts for 3s") after each Vendetta cast: does Incisive Effect scale the +20% and Mortal Gambit\'s +5% damage taken, and does it hold between Vendetta casts?',
    evidence: "provisional",
    current:
      "Provisional: Incisive is gained at the end of each Vendetta cast and lasts 3 s × (1 + additional Incisive Duration); the planner holds you at 2 m (best-case switch \"Incisive: within 2 m of the dummy\"); +20% × (1 + Incisive Effect) additional Attack Damage and Mortal Gambit's +5% × (1 + Incisive Effect) additional damage taken, both at Incisive's share of time; the triggered-skill lines (Vendetta's Sting, its moon, Swift Stalk's Elite bonus, Feline Fury's Excess bonus) add in one pool.",
    alternatives: [
      {
        reading: "Incisive Effect does not scale Mortal Gambit's added base effect",
        effect: "less damage taken on the dummy",
      },
      { reading: "The triggered-skill lines multiply each other", effect: "a larger triggered-use bonus" },
    ],
    test: "With Swift Stalk, read the Incisive buff tooltip after a Vendetta cast and compare a triggered hit with and without Vendetta's Sting's line.",
    source: `${HERO_TRAIT_AUDIT} (§5 B5)`,
    appliesWhen: (ctx) => traitPicked(ctx, "erika-vendettas-sting", "Vendetta's Sting"),
  },
  {
    id: "erika-leisurely-stroll",
    title: "Leisurely Stroll: Hasten and the manual Main Skill penalty",
    question:
      '"When having Hasten, Vendetta has no Cooldown": does it also remove Endless Vendetta\'s cooldown? And the -80% for manually used Main Skills while Incisive is active: is it the time under Incisive outside the Vendetta casts?',
    evidence: "provisional",
    current:
      "Provisional: the no-cooldown part reaches Vendetta only (Endless Vendetta keeps its 10 s); the +20% additional Attack Speed reaches every Vendetta cast; the -80% reaches the manual Main Skill time while Incisive is up, taken off the Vendetta net gain.",
    alternatives: [
      {
        reading: "Endless Vendetta also loses its cooldown under Hasten",
        effect: "Endless Vendetta recast at once: far more triggered uses",
      },
    ],
    test: "With Leisurely Stroll, Swift Stalk and a Hasten source, time Endless Vendetta's recasts on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B5)`,
    appliesWhen: (ctx) => traitPicked(ctx, "erika-vendettas-sting", "Leisurely Stroll"),
  },
  {
    id: "erika-feline-fury-vendetta",
    title: "Feline Fury: Vendetta's extra triggers and the Excess crit bonus",
    question:
      'Feline Fury\'s "For every X% Effective Critical Strike Chance, Vendetta has a 1% chance to trigger Main Melee Attack Skill 1 additional time" and "For every 0.6% Excess Critical Strike Chance, 1% chance to +100% additional Attack Damage": whose crit chance, and whole steps?',
    evidence: "provisional",
    current:
      "Provisional: the Main Skill's crit chance (Effective: up to 100%; Excess: the uncapped rating above 100%), whole steps; each extra trigger is a full triggered use, and the Excess bonus is an expected +100% × chance in the triggered-skill pool. Vengeful Night Wraith's Phantom: one triggered use per 3 Vendetta casts at +30% additional Phantom Damage, taking no player time.",
    alternatives: [{ reading: "Fractional steps (no rounding down)", effect: "slightly more extra triggers" }],
    test: "With Feline Fury and a high crit chance, count the Main Skill hits per Vendetta cast on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B5)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "erika-vendettas-sting" &&
      (traitPicked(ctx, "erika-vendettas-sting", "Feline Fury") ||
        ctx.hasText(/^For every 3 casts of Vendetta, generates/i)),
  },
  // Hero trait audit B6 (2026-10-19; src/engine/heroes/moto-iris-traits.js, src/engine/minions/minion-damage-model.js, src/engine/heroes/hero-trait-modules.js): Moto (Order
  // Calling, Charge Calling) and Iris (Growing Breeze, Vigilant Breeze). Shown only for those loadouts.
  {
    id: "moto-overload-uptime",
    title: "Order Calling: how long Overload lasts, and its Effect",
    question:
      '"Within 4 s after a Summon Skill is cast, all your Minions will gain Overload. Cooldown: 12 s": Overload\'s own duration is not in the readable game data. Is it held whenever a Summon Skill is recast within 12 s, and which bonuses reach its Effect?',
    evidence: "provisional",
    current:
      'Provisional (Q-H8 recommended reading): Overload held at uptime 1 on every Minion while a Summon Skill is recast within every 12 s (best-case switch "Overload held"), so the Overload Duration lines change no figure. +60% additional damage × Overload Effect: Charge Forward\'s Command share and the player\'s "+X% Empower Skill Effect" lines (TLIDB keyword Overload) add, All In\'s first-gain bonus (held: each recast summons fresh Minions), Overload Program and Machine\'s Joy (30 stacks from the Minion hits with own buffs built, (1 + 3%)^30) multiply; the "+22% when Minions have Overload" line is a separate affix, not scaled.',
    alternatives: [
      {
        reading: "Overload lasts a few seconds, so it lapses between 12 s gains",
        effect: "uptime = duration ÷ 12 s; the Duration lines then raise it",
      },
      {
        reading: "All In applies to a Minion's first Overload only (not to fresh recasts)",
        effect: "its +140% only right after each summon",
      },
      {
        reading: "Machine's Joy stacks count the player's hits, not the Minions'",
        effect: "no stacks in a pure Minion build",
      },
    ],
    test: "With Order Calling and one Synthetic Troop, summon once and read the Overload buff's timer on a Minion; then recast the summon every 10 s and watch whether it lapses.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H8, §5 B6)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "moto-order-calling" &&
      (traitPicked(ctx, "moto-order-calling", "Order Calling") || ctx.hasText(/additional Overload Effect on hit/i)),
  },
  {
    id: "moto-self-destruct-loop",
    title: "Charge Calling: how many Self-Destruct explosions per second",
    question:
      "During Charge Calling every Synthetic Troop self-destructs (keyword: 115% of Base Damage, defeated 1 s after activation). How many explosions per second does a summon cadence give, and is the number alive capped?",
    evidence: "provisional",
    current:
      "Provisional: Charge Calling held (6 s / 6 s, pressed on cooldown); each summon cast creates 1 (+ Rally) + 1 troops, each exploding 1 s later; at most the skill's quantity + 1 alive, so explosions/s = min(casts/s × troops per cast, alive ÷ 1 s). Casts: Fuel War with War's trigger of the Main Summon Skill (a Module ignores its 4 s cooldown), else the summon recast at its use time. Mechanical Parts: drop chance × explosions/s, picked up, held \"recently\" for 4 s. Heroic Sacrifice: troop Life = 5 × Base Damage (+ Peril of Synthetic Troops). The explosion loop replaces the troops' own attacks where it deals more.",
    alternatives: [
      {
        reading: "A troop replaced at the cap also explodes (no alive cap)",
        effect: "explosions/s = casts/s × troops per cast: far more with Fuel War with War",
      },
      { reading: "A troop explodes on reaching the dummy, before the 1 s", effect: "a higher alive-cap rate" },
      { reading: "The Synthetic Troops keep attacking between explosions", effect: "both damage sources add" },
    ],
    test: "With Charge Calling and Summon Machine Guard on the dummy for 20 s, count the explosions (or read the recount) with and without Fuel War with War.",
    source: `${HERO_TRAIT_AUDIT} (§5 B6)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "moto-charge-calling" && traitPicked(ctx, "moto-charge-calling", "Charge Calling"),
  },
  {
    id: "iris-nourishment-extras",
    title: "Growing Breeze: Nourishment's shares, Socialite, Windrider and Full Bloom",
    question:
      "Which bonuses raise Nourishment, how many Magi Socialite adds, how often Windrider grants Nourishment, and how Full Bloom's Ultimate is used?",
    evidence: "provisional",
    current:
      'Provisional: "100% of your Empower Skill Effect bonus" (plain "+X% Empower Skill Effect" lines) and Grow With Them\'s Origin share add to one Nourishment Effect pool (each additional bonus multiplies). Socialite: +1 Magus per Magus skill within a map cap of one per Magus skill + 1 (both lines needed). Windrider (Run With the Wind): channelled whenever the Trait Skill switch is on, 3 Nourishment (+ the moon\'s 1) per 5 × 0.33 s ÷ (1 + Cast Speed). Gentle Zephyr: Full Bloom at every 10 stacks granted (and from the start with own buffs built), 12 s; the Ultimate cast whenever ready inside it (keyword Full Bloom: 8 s initial cooldown, +X% additional recovery per stack held at the cast), 50% of the Minion speed bonuses as additional damage.',
    alternatives: [
      {
        reading:
          'Nourishment also takes the Magus\'s own Empower Skill Effect (keyword: "enjoys Empower Skill Effect bonuses")',
        effect: "more Nourishment with Source",
      },
      { reading: "The moon's extra stack does not apply to Windrider", effect: "3 instead of 4 stacks per channel" },
      {
        reading: "Full Bloom is entered once (the first 10 stacks)",
        effect: "the Ultimate only in the first 12 s window",
      },
    ],
    test: "With Gentle Zephyr, count the Magus's Ultimate casts over 30 s on the dummy; with Socialite, count the Magi summoned by one skill.",
    source: `${HERO_TRAIT_AUDIT} (§5 B6)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "iris-growing-breeze" &&
      (["Socialite", "Gentle Zephyr", "Run With the Wind", "Grow With Them"].some((name) =>
        traitPicked(ctx, "iris-growing-breeze", name),
      ) ||
        ctx.hasText(/^\+\d+(?:\.\d+)?% (?:additional )?Empower (?:Skill )?Effect$/i)),
  },
  {
    id: "iris-revived-nourishment",
    title: "Nourishing Spring Rain and Nature's Party",
    question:
      "With Nourishing Spring Rain, how do Synthetic Troops gain and lose Nourishment? With Nature's Party, how do the per-Magus effects reach the dummy?",
    evidence: "provisional",
    current:
      "Provisional: troops (Synthetic Troop and Module Minions) take the Trait Skill's Nourishment with the Magi's loss rules, lowered by 2% per 1% of the Magi's (highest) Enhanced-skill chance; +5% additional damage per 10 Growth of the Magi (highest), up to +300%. Nature's Party per Nourishment stack: Fire Magus +9% additional crit damage and -20% crit rating; Rock Magus 0.05% of your Armor as added Physical (up to 70); Thunder Magus Numbs the dummy on its Nourished hits (its own Lightning hits take it) and +2% per stack against it; Erosion Magus Deterioration (60% of the Erosion hit as True Damage); the Frost Magus's Max Frostbite Rating is not modeled (Minion Frostbite).",
    alternatives: [
      {
        reading: "The Thunder Magus's Numbed raises every Lightning hit on the dummy (yours too)",
        effect: "more damage for Lightning builds",
      },
      { reading: "The troops' loss chance is their own (not the Magi's)", effect: "different stacks held" },
    ],
    test: "With Nourishing Spring Rain and a Synthetic Troop, compare the troop's damage with and without pressing the Trait Skill.",
    source: `${HERO_TRAIT_AUDIT} (§5 B6)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "iris-growing-breeze" &&
      ctx.hasText(
        /^Nourishment can be applied to Synthetic Troop Minions$|^Nourishment applies additional base effects/i,
      ),
  },
  {
    id: "iris-vigilant-state",
    title: "Vigilant Breeze: the Vigilant state, Breeze and the Merged Ultimate",
    question:
      "How much Breeze does a Merged Spirit Magus hold on the dummy, which Magus merges, and how often does it cast its Ultimate?",
    evidence: "provisional",
    current:
      "Provisional (Q-H13 recommended reading): the Vigilant state held (best-case switch \"Vigilant held\"), Breeze at its max (10 + Breeze's Whisper's +8 with any Enhanced-skill chance + Warmest Vigilance's +23 + Blowing Breeze's +7 with Ultimate uses), +16% additional damage per stack (keyword Breeze), +6 Growth per stack with the moon; Reconjuring breaks ignored. Without Happiest Reunion the Magus whose merging gains most is Merged. The Merged Magus's Ultimate is in its cycle (8 s, the Full Bloom keyword's initial cooldown); Whirlwind Tango: no cooldown, cast back to back only where it out-damages the Base / Enhanced slot; Soft Storm: triggered every 2 Enhanced uses, no use time. Merging Stream: the Thunder / Fire Origins on every Magus, × the received bonus per 2 Growth; Iris loses them.",
    alternatives: [
      {
        reading: "Reconjuring breaks Vigilant often (the drain empties the Magus's Life)",
        effect: "lower Breeze on average",
      },
      { reading: "The Merged Ultimate keeps a cooldown outside Full Bloom", effect: "fewer Ultimate casts" },
      { reading: "Breeze stacks multiply each other", effect: "a larger multiplier at high stacks" },
    ],
    test: "In Vigilant on the dummy, read the Breeze stack count and the Magus's Growth after 20 s; count the Ultimate casts with and without Whirlwind Tango.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H13, §5 B6)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "iris-vigilant-breeze" && traitPicked(ctx, "iris-vigilant-breeze", "Vigilant Breeze"),
  },
  // Hero trait audit B7 (2026-10-19; src/engine/heroes/thea-traits.js, src/engine/defense/blessing-model.js, src/engine/heroes/hero-trait-modules.js): Thea (Wisdom of The
  // Gods, Incarnation of the Gods, Blasphemer) and Rosa's Holy Domain duration (Q-H7). Shown only for those loadouts.
  {
    id: "thea-divine-blessing-cycle",
    title: "Thea: how many Blessing stacks does the Divine Blessing cycle hold?",
    question:
      '"Gain a Divine Blessing every 2s in the following order: Focus Blessing - Agility Blessing - Tenacity Blessing": each type gains a stack every 6 s, but the Blessings\' durations are not in the readable data. On the dummy, does the cycle hold every Blessing at its max stacks?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit Q-H3, recommended reading): each Blessing is held at its max stacks with own buffs built before engaging (the default); the cycle counts as a timed gain for the Blessing model. With own buffs not built, only the Focus Blessing God's Boon consumes and the God's Boon buffs follow the clock in the 5 s / 20 s windows (Agility and Tenacity are held).",
    alternatives: [
      {
        reading: "Each Blessing lasts less than 6 s per stack, so the cycle holds fewer stacks",
        effect: "lower Blessing damage and speed, fewer Desecration and Divine Realm stacks",
      },
      { reading: "The cycle starts empty in the windows (own buffs not built)", effect: "lower 5 s / 20 s figures" },
    ],
    test: "With Thea and no other Blessing source, stand at the dummy for 30 s and read each Blessing's stack count and timer.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H3, §5 B7)`,
    appliesWhen: (ctx) =>
      ["thea-wisdom-of-the-gods", "thea-incarnation-of-the-gods", "thea-blasphemer"].includes(ctx.heroId) &&
      ctx.hasText(/^Gain a Divine Blessing every [\d.]+ ?s in the following order/i),
  },
  {
    id: "thea-gods-boon-cycle",
    title: "Wisdom of The Gods: God's Boon's cadence and the Focus it consumes",
    question:
      "God's Boon consumes every Focus Blessing (cooldown 15 s, auto-cast at max Focus). How often does it fire on the dummy, how much Focus is held on average, and how do its buffs stack?",
    evidence: "provisional",
    current:
      "Provisional (Q-H3 recommended reading): God's Boon fires at max Focus every max(15 s ÷ (1 + its Cooldown Recovery Speed), Max Focus × 6 s); Focus then refills one stack per 6 s, so its time average is (3·F·(F − 1) + F·(interval − 6·F)) ÷ interval (another Focus gain source holds it at max and God's Boon fires on its cooldown). The 10 s buffs (game data buff 82115) are up min(1, 10 s ÷ interval): Wisdom's +52%, Predicted Reincarnation's +11% and Farewell Prophecy's +8% Double Damage chance per Focus consumed (Prophecy of Purity: one more stack each), The Place of Oracle's +2% per Tenacity and Agility stack (each Blessing's Effect applies). Prophecy of Revelation holds while Focus is above 0; Prophecy of Punishment while Focus equals Agility (Lucky as a fractional roll count with the same expected roll). Farewell Prophecy's Double Damage chance is time-averaged and its Quadruple Damage reads the averaged chance. Only the God's Boon Cooldown Recovery Speed lines are read; Skill Effect Duration does not lengthen the buffs.",
    alternatives: [
      {
        reading: "Focus stays at max (God's Boon does not empty it, or it refills at once)",
        effect: "more Focus damage; Prophecy of Punishment holds whenever Agility equals the Focus max",
      },
      {
        reading: "General Cooldown Recovery Speed / Skill Effect Duration also reach God's Boon",
        effect: "a shorter cooldown or longer buffs",
      },
      { reading: "The Place of Oracle's +2% is per Blessing, not per stack", effect: "a much smaller bonus" },
    ],
    test: "With Wisdom of The Gods and no other Focus source, time two God's Boon casts on the dummy and read the Focus count between them and the buff timer.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H3, §5 B7)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "thea-wisdom-of-the-gods" && ctx.hasText(/^God's Boon ?: Consumes all Focus Blessings/i),
  },
  {
    id: "thea-divine-realm",
    title: "Incarnation of the Gods: the Divine Realm on the dummy, inside or outside",
    question:
      "The Divine Realm (8 s, 8 s cooldown) is cast on the closest enemy. Is it held on the dummy, and which bonuses apply when you stand inside or outside it?",
    evidence: "provisional",
    current:
      'Provisional: pressed on cooldown (Trait Skill switch) or Prepared by Tenacious Divinity / Agile Godhood, the Realm sits on the dummy from t = 0 (uptime 1). Inside vs outside is a compared choice (default outside): outside, Tenacity converts to Agility and Tenacity\'s max-stack change applies to Agility; within, the reverse. "When outside the Divine Realm" holds with no Realm too; "while the Divine Realm is active" and "enemies in the Divine Realm" need it. The base trait\'s +X% per Blessing stack applies to the dummy whenever the Realm is active (the TLIDB keyword\'s "additional damage to Full Life enemies when outside / Low Life enemies when within" is not applied separately).',
    alternatives: [
      {
        reading:
          "The per-stack bonus reaches Full Life enemies only when you stand outside and Low Life enemies only when inside (keyword text)",
        effect: "inside: only while Incarnation deems the dummy at Low Life",
      },
      {
        reading: '"Outside the Divine Realm" needs an active Realm',
        effect: "Might Flow and the conversion stop with the switch off",
      },
    ],
    test: "With Incarnation of the Gods, read the character panel's damage and speed inside and outside the Realm on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B7)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "thea-incarnation-of-the-gods" && ctx.hasText(/^Click the Trait Skill to use Divine Realm/i),
  },
  {
    id: "thea-dummy-low-life",
    title: "Thea: is the training dummy ever at Low Life?",
    question:
      "Incarnation deems an enemy at Low Life for 6.5 s (10 s cooldown per enemy); Extreme Desecration reads the Life the target loses. Does the dummy count as at Low Life, and does it lose Life?",
    evidence: "provisional",
    current:
      'Provisional (hero trait audit Q-H9, recommended reading): the dummy never loses Life (0% lost), so Extreme Desecration\'s per-5%-Life-lost line is Inactive; Incarnation deems it at Low Life 6.5 s of every 10 s from the first hit (65%), the share the "enemies at Low Life" lines take (Tenacious Divinity at 10+ Tenacity, gear "against Low Life enemies").',
    alternatives: [
      {
        reading: "The dummy's Life bar drops as it takes damage (it is at Low Life part of a run)",
        effect: "Low Life lines and Extreme Desecration would apply more often",
      },
      {
        reading: "The deem refreshes on every hit after its cooldown (always at Low Life)",
        effect: "the Low Life lines at full value",
      },
    ],
    test: "With Incarnation, watch the dummy's Life bar and the Low Life marker during a 20 s run.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H9, §5 B7)`,
    appliesWhen: (ctx) =>
      (ctx.heroId === "thea-incarnation-of-the-gods" &&
        traitPicked(ctx, "thea-incarnation-of-the-gods", "Incarnation")) ||
      (ctx.heroId === "thea-blasphemer" && traitPicked(ctx, "thea-blasphemer", "Extreme Desecration")),
  },
  {
    id: "thea-desecration",
    title: "Blasphemer: how many Desecration stacks does the dummy hold?",
    question:
      "Desecration (TLIDB: +15% additional Erosion Damage taken per stack, multiplies; initial max 3; 5 s) is inflicted by the Trait Skill, triggered on every Blessing gain. How many stacks does the dummy hold, and do the stacks share one duration?",
    evidence: "provisional",
    current:
      "Provisional: applied on every Blessing gain (every 2 s; the trigger ignores the cooldown) or on the 5 s cooldown when pressed, ⌈max ÷ 3⌉ stacks each, every application refreshing the shared 5 s duration, so the dummy holds max stacks from the 3rd application (the dummy starts clean). Blasphemer turns each +1 Max Blessing Stack into -1 and +1 Max Desecration Stack (up to 4 per Blessing type); Extreme Desecration converts the rest once every Blessing max is 0, up to 25. Sacrificial Pawn (the dummy alone) adds +10% Erosion Damage taken and is a crowd control type; Mountain of Sins (-20% Erosion Resistance) is read as Erosion Penetration; Tarnished Sage's speed and Inverted Shrine's +50% are held while the dummy is Desecrated.",
    alternatives: [
      {
        reading: "Each stack keeps its own 5 s timer",
        effect: "2–3 applications alive: fewer stacks with a large max",
      },
      {
        reading: "A gain at max Blessing stacks does not trigger the Trait Skill",
        effect: "Desecration only on the 5 s cooldown",
      },
    ],
    test: "With Blasphemer on the dummy, read Desecration's stack count and timer after 10 s, with and without a +1 Max Blessing Stacks item.",
    source: `${HERO_TRAIT_AUDIT} (§5 B7)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "thea-blasphemer" && ctx.hasText(/^Click the Trait Skill to inflict Desecration/i),
  },
  {
    id: "rosa-holy-domain-duration",
    title: "High Court Chariot: how long does a Holy Domain last?",
    question:
      "Murderous Intent restores 4 per second and a Holy Domain costs 15 (a recast every 3.75 s). The Domain's duration is not in the trait text or the readable game records: does it last at least 3.75 s, so it can be held?",
    evidence: "provisional",
    current:
      'Provisional (hero trait audit Q-H7, recommended reading): the Holy Domain is held at uptime 1 (cast whenever 15 Murderous Intent are ready: the Trait Skill switch), centred on you with the dummy pulled inside, so "While inside the Holy Domain, +44% additional damage" holds. The other Holy Domain and Murderous Intent clauses wait for Rosa\'s batch B11.',
    alternatives: [
      {
        reading: "The Domain lasts less than 3.75 s",
        effect: "uptime = duration ÷ 3.75 s (Blocking's +10 Murderous Intent shortens the recast)",
      },
    ],
    test: "With High Court Chariot, cast one Holy Domain on the dummy and time it until it fades.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H7)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "rosa-high-court-chariot" &&
      ctx.hasText(/^While inside the Holy Domain ?, \+\d+(?:\.\d+)? ?% additional damage$/i),
  },
  // Hero trait audit B8 (2026-10-19; src/engine/heroes/sage-traits.js, src/engine/skills/elixir-model.js, src/engine/heroes/hero-trait-modules.js "sageScent"): Sage – Licorice
  // Note's Scent Bottles. Shown only for Sage.
  {
    id: "sage-scent-bottle-slots",
    title: "Sage: the Basic Scent Bottle's Elixir and the Special Scent Bottle",
    question:
      "The second Active Skill slot is treated as the Basic Scent Bottle (and the third as the Special Scent Bottle with Licorice Tincture Blend). Does the bottle's Elixir replace the skill in that slot, and does an Elixir placed there by hand count as the bottle's?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B8): the Elixir chosen in Hero → Scent is an Elixir setup of its own (Charging Progress from the build's lines and the Functional Ingredient; the dummy is never defeated), with the bottle-only +12% Artificial Moon line; the skill board is not changed, and an Elixir of the same name on the board counts once. The Special Scent Bottle has no selection in the planner, so its Elixir and Ingredient (Pixie Tear, Thunder Dragon Scale) are not modeled.",
    alternatives: [
      {
        reading: "The skill in Active slot 2 is replaced by the bottle's Elixir (left out of the calculation)",
        effect: "a damage skill placed in slot 2 would stop counting",
      },
      {
        reading:
          "The Special Scent Bottle's Thunder Dragon Scale applies (+20% additional damage, not affected by Elixir Skills)",
        effect: "+20% additional damage with Licorice Tincture Blend once a selection exists",
      },
    ],
    test: "With Sage, put a damage skill in Active slot 2 and an Elixir in the Basic Scent Bottle; check whether the slot-2 skill can still be cast, and read the Elixir's tooltip effect with and without Artificial Moon.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8, F4)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "sage-licorice-note" &&
      Boolean(ctx.lineState.sage?.bottleElixir || ctx.hasText(/^Obtain a Special Scent Bottle/i)),
  },
  {
    id: "sage-ingredient-effects",
    title: "Sage: how the Basic Scent Bottle's Ingredients scale and when they hold",
    question:
      'The Ingredients give the bottle\'s Elixir "an additional base effect". Are they scaled by Elixir Skill Effect, do Razor Leaf and Twinspine Flower last only while the Elixir\'s effect does, and does Razor Leaf\'s "additional damage when you land a Critical Strike" reach all damage?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B8): Damage and Defense Ingredients are scaled by the bottle Elixir's Elixir Skill Effect (Functional and Special ones say they are not) and, with Basic Pharmacology Manuscript, by +80% additional Ingredient Effect (every Basic-bottle Ingredient, the Functional one included). Razor Leaf (+X% additional damage, all damage, held while Critical Strikes land) and Twinspine Flower (an expected 1 + chance Reaps per trigger) hold for the Elixir's uptime; Scattered Spore stacks per cast, min(2, casts/s × 8 s), on the dummy within 15 m.",
    alternatives: [
      {
        reading: "Ingredients are not scaled by Elixir Skill Effect",
        effect: "smaller Ingredient values with Artificial Moon, Scent of Ambition or Everlasting Nectar",
      },
      {
        reading: "Razor Leaf is a buff after a Critical Strike (or reaches Critical Strikes only)",
        effect: "a smaller or crit-only bonus",
      },
      {
        reading: "Ingredients hold permanently once the Elixir is installed",
        effect: "Razor Leaf and Twinspine Flower at full value",
      },
    ],
    test: "With Sage and Razor Leaf, read the character panel's damage with the Elixir's effect up and after it ends; with Twinspine Flower, count Reaps per trigger on the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "sage-licorice-note" &&
      (ctx.lineState.sage?.applied || []).some((name) =>
        ["Razor Leaf", "Twinspine Flower", "Scattered Spore"].includes(name),
      ),
  },
  {
    id: "sage-functional-ingredient",
    title: "Pungent Stimulant Salt: how fast does the Functional Ingredient charge the bottle?",
    question:
      "Husk gains Charging Progress on Critical Strike, Sword Lily Leaf on Reaping, Tumbleweed Seed per 6 m moved, each at most once per 0.5 s. On the dummy, how much Charging Progress per second does each give?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B8): Husk: its progress × min(2, your Critical Strike hits per second, measured by the hit pass; Minion crits not counted); Sword Lily Leaf: × min(2, Reaps per second); Tumbleweed Seed: × min(2, 6 m/s ÷ 6 m) while the Movement group is Moving (6 m/s is the planner's unsourced movement placeholder). The progress goes to the bottle's Elixir only and is not scaled by Elixir Skill Effect.",
    alternatives: [
      { reading: "Minion Critical Strikes also feed Husk", effect: "more charges for Minion builds" },
      { reading: "The real movement speed differs from 6 m/s", effect: "Tumbleweed Seed charges at a different rate" },
    ],
    test: "With Sage and one Functional Ingredient, time the bottle Elixir's charges on the dummy over 30 s.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) => ctx.heroId === "sage-licorice-note" && (ctx.lineState.sage?.functional || []).length > 0,
  },
  {
    id: "sage-prepared-skills",
    title: "Pungent Stimulant Salt: the prepared Empower / Curse Skills' bonus",
    question:
      "Every 4 s while the Basic bottle's Elixir is active, an installed Empower or Curse Skill is prepared with 320% of the bottle's Skill Effect bonus (capped). How long does the boosted effect last, and is the bonus the bottle Elixir's whole Elixir Skill Effect bonus?",
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B8): bonus = min(cap, 320% × (the Basic bottle Elixir\'s Elixir Skill Effect factor − 1), never below 0), applied as "+X% Empower Skill Effect" / "+X% Curse Effect" for the share of time the bottle\'s Elixir is active; each prepared cast\'s boosted effect is read as held until the next preparation (durations not read). Only Empower skills whose effect the planner models take it. Best-case switch "prepared Empower / Curse Skills keep their boosted effect".',
    alternatives: [
      {
        reading: "The boost lasts only the prepared cast's own duration and is split among the installed skills",
        effect: "a smaller time share with several Empower / Curse skills",
      },
      {
        reading: "Only the increased Elixir Skill Effect counts as the bonus",
        effect: "the additional lines (Artificial Moon, Scent of Ambition) would not count",
      },
    ],
    test: "With Sage, an Empower Skill and the bottle's Elixir active, read the Empower buff's values before and after a preparation.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "sage-licorice-note" &&
      (ctx.lineState.sage?.prepared || []).some((item) => item.installed.length > 0),
  },
  {
    id: "sage-elixir-of-immortality",
    title: "Elixir of Immortality: Temporary Life from excess restoration on the dummy",
    question:
      'A Restoration Elixir cast at full Life restores only excess, which Licorice Note keeps. How much Temporary Life / Mana does that hold, how long is "recent", and what is the Mana step (the text says "Temporary Mana equal to Base Max Mana")?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B8): every cast\'s Restoration (× Elixir Skill Effect) is all excess (the dummy never hits); 3 excess → 2 Temporary, up to the cap of Base Max Life / Mana; "recent" is 4 s; Max Life is read as Base Max Life; the Mana step is read as 5% of Base Max Mana like Life\'s; +X% additional damage per step (cap) for the share of time a cast is recent. Best-case switch "Restoration Elixirs cast at full Life".',
    alternatives: [
      { reading: "The Mana step is the whole Base Max Mana", effect: "Temporary Mana never reaches a step (cap 50%)" },
      { reading: "Temporary Life decays faster than 4 s", effect: "fewer steps held" },
    ],
    test: "With Sage, Elixir of Immortality and Life Tonic in the bottle, cast it at full Life and read the Temporary Life bar and the damage buff.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "sage-licorice-note" &&
      Boolean(ctx.lineState.sage?.immortality) &&
      (ctx.lineState.sage?.elixirs?.setups || []).some((setup) => setup.kind === "restoration"),
  },
  {
    id: "sage-elixir-skill-effect",
    title: "Scent of Ambition and Everlasting Nectar on Elixir Skill Effect",
    question:
      "Scent of Ambition gives +30% additional Elixir Skill Effect for 4 s after 3 Elixir casts; Everlasting Nectar converts 180% of the Max Life or Max Mana bonus, up to +70%. How do they reach the Elixirs?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B8): Scent of Ambition time-averaged over every Elixir's casts (up min(1, casts/s ÷ 3 × 4 s) of the time); Everlasting Nectar reads the increased Max Life and Max Mana bonuses summed, × 180%, capped at +70% increased Elixir Skill Effect.",
    alternatives: [
      {
        reading: "Scent of Ambition applies to Elixirs cast during the buff only (their whole 3 s)",
        effect: "a slightly different average",
      },
      {
        reading: "Everlasting Nectar takes the larger of the two bonuses",
        effect: "a smaller Elixir Skill Effect with both bonuses",
      },
    ],
    test: "With Sage, read an Elixir's tooltip values with and without +X% Max Life gear, and after 3 casts.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "sage-licorice-note" &&
      Boolean((ctx.lineState.sage?.ambition?.value || 0) > 0 || (ctx.lineState.sage?.nectar?.value || 0) > 0),
  },
  {
    id: "sage-omni-elixir",
    title: "Omni-Elixir Side Effect: which Ingredients apply",
    question:
      '"Adds the unselected Ingredient effects to Scent Bottles, and the selected Ingredients … no longer take effect": with an empty Ingredient slot, do all three of that kind apply, and does it cover the Functional Ingredient?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B8): for every Ingredient kind of the Basic bottle (Damage, Defense, and Functional with Pungent Stimulant Salt) the unselected Ingredients apply instead of the selected one; an empty slot applies all three of its kind. Its "-50% Elixir Skill Effect" is read like any Elixir Skill Effect line.',
    alternatives: [
      { reading: "An empty slot adds nothing", effect: "fewer Ingredients without a selection" },
      {
        reading: "The Functional Ingredients are not swapped",
        effect: "the selected Functional Ingredient keeps charging the bottle",
      },
    ],
    test: "With Omni-Elixir Side Effect, read the bottle Elixir's tooltip with one and with no Ingredient selected.",
    source: `${HERO_TRAIT_AUDIT} (§5 B8)`,
    appliesWhen: (ctx) => ctx.heroId === "sage-licorice-note" && Boolean(ctx.lineState.sage?.omni),
  },
  // Hero trait audit B9 (2026-10-19; src/engine/heroes/carino-traits.js, src/engine/heroes/hero-trait-modules.js, src/engine/planner.js): Carino (Ranger of Glory, Lethal
  // Flash, Zealot of War). Shown only for Carino; Firepower Coverage (Q-H15) only for Bing – Blast Nova with the pick.
  {
    id: "carino-ammo-cadence",
    title: "Carino: ammo per cast and the reload downtime",
    question:
      "Does a Projectile Skill consume one ammo per cast or one per projectile, and how long are Projectile Skills unavailable while the magazine reloads (Ranger of Glory, Zealot of War)? Does Lethal Flash keep casting at its full rate (casting interrupts the reload)?",
    evidence: "provisional",
    current:
      'Provisional (hero trait audit Q-H8, recommended reading): one ammo per cast. Ranger of Glory: Projectile Skills are unavailable while reloading, so they run at r × M ÷ (M + R × r) of their cast rate r (M: the magazine, R: 0.6 s ÷ (1 + Reload Speed), Reload Speed = 150% of the larger increased Attack / Cast Speed plus "Reload Speed" lines). Zealot of War: the same rule with its 0.8 s reload (the Reload keyword; its text has no auto-reload line). Lethal Flash: no downtime, every cast consumes ammo, so its magazine, reload and Shadow Magazine\'s Reload Speed / Quantity change no dummy figure.',
    alternatives: [
      {
        reading: "One ammo per projectile",
        effect: "builds with extra projectiles empty the magazine faster: more reload downtime",
      },
      {
        reading: "Lethal Flash runs dry when casting faster than it reloads",
        effect: 'casts without ammo lose the "when consuming ammo" bonuses; Reload Speed and Quantity would matter',
      },
      {
        reading: "Reload Speed takes the additional Attack / Cast Speed too",
        effect: "a shorter reload with additional speed lines",
      },
    ],
    test: "With Ranger of Glory and a 6-round magazine, count the casts in 20 s on the dummy and time the reload; with Lethal Flash, cast faster than 2 ammo per 0.6 s and watch whether the magazine empties.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H8, §5 B9)`,
    appliesWhen: (ctx) =>
      ["carino-ranger-of-glory", "carino-lethal-flash", "carino-zealot-of-war"].includes(ctx.heroId) &&
      Boolean(ctx.lineState.carino?.consumes) &&
      Boolean(ctx.lineState.carino?.projectile),
  },
  {
    id: "carino-special-ammo",
    title: "Ranger of Glory: Special Ammo reloads, consumption and level",
    question:
      "When is each Special Ammo slot refilled, which cast consumes it, and at what level are its support's effects? Do the supports' effects on ailments and damage over time apply too?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B9): at every magazine reload each slot (Ammo Expert's 2, Well Prepared's Magnificent / Noble slot) is refilled with the reload chance (Ammo Expert 30%, Artificial Moon +20%, Crushing Gale Trigger's share of the increased Attack and Cast Speed, both converted as the game record does; capped at 100%); the next casts consume one each and gain that support's hit effects at Lv. 20 (the tooltip's level) with the \"if a Special Ammo is consumed\" lines. A support on the skill panel or one that cannot support the skill is not consumed. The supports' ailment / DoT effects are not modeled; \"Reload Special Ammo slots in order\" changes no count.",
    alternatives: [
      {
        reading: "A Special Ammo takes a magazine slot (it replaces a normal ammo)",
        effect: "the same share of special casts, a shorter normal magazine",
      },
      {
        reading: "The support uses the Main Skill's support level rules (Support Skill Level lines)",
        effect: "higher support values with Support Skill Level gear",
      },
      {
        reading: "Only one slot is tried per reload (in order with Crushing Gale Trigger)",
        effect: "fewer special casts with several slots",
      },
    ],
    test: "With Ammo Expert and one Special Ammo support, count how often the special-ammo icon empties over 30 casts on the dummy, and compare a cast's damage with and without it.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "carino-ranger-of-glory" && (ctx.lineState.carino?.special?.slots || []).length > 0,
  },
  {
    id: "carino-magic-shot",
    title: "Ranger of Glory: Magic Shot uptime and Never Stopping",
    question:
      "Magic Shot (50% chance per Special Ammo consumed, 4 s, interval 8 s): how often does it come up on the dummy, how many Special Ammo does a cast consume under it, and can Never Stopping keep it up permanently?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B9): uptime = D ÷ max(D, 8 s + the expected wait 2 ÷ λ), λ the Special Ammo consumed per second; D = 4 s × (1 + Magic Shot Duration), ÷ (1 − Never Stopping's extension × λ) (permanent when that reaches 1). Under Magic Shot reloads are instant (no downtime), each cast consumes 3 ammo (Landslide: the whole magazine) and the loaded supports apply together every max(1, magazine ÷ 3) casts (Landslide: every cast).",
    alternatives: [
      {
        reading: "A new Magic Shot gain refreshes the duration only after the 8 s interval",
        effect: "a lower uptime with long Never Stopping extensions",
      },
      {
        reading: "Several Special Ammo consumed at once count as one for the 50% roll",
        effect: "fewer Magic Shot gains under Landslide",
      },
    ],
    test: "With Ammo Expert, Landslide and two Special Ammo supports, time Magic Shot's buff on the dummy over 60 s.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) => ctx.heroId === "carino-ranger-of-glory" && Boolean(ctx.lineState.carino?.special?.magic),
  },
  {
    id: "carino-heat-up",
    title: "Zealot of War: the Heat Up cycle",
    question:
      'With Incinerated Glory, how do the Heat Up stacks run over a magazine: does the cast that consumes the k-th ammo deal its damage with k stacks, does Overheated force the reload exactly 10 s after the first Blank Firing cast, and is Burning Red\'s "100% Heat Up effect bonuses" an increased or an additional Heat Up Effect?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B9; Max Heat Up Stacks = the magazine capacity, game records 274178304 / 241096224): the k-th ammo casts at k stacks; then Blank Firing at max stacks until Overheated forces the reload 10 s later (Extreme Heat: 10 s of Burning Red, +100% Heat Up Effect in the increased pool, then the reload); the reload clears the stacks and the player never reloads by hand. Ceasefire holds max stacks. Self-Imposed Shackles' +30% additional Heat Up Effect holds while standing still. The damage reads the cast-weighted stacks, Eternal Flames the time-weighted stacks; the 5 s / 20 s windows use the cycle average.",
    alternatives: [
      {
        reading: "The stack is gained after the cast's projectiles hit (cast k at k − 1 stacks)",
        effect: "slightly fewer stacks per cast",
      },
      {
        reading: "Burning Red's +100% is an additional (multiplying) Heat Up Effect",
        effect: "more Heat Up damage with Artificial Moon",
      },
      { reading: "Reloading by hand when the magazine empties is better", effect: "no Blank Firing phase" },
    ],
    test: "With Incinerated Glory, empty a magazine on the dummy and read the Heat Up stacks and the Overheated timer; with Extreme Heat, read the Burning Red buff and a hit's damage before and during it.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "carino-zealot-of-war" &&
      Boolean(ctx.lineState.carino?.heat) &&
      ctx.lineState.carino.heat.mode !== "none",
  },
  {
    id: "carino-deflection",
    title: "Lethal Flash: having Deflection on the dummy",
    question:
      "Born in the Breeze and Into the Night need Deflection. On the dummy, which never attacks, is Deflection held as long as a source grants it (movement, Reaping), and does Into the Night's 3 s duration break it between gains?",
    evidence: "provisional",
    current:
      'Provisional (hero trait audit B9): Deflection is held while a gain source holds (movement while moving at the planner\'s 6 m/s placeholder, Reaping, hit recently, not hit recently); it is never consumed (best-case switch "Deflection held"). With Into the Night a source must regain it within 3 s.',
    alternatives: [
      {
        reading: "Being hit recently (the best-case switch) consumes Deflection",
        effect: 'the "while having Deflection" lines would drop with Hit or blocked recently on',
      },
    ],
    test: "With Born in the Breeze and a movement Deflection source, read the Deflection stacks and a hit's damage while moving around the dummy.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) => ctx.heroId === "carino-lethal-flash" && Boolean(ctx.lineState.carino?.deflection),
  },
  {
    id: "carino-evil-ouroboros",
    title: "Evil Ouroboros: do returning projectiles hit the dummy again?",
    question:
      '"After reaching their max range, Projectiles will return … hitting the enemies on their path again": on one dummy, does a projectile that hits it ever reach its max range (only with Penetration), and does the return path cross the dummy?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B9): a Horizontal Projectile skill with at least 1 Penetration passes through the dummy, reaches its max range and returns over 75% of it, hitting the dummy once more as a full hit (no Shotgun falloff; best-case switch: the dummy on the return path). Without Penetration the projectiles stop at the dummy and nothing returns.",
    alternatives: [
      {
        reading: "Projectiles that hit the dummy also return",
        effect: "every projectile hits twice, Penetration or not",
      },
      { reading: "The returning hit takes the Shotgun falloff", effect: "less damage from fans" },
    ],
    test: "With Evil Ouroboros and a Projectile Penetration support, count the floating numbers per cast on the dummy at 6 m.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) => ctx.heroId === "carino-lethal-flash" && Boolean(ctx.lineState.carino?.returning),
  },
  {
    id: "carino-royal-arsenal",
    title: "Royal Arsenal: which Noble supports are activated?",
    question:
      "\"For every activated Noble Support Skill, +10% additional Projectile Damage, up to 30%\": do only the Main Skill's Noble supports count, or every skill's, and do Noble Special Ammo supports count when consumed?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B9): the Main Skill's enabled Noble supports count; Special Ammo supports do not.",
    alternatives: [
      { reading: "Every installed Noble support counts", effect: "more stacks with Noble supports on other skills" },
      { reading: "A consumed Noble Special Ammo counts on its cast", effect: "+10% on those casts" },
    ],
    test: "With Royal Arsenal, install a Noble support on the Main Skill and then on another skill, and read the character panel's additional Projectile Damage.",
    source: `${HERO_TRAIT_AUDIT} (§5 B9)`,
    appliesWhen: (ctx) => ctx.heroId === "carino-ranger-of-glory" && Boolean(ctx.lineState.carino?.arsenal),
  },
  {
    id: "bing-firepower-coverage",
    title: "Firepower Coverage: no Main Skill damage before the bombs exist",
    question:
      'Firepower Coverage says "Cannot use Main Skills" and "Automatically throws bombs at nearby enemies". The planner does not model the bombs yet; should the Main Skill\'s damage be removed now, so the build does not read stronger than it is?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit Q-H15, recommended reading; not answered yet): applied. The Main Skill deals no damage of its own and a warning names the missing source (the bombs, hero trait audit B12). Best-case switch "Firepower Coverage: Cannot use Main Skills (applied)"; off keeps the Main Skill\'s damage.',
    alternatives: [
      {
        reading: "Keep the Main Skill's damage until the bombs are modeled",
        effect: "the Main Skill's damage stands in for the bombs' (an overstatement or understatement)",
      },
    ],
    test: "Not an in-game question: whether the planner should show the penalty before the bomb engine (batch B12) exists.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H15)`,
    appliesWhen: (ctx) => ctx.heroId === "bing-blast-nova" && Boolean(ctx.lineState.firepowerCoverage),
  },
  // Hero trait audit B10 (2026-10-19; src/engine/heroes/rehan-traits.js, src/engine/heroes/hero-trait-modules.js, src/engine/planner.js): Rehan (Anger, Seething Silhouette)
  // and its revived affixes. Shown only for Rehan.
  {
    id: "rehan-rage-cycle",
    title: "Rehan: Max Rage, how long Berserk lasts and its bonuses",
    question:
      'How long does Berserk last on the dummy, and what Rage do the "for every N Rage" bonuses read while it is active? Does Anger also gain bonuses at twice Max Rage in Berserk, as the Berserk keyword says, or only Seething Silhouette (whose text states it)?',
    evidence: "provisional",
    current:
      'Provisional (hero trait audit Q-H1, recommended reading): Max Rage 100 (TLIDB Rage keyword: "a default upper limit of 100"). Berserk starts at Max Rage and lasts until Rage runs out: Max Rage ÷ the net drain (Anger 15/s; Seething Silhouette 10/s + 10 per Melee Attack cast, halved casts and no drain with Fury\'s Onslaught; Righteous Fury, Frenzy Furious, Growing Anger and Hysteria add Rage). Outside Berserk Rage fills from the measured uses (10 per Melee Attack use, 5 per channel stack, 15 per Ranged use with Starfall Wasteland, × Rage gained). Uptime = Berserk ÷ (Berserk + fill); own buffs pre-built: Rage full at engagement. The per-Rage bonuses read twice Max Rage (200) in Berserk for both loadouts and Max ÷ 2 outside (a linear fill), time-averaged over the cycle; the 5 s / 20 s windows use the same average.',
    alternatives: [
      {
        reading: "Anger's bonuses read the Rage it has (no doubling)",
        effect: "Anger's per-Rage damage and crit rating halve or less in Berserk",
      },
      {
        reading: "Berserk ends at a Rage threshold above 0, or Rage restarts above 0",
        effect: "shorter Berserk, shorter fill",
      },
      { reading: "Max Rage differs from 100", effect: "every per-Rage bonus and the Berserk duration scale with it" },
    ],
    test: "With Anger and no other Rage line, attack the dummy and time one Berserk (from the Berserk icon to its end) and the refill; read the character panel's additional damage just before and during Berserk.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H1, §5 B10)`,
    appliesWhen: (ctx) =>
      ["rehan-anger", "rehan-seething-silhouette"].includes(ctx.heroId) && Boolean(ctx.lineState.rehan?.rage?.enters),
  },
  {
    id: "rehan-burst",
    title: "Anger: Burst's hit and how often it fires",
    question:
      'What does one Burst hit deal on the dummy, and how often does it fire? The planner reads Burst as 340% of Weapon Damage (TLIDB keyword; game row 90000, a single Lv. 1 row), "+3.7% additional Burst Damage per 1 levels" as per character level, and one Burst per attack that hits while Berserk, at most once per 0.3 s.',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit Q-H1): Burst is a triggered Attack (Melee, Physical, Area) hit of 340% Weapon Damage within 3 m, Lv. 1 + the build's tag-matching \"+N Skill Level\" lines (each +10% additional damage, multiplies; Active / Main Skill Level lines not counted), +3.7% additional Burst Damage per character level, Tunnel Vision and Uncontrolled Anger's lines, the Rage bonuses at the Berserk level. Rate in Berserk = 1 ÷ max(1 ÷ Attack Skill uses per second, 0.3 s ÷ (1 + Burst Cooldown Recovery Speed: Artificial Moon at 200 Rage, Rampaging's share of the Attack Speed bonuses)), × the Berserk uptime; Burst's own hits do not trigger it; general Cooldown Recovery Speed lines are not read.",
    alternatives: [
      {
        reading: '"per 1 levels" is per Burst skill level',
        effect: "+3.7% instead of +3.7% × character level: far less Burst damage",
      },
      {
        reading: "Each hit of an attack (not each attack) triggers Burst",
        effect: "more Bursts for multi-hit attacks, up to the cooldown",
      },
      {
        reading: "General Cooldown Recovery Speed shortens Burst's cooldown",
        effect: "more Bursts with Cooldown Recovery Speed gear when the cooldown binds",
      },
    ],
    test: "With Anger at a known character level and weapon, read one Burst floating number on the dummy, and count Bursts over 10 s of Berserk with a slow and a fast attack skill.",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H1, §5 B10)`,
    appliesWhen: (ctx) => ctx.heroId === "rehan-anger" && Boolean(ctx.lineState.rehan?.burst),
  },
  {
    id: "rehan-tunnel-vision",
    title: "Tunnel Vision: -80% on every skill but Burst",
    question:
      'Tunnel Vision says "-80% additional damage for non-Burst skills". Does it reach the ailments and damage over time of those skills too, and Burst\'s own ailments?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit Q-H15, recommended reading): applied to every hit, damage over time and ailment except Burst's hits (best-case switch \"Tunnel Vision: -80% additional damage for non-Burst skills (applied)\", default on); the build's ailments are pooled, so Burst's own ailments read it too. A warning names Burst when it deals no damage.",
    alternatives: [
      { reading: "Only the non-Burst skills' hits", effect: "ailments and damage over time keep their damage" },
      { reading: "Burst's ailments are exempt", effect: "more ailment damage from Burst-applied ailments" },
    ],
    test: "With Tunnel Vision, compare an Ignite or Trauma tick on the dummy with and without the pick (no Burst in the window).",
    source: `${HERO_TRAIT_AUDIT} (§6 Q-H15)`,
    appliesWhen: (ctx) => ctx.heroId === "rehan-anger" && Boolean(ctx.lineState.rehan?.tunnel),
  },
  {
    id: "rehan-seething-spirit",
    title: "Seething Silhouette: how often the Seething Spirit casts",
    question:
      'The Seething Spirit casts your Main Skill (TLIDB keyword). How often does it cast while Berserk (Ritual of Offering: "always exists and attacks automatically"; Fury\'s Onslaught: for 2 s after each Main Skill use), and does each cast deal your full hit with your bonuses?',
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B10): the Spirit casts the Main Skill at your own use rate for it (Attack Speed included, × 0.7 with Fury's Onslaught's -30%), for the whole Berserk (Ritual) or while you use the Main Skill within every 2 s (Fury's Onslaught); each cast is a full use with the Berserk-phase lines, Ritual's +X% additional Seething Spirit Damage and Fury's game-record offset (-43.82% at rank 5: the Spirit does not keep the player's +68%). Its ailments are not counted. Disarmed (Ritual): your Attack Skills pause for the Berserk (Rage Infusion: its first 5 s).",
    alternatives: [
      { reading: "The Spirit has its own attack interval", effect: "a different Spirit cast rate" },
      {
        reading: "The Spirit's casts do not take the player's \"+X% additional damage dealt by the player\" at all",
        effect: "Fury's Onslaught's offset would lower its damage further",
      },
    ],
    test: "With Ritual of Offering, count the Spirit's floating numbers over 10 s of Berserk and compare one with your own hit.",
    source: `${HERO_TRAIT_AUDIT} (§5 B10)`,
    appliesWhen: (ctx) => ctx.heroId === "rehan-seething-silhouette" && Boolean(ctx.lineState.rehan?.spirit),
  },
  {
    id: "rehan-hysteria-life",
    title: "Hysteria: Rage from self-damage and Life consumed",
    question:
      "Hysteria's Rage from damage taken and from Life consumed reads Ritual of Offering's self-damage (1% of current Life every 0.2 s) and Ancestral Hate's Life cost (30% of current Life per Spirit skill). What is current Life during Berserk?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B10): current Life is read as Max Life (an upper bound), so Ritual's self-damage gives 5% ÷ 3% × Life share Rage per second and each Spirit skill with Ancestral Hate 30% ÷ 3% = 10 Rage. The dummy never attacks, so nothing else is taken.",
    alternatives: [{ reading: "Current Life settles low (repeated % costs)", effect: "much less Rage from Hysteria" }],
    test: "With Ritual of Offering and Hysteria, watch the Rage bar during Berserk with and without the pick.",
    source: `${HERO_TRAIT_AUDIT} (§5 B10)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "rehan-seething-silhouette" &&
      ((ctx.lineState.rehan?.rage?.takenRate || 0) > 0 || (ctx.lineState.rehan?.rage?.consumedRate || 0) > 0),
  },
  {
    id: "rehan-revived-burst",
    title: "Furious Roar and Hero's Resourcefulness: Burst triggers",
    question:
      "Furious Roar: is its \"trigger Burst once on Critical Strike\" a second trigger with its own 0.3 s cooldown, or the same cooldown as the base trait's? Hero's Resourcefulness: does Burst Blast (a Spell) fire on the hits of every skill and activate Spell Burst like a manual cast?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B10): Furious Roar adds Bursts at 1 ÷ max(1 ÷ attack crits per second, its own 0.3 s cooldown) in Berserk, and -20% additional Burst Damage on all of them. Hero's Resourcefulness: Burst Blast (TLIDB keyword; game row 90003: 1166–1944 Spell Physical at 288%) fires on the hits of every skill, Rage comes from every skill use, and it can activate Spell Burst at its trigger rate.",
    alternatives: [
      {
        reading: "Furious Roar shares the base trait's cooldown",
        effect: "no extra Bursts when the cooldown already binds",
      },
      { reading: "Burst Blast cannot activate Spell Burst from triggers", effect: "no Spell Burst casts" },
    ],
    test: "With Furious Roar, count Bursts over 10 s of Berserk with a high-crit fast attack; with Hero's Resourcefulness and Max Spell Burst, watch for Spell Burst casts of Burst Blast.",
    source: `${HERO_TRAIT_AUDIT} (§5 B10)`,
    appliesWhen: (ctx) =>
      ctx.heroId === "rehan-anger" &&
      Boolean(
        ctx.lineState.rehan?.burst?.roar || ctx.lineState.rehan?.burst?.blast || ctx.lineState.rehan?.burst?.onHit,
      ),
  },
  {
    id: "rehan-starfall",
    title: "Starfall Wasteland: the Spirit's Ranged casts",
    question:
      "With Starfall Wasteland, which skill does the Seething Spirit cast (your Main Skill if it is a Ranged Projectile Skill?), do its extra projectile and Penetration reach the dummy, and do its returning projectiles (33%) hit it again?",
    evidence: "provisional",
    current:
      "Provisional (hero trait audit B10): the Spirit casts your Main Skill when it is a Ranged Projectile Skill (not Channeled or Parabolic) with +1 Projectile Quantity and +1 Horizontal Penetration; 33% of its projectiles pass through the dummy and return through it, hitting it once more (best-case switch \"Starfall Wasteland: the Spirit's returning projectiles hit the dummy\"). Your Ranged Skill uses generate 15 Rage each (in and out of Berserk); the Spirit's casts do not.",
    alternatives: [
      { reading: "The Spirit's casts also generate Rage", effect: "more Rage in Berserk" },
      { reading: "Returning projectiles miss the dummy", effect: "no returning hits" },
    ],
    test: "With Starfall Wasteland and a Ranged Projectile Main Skill, count the Spirit's floating numbers per cast on the dummy at 6 m.",
    source: `${HERO_TRAIT_AUDIT} (§5 B10)`,
    appliesWhen: (ctx) => ctx.heroId === "rehan-seething-silhouette" && Boolean(ctx.lineState.rehan?.spirit?.starfall),
  },
]);

/** The registry entries that apply to this build (planner result + state). A failing check counts as not applying. */
export function openQuestionsFor(planner, state = planner?.state) {
  if (!planner) return [];
  const ctx = openQuestionContext(planner, state);
  return OPEN_QUESTIONS.filter((entry) => {
    try {
      return Boolean(entry.appliesWhen(ctx));
    } catch {
      return false;
    }
  });
}

/** Plain text for pasting into Discord or Reddit: title, question, planner now, alternatives, test. */
export function openQuestionsText(entries = []) {
  return entries
    .map((entry, index) =>
      [
        `${index + 1}. ${entry.title}`,
        `Question: ${entry.question}`,
        `Planner now: ${entry.current}`,
        "Alternatives:",
        ...entry.alternatives.map((alt) => `- ${alt.reading} — ${alt.effect}`),
        `How to test: ${entry.test}`,
      ].join("\n"),
    )
    .join("\n\n");
}

// "Submit an answer" (src/app/stats/open-questions-panel.js): the URL builder lives with the other report links.
export { ANSWER_REPO, ANSWER_TEMPLATE, ANSWER_URL_MAX, answerIssueUrl } from "../feedback/feedback-links.js";
