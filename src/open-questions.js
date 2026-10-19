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

const names = (list, pick = (item) => item?.name) => (list || []).map(pick).filter(Boolean);
const count = (list, name) => list.filter((item) => item === name).length;
const coreName = (source) => String(source || "").replace(/^.*?core:\s*/i, "").replace(/\s*\(.*\)\s*$/, "").trim();

/** The facts the registry's `appliesWhen` checks read, from the planner's resolved data. */
export function openQuestionContext(planner, state = planner?.state) {
  const setups = (planner?.activation?.setups || []).filter((setup) => setup && setup.enabled !== false);
  const supportsOf = (setup) => (setup.supports || []).filter((support) => support && support.enabled !== false).map((support) => support.name);
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
    planner: planner || {}
  };
}

// A core the build has from any place: the talent panel or an Ethereal Prism (origin core), a Pedigree of Gods slate or a
// "[Core]" gear grant (`grantedCore`).
const hasCore = (ctx, name) => ctx.cores.has(name) || ctx.texts.some((entry) => entry.grantedCore === name || (entry.origin === "slate" && new RegExp(`Core Talent: ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(`${entry.source} ${entry.text} ${entry.bracketText || ""}`)));
const youga = (ctx) => ctx.planner.yougaUltimateOne?.active ? ctx.planner.yougaUltimateOne : null;
const coreApplied = (ctx) => Boolean(youga(ctx)?.core?.applied);
const recalls = (ctx) => Boolean(youga(ctx)?.recallHits) && (youga(ctx)?.recallsPerProjectile || 0) > 0;
const dance = (ctx) => ctx.heroId === "selena-dance-of-the-deep" && ctx.planner.danceOfTheDeep?.selected ? ctx.planner.danceOfTheDeep : null;
const activeEntries = (state) => (state?.entries || []).filter((entry) => entry?.active);

// Answered items stay out (e.g. Freeze at 100+ Frostbite Rating, user-confirmed 2026-10-18).
const YOUGA_NOTES = "research/youga-recall-mechanics-2026-10-18.md; research/youga-homing-frost-bolt-audit-2026-10-18.md";
// The follower's chosen Tartarus Skill support affixes (src/follower-model.js, 2026-10-19): [{ name, slot, skill }].
const FOLLOWER_AFFIX_NOTES = "research/followers/tartarus-skill-affixes-2026-10-19.md";
// The follower letter rework (2026-10-19): letter rarities, the initial skill, the ULT special effects.
const FOLLOWER_LETTER_NOTES = "research/followers/tartarus-skill-affixes-2026-10-19.md (Letter rarities, initial skill and ULT special effects)";
const followerAffixes = (ctx) => (ctx.planner.follower?.selection?.skills || []).flatMap((entry) => (entry.affixes || []).map((item) => ({ name: item.affix.name, slot: item.slot, skill: entry.skill.name })));
const hasFollowerAffix = (ctx, name) => followerAffixes(ctx).some((item) => item.name === name);

export const OPEN_QUESTIONS = Object.freeze([
  {
    id: "youga-recall-falloff",
    title: "Recall: does Shotgun falloff hit Recalled passes?",
    question: "When a bolt is Recalled and hits the same target again, does the Shotgun Effect count it as a repeat hit (60%), or is it a full hit?",
    evidence: "provisional",
    current: "Provisional: every Recalled pass is a full hit; only the first cast's own bolts take the Shotgun falloff. Game data shows no built-in Return penalty, but the repeat-hit counter was not traced (R2).",
    alternatives: [
      { reading: "Each Recall wave takes the cast's falloff (2.2 of 3 bolts per wave)", effect: "about ×0.76 on the total (Homing Frost Bolt build)" },
      { reading: "Every hit after the first from one cast deals 60%", effect: "about ×0.64 on the total" }
    ],
    test: "Dummy run with and without the Jump support (Recalls 3 → 1). Full Recalls predict about ×1/2.74; the falloff reading about ×1/2.61.",
    source: `${YOUGA_NOTES} (R2, audit Q3)`,
    appliesWhen: (ctx) => recalls(ctx)
  },
  {
    id: "youga-recall-rehit",
    title: "Recall: do Recalled bolts hit the dummy again?",
    question: "Does each Recalled bolt hit the dummy again as a fresh hit with full damage, at most once per Recall pass?",
    evidence: "user-supplied",
    current: "User-supplied (2026-10-18): yes, a full-damage fresh hit per Recall pass. Game code supports it (the return routine clears the bolt's hit list), but the hit component's last step was not traced (R7).",
    alternatives: [
      { reading: "Recalled bolts never hit the dummy (Centralization still builds)", effect: "about ×0.1 on the total" },
      { reading: "They never hit and Centralization is lost too", effect: "about ×0.07 on the total" }
    ],
    test: "Run the dummy without pressing Stasis Vault. The planner predicts a drop of about ×7 to ×10; a small drop means the Recall share is overstated.",
    source: `${YOUGA_NOTES} (R7)`,
    appliesWhen: (ctx) => recalls(ctx)
  },
  {
    id: "youga-core-manual-casts",
    title: "Clockwork Core: do your own casts fire bolts?",
    question: "While the Clockwork Core exists, does casting the supported skill also fire it, or does it only place or move the Core?",
    evidence: "game code (not tested)",
    current: "Game code (user-decided 2026-10-18): your own casts fire nothing; they only summon or move the Core, and only the Core's Tangle triggers hit. Still to be confirmed by an in-game test (R1).",
    alternatives: [
      { reading: "Your casts also fire bolts with all the Core bonuses", effect: "about ×2 on the total" },
      { reading: "Your casts fire bolts without the Core tag (no Core lines, no Recall)", effect: "about ×1.07 on the total" }
    ],
    test: "Cast once to place the Core with Stasis Vault up, then stop casting for 5 s. The recount's 5 s average should stay the same; it halves if your casts also fire.",
    source: `${YOUGA_NOTES} (R1)`,
    appliesWhen: (ctx) => coreApplied(ctx)
  },
  {
    id: "youga-core-tangles",
    title: "Clockwork Core: how many Tangles fire per interval?",
    question: "Does every Tangle on the Core (Max Tangle Quantity, 2 at base) trigger the skill each casting interval, or only one?",
    evidence: "user-supplied",
    current: "User-supplied (2026-10-18): every attached Tangle triggers it. The skill text and the Tangle fields (base 2, highest 4) support it (R1b).",
    alternatives: [{ reading: "One Tangle triggers per casting interval", effect: "about ×0.75 on the total (×0.5 of the Core triggers)" }],
    test: "Count the bolt volleys the Core fires over a few seconds against the casting interval (the Config switch \"Clockwork Core: every Tangle triggers the skill\" shows the planner's two readings).",
    source: `${YOUGA_NOTES} (R1b)`,
    appliesWhen: (ctx) => coreApplied(ctx) && youga(ctx)?.tangles?.reading !== false
  },
  {
    id: "youga-stasis-vault-modifiers",
    title: "Stasis Vault: what applies to it, and does it boost Recalled projectiles?",
    question: "Which modifiers apply to Stasis Vault itself: its supports' lines (such as Increased Area's Skill Area and additional damage), Spell / Area / Persistent lines and Skill Area? Do any of them raise the damage of the projectiles it Recalls? And does Skill Area matter against a single target?",
    evidence: "game data (partial)",
    current: "Game data (partial; not tested in game): Stasis Vault deals no damage of its own. Its skill data has no damage entry and its buff carries no modifiers, so damage lines on it (its supports' additional damage, Spell / Area / Persistent damage) read No DPS effect. A Recalled hit stays the bolt's own: the Recall routine only adds the Recall tag to the bolt's damage. Support lines are scoped to the skill they support, so the Vault's supports are not passed to Recalled hits. Skill Area widens the 10 m vault (50% of the bonuses, up to 140%). The Recall count and the Vault uptime do not depend on the radius, and the dummy stands inside it, so no figure moves.",
    alternatives: [
      { reading: "Increased Area's +20.8% additional damage reaches Recalled hits (90.5% of the bolt damage)", effect: "about ×1.19 on the total (Homing Frost Bolt build)" },
      { reading: "The Vault's support damage reaches every bolt the Core fires while the Vault is up", effect: "about ×1.21 on the total (Homing Frost Bolt build)" },
      { reading: "Skill Area on the Vault changes the Recalls on one dummy (for example, bolts that end their flight before a wider edge do not Recall)", effect: "unknown size; the planner's figures do not move with it now" }
    ],
    test: "Dummy run with and without Increased Area on Stasis Vault, all else equal, comparing the recount's last 5 s: the planner predicts no change, the Recalled-hits reading about ×1.19. Then the same with a different damage support on the Vault.",
    source: `research/youga-recall-mechanics-2026-10-18.md ("Increased Area on Stasis Vault")`,
    appliesWhen: (ctx) => { const ts = youga(ctx)?.traitSkills; return Boolean(ts?.vault?.active) && ts.pressed !== false; }
  },
  {
    id: "on-the-sublime-pair",
    title: "Two On the Sublime: separate or shared buff?",
    question: "With two On the Sublime equipped, does each wand's \"+2% additional Spell Projectile Damage per Spell Projectile generated recently, up to 10\" stack on its own, or do both feed one buff?",
    evidence: "provisional",
    current: "Provisional: two separate buffs, ×1.2 × 1.2 = ×1.44 (the planner's rule for two copies of an additional line). Game record 587878912 points to one shared buff (35117), but its stack cap was not extracted.",
    alternatives: [
      { reading: "One shared buff, capped at 10 stacks (×1.2)", effect: "about ×0.83 on the skill's hits" },
      { reading: "One shared buff at +4% per stack (×1.40)", effect: "about ×0.97 on the skill's hits" }
    ],
    test: "Look at the buff bar while casting: one On the Sublime icon with a 10-stack counter, or two icons.",
    source: "research/youga-homing-frost-bolt-audit-2026-10-18.md (Q1, R4)",
    appliesWhen: (ctx) => ctx.itemCount("On the Sublime") >= 2
  },
  {
    id: "gale-pool",
    title: "Gale: which Projectile Speed counts?",
    question: "Gale turns 60% of the Projectile Speed bonus into additional Projectile Damage. Does that pool hold only increased Projectile Speed, including the skill's own support lines and buffs?",
    evidence: "provisional",
    current: "Provisional (game record 114414): only increased Projectile Speed counts, including the skill's own support clauses, the Aura and buffs such as Centralization. \"+X% additional Projectile Speed\" is left out.",
    alternatives: [
      { reading: "Only the character-sheet Projectile Speed counts (no skill-scoped lines or buffs)", effect: "about ×0.88 on the Homing Frost Bolt build" },
      { reading: "Additional Projectile Speed counts too", effect: "a little higher (On the Sublime's +15% would join)" }
    ],
    test: "Compare the character panel's Projectile Speed with the skill's damage bonus, with and without a skill-only Projectile Speed support.",
    source: "research/youga-homing-frost-bolt-audit-2026-10-18.md (fix 3, Q4, R6)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => (hit.projectileSpeed?.converters || []).length > 0)
  },
  {
    id: "homing-frost-bolt-row-1282",
    title: "Homing Frost Bolt: what is game row 1282?",
    question: "The game files give Homing Frost Bolt a second damage row (Cold 317–475 at Lv.20, 73% effectiveness, 0.4× the bolt's row) that the skill card never mentions. Does it deal damage?",
    evidence: "unknown",
    current: "Unknown: not modeled; only the bolt's own row (792–1188) is used.",
    alternatives: [{ reading: "Row 1282 is an extra Cold hit with each bolt", effect: "up to about ×1.4 on the bolt's hit damage" }],
    test: "Watch the damage numbers of a single bolt on the dummy: one number per bolt, or a second smaller one.",
    source: "src/skill-hit-profiles.js (Homing Frost Bolt note)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.name === "Homing Frost Bolt")
  },
  {
    id: "frost-magus-gap",
    title: "Frost Magus reads about 3× the Iris runs",
    question: "The planner's Frost Magus damage is about 3× the user's Iris dummy runs, with or without Nourishment. Which part of the Magus model is too high?",
    evidence: "unknown",
    current: "Unknown: nothing fitted. Model vs runs: ×2.83 (Trait Skill never pressed) and ×3.25 (pressed on cooldown) on the average. The +30% per Nourishment stack is confirmed by the tooltip.",
    alternatives: [{ reading: "A missing factor of roughly ×0.33 on the Magus (cause not found)", effect: "about ×0.33 on the Magus's damage" }],
    test: "A Summon Frost Magus run with one Magus and no gear, noting the Magus's per-hit numbers and skill casts per second.",
    source: "CLAUDE.md (Iris Nourishment runs); research/residual-batch-2026-10-12.md §5.3 run 7",
    appliesWhen: (ctx) => ctx.minions.some((minion) => minion?.minionKey === "frost-magus")
  },
  {
    id: "instant-smash-trauma",
    title: "Instant Smash in the game's Trauma damage?",
    question: "Does Instant Smash (\"+1% additional Trauma Damage for every +2% Critical Strike Damage\") reach Trauma in game? A panel test suggested it may be inactive (possibly the Max Active Divinity rule).",
    evidence: "provisional",
    current: "Provisional: applied from its text, crit damage gained in combat included.",
    alternatives: [{ reading: "Instant Smash is inactive", effect: "Trauma divided by its multiplier (about ×0.23 on the Trauma fixture's +341%)" }],
    test: "Compare the panel's Trauma DPS with the slate equipped and removed, and check whether another Divinity slate blocks it.",
    source: "research/game-log-comparison-2026-10-09.md; CLAUDE.md (ailment crit)",
    appliesWhen: (ctx) => ctx.hasText(/additional Trauma Damage for every \+?[\d.]+% Critical Strike Damage/i) && Boolean(ctx.ailments.trauma?.modeled)
  },
  {
    id: "nether-king-window",
    title: "Nether King: how long is \"recent\"?",
    question: "\"+X% Critical Strike Damage per recent non-Critical Strike, up to 4 stacks\": how long does a non-crit count as recent?",
    evidence: "provisional",
    current: "Provisional: stacks = expected non-crit hits in the last 4 s, capped at 4.",
    alternatives: [{ reading: "A shorter window, or stacks reset on a crit", effect: "fewer stacks: little change on fast hitters, a smaller crit damage bonus on slow ones" }],
    test: "Watch the buff counter while hitting the dummy, then stop and time how long the stacks last.",
    source: "CLAUDE.md (Nether King correction 2026-10-15)",
    appliesWhen: (ctx) => ctx.hasText(/Critical Strike Damage per recent (?:non-)?Critical Strike/i)
  },
  {
    id: "full-mana-sealed",
    title: "Full Mana with Sealed Mana",
    question: "Does Sealed Mana count against Full Mana, the way Sealed Life counts against Full Life?",
    evidence: "provisional",
    current: "Provisional (by analogy with Full Life): Full Mana needs at least 95% of Max Mana unsealed and filled, so this build is not at Full Mana.",
    alternatives: [{ reading: "Sealed Mana is ignored for Full Mana", effect: "the build's \"at Full Mana\" lines turn on" }],
    test: "With Mana sealed by Auras, check whether an \"at Full Mana\" line shows as active on the character panel.",
    source: "CLAUDE.md (Full Life, 2026-10-12); src/line-conditions.js",
    appliesWhen: (ctx) => ctx.hasText(/\bFull Mana\b/i) && (ctx.lineState.manaRemainingPercent ?? 100) < 95
  },
  {
    id: "centralize-fixed-fervor",
    title: "Centralize on a fixed Fervor Rating",
    question: "When hit, can Centralize consume half of a fixed Fervor Rating (Unmatched Valor's 130), and can its +25% Rating on hit raise a fixed Rating?",
    evidence: "provisional",
    current: "Best case not hit (user-confirmed). With the \"Centralize: not hit\" switch off, half of the held Rating is assumed consumed (provisional); whether part 1 raises a fixed Rating is unconfirmed.",
    alternatives: [
      { reading: "A fixed Rating cannot be consumed", effect: "no damage loss when hit" },
      { reading: "Part 1 raises a fixed Rating", effect: "a higher Fervor Rating when hit" }
    ],
    test: "With a fixed Fervor Rating, get hit and watch the Fervor Rating number on the panel.",
    source: "CLAUDE.md (Centralize, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Centralize")
  },
  {
    id: "impermanence-lines",
    title: "Impermanence: do all three lines apply?",
    question: "Do Impermanence's general ±32% Min / Max line and its Physical −90% Min / +80% Max line both apply to Physical damage?",
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-14, not an in-game test): all three apply; every hit gets −32% / +32%, and Physical (converted too) also gets −90% / +80%.",
    alternatives: [{ reading: "The Physical line replaces the general one for Physical damage", effect: "a different Physical average hit; its size depends on the min / max spread" }],
    test: "Compare a Physical skill's panel damage range with and without Impermanence.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Impermanence")
  },
  {
    id: "core-consumption-gain-rate",
    title: "Consumption cores: how often is the stack gained?",
    question: "Thunderclap, Waiting Attack and Stab In The Back spend an Agility Blessing stack or Blur. The build gains it from a source whose rate the planner does not model (Mobility Skill use, evading, Energy Shield charging, crowd control, movement per metre, max-stack grants). How often does that source fire against the dummy?",
    evidence: "unknown",
    current: "Not modeled: the core is left out (badge Not modeled, naming the source). With a modeled source (a timed gain, \"upon inflicting damage. Interval\", a chance on hit or crit, Blur on Reap or per Wilt stacks) the share of casts that find a stack is min(1, gain rate ÷ Main Skill cast rate) (user-confirmed 2026-10-18). What a cast consumes is answered (user-supplied 2026-10-19, Google AI Mode answer): Thunderclap 1 Agility stack per Main Skill cast, Stab In The Back the whole Blur; only the gain rate of these sources stays open.",
    alternatives: [
      { reading: "The source fires at least as often as the Main Skill is cast", effect: "the full bonus on every cast (Thunderclap +35% Lightning, Stab In The Back +30%)" },
      { reading: "The source fires about once per its own cooldown", effect: "a share below 1: a fraction of the bonus" }
    ],
    test: "With the core and only that gain source, watch the Agility stack count (or the Blur icon) while casting the Main Skill at the dummy, and count how often a cast finds a stack.",
    source: "research/core-talents-audit-2026-10-18.md §6 Q5; research/google-ai-mode-answers-2026-10-19.md; src/consumption-procs.js",
    appliesWhen: (ctx) => {
      const consumption = ctx.planner.lineEffects?.state?.consumption;
      return Boolean(consumption) && [consumption.agility, consumption.blur, consumption.waitingAttack].some((item) => item && item.active === null);
    }
  },
  {
    id: "core-thunderclap-held-agility",
    title: "Thunderclap: are Agility stacks held when the casts outpace the gain?",
    question: "Thunderclap spends 1 Agility Blessing stack on each Main Skill cast that finds one. When the build casts faster than it gains Agility, does it still hold Agility stacks (and their +2% additional damage and +4% Attack and Cast Speed each) between casts?",
    evidence: "provisional",
    current: "Provisional (core audit batch B3): when the gain rate keeps up with the cast rate, Agility stays at max stacks; when it does not, each gained stack is spent by the next cast and none are held (Agility's own effect is lost). One stack per Main Skill cast is user-supplied 2026-10-19 (Google AI Mode answer); whether stacks are held between casts is still open.",
    alternatives: [
      { reading: "A gained stack is held until the next cast (half a cast interval on average)", effect: "a little Agility kept: slightly higher damage and speed" },
      { reading: "Thunderclap never lowers the held stacks below 1", effect: "one stack's effect kept: higher damage" }
    ],
    test: "With Thunderclap and a slow Agility source (one stack per second), cast quickly at the dummy and watch the Agility stack count between casts.",
    source: "research/core-talents-audit-2026-10-18.md §5 B3; src/consumption-procs.js",
    appliesWhen: (ctx) => hasCore(ctx, "Thunderclap")
  },
  {
    id: "core-juggernaut-stacks",
    title: "Juggernaut: do your Minions' crits add stacks?",
    question: "Juggernaut gives the enemy a stack on each of your Critical Strikes (8 s, up to 10). Do your Minions' Critical Strikes add stacks too?",
    evidence: "game data (partial)",
    current: "Provisional (core audit batch B4): only your own crits add stacks; Minion crits add none. Answered (user-supplied 2026-10-19): each stack keeps its own 8 s timer, and the Armor part compounds (Armor × 0.9 ^ stacks).",
    alternatives: [
      { reading: "Minion crits add stacks too", effect: "more stacks for Minion builds" }
    ],
    test: "With Juggernaut on a Minion build whose Minions crit, let only the Minions hit the dummy and watch whether its Juggernaut debuff icon gains stacks.",
    source: "research/core-talents-audit-2026-10-18.md §4.4 (Juggernaut), §5 B4; src/combat-states.js",
    appliesWhen: (ctx) => hasCore(ctx, "Juggernaut")
  },
  {
    id: "core-towering-presence-weapon-damage",
    title: "Towering Presence: which weapon damage reaches your Spells?",
    question: "Towering Presence \"Adds 100% of the Main-Hand Weapon damage to Spells\" (game field 2006260, no other reader in the files). Is it the weapon's own damage (its base and local affixes) added as flat damage that the spell's damage effectiveness scales? And does the Scorching Beam take it?",
    evidence: "provisional",
    current: "Provisional: the main-hand weapon's own damage per type (base and local affixes, without the Two-Handed or Off-Hand bonuses) is added to every Spell skill hit as added flat damage, scaled by each skill's damage effectiveness. Attacks don't get it. The Scorching Beam ledger has no added Physical part, so the beam doesn't take it yet. The crit line (game record 838374) adds 75% of the weapon's final rating to each Spell skill's base rating.",
    alternatives: [
      { reading: "The weapon damage is added at full value, not scaled by the skill's damage effectiveness", effect: "higher spell hits for skills under 100% effectiveness" },
      { reading: "The Two-Handed and main-hand bonuses count too", effect: "higher spell hits with a two-hander" }
    ],
    test: "With Towering Presence and a plain weapon, compare a spell's tooltip damage with and without the weapon equipped.",
    source: "research/core-talents-audit-2026-10-18.md §5 B5; src/towering-presence.js",
    appliesWhen: (ctx) => hasCore(ctx, "Towering Presence")
  },
  {
    id: "core-stab-in-the-back-blur",
    title: "Stab In The Back: how long is Blur up?",
    question: "Stab In The Back ends Blur on each Main Skill cast made while Blur is active. Blur's own effects (Blur Rating, Daze, Stealth Stab, the Blur DoT lines) then hold only until the next cast. How much Blur uptime is left?",
    evidence: "provisional",
    current: "Provisional (core audit batch B3): the +30% applies to the share of casts that find Blur, min(1, Blur gain rate ÷ cast rate) (user-confirmed 2026-10-18); a cast consumes the whole Blur (user-supplied 2026-10-19, Google AI Mode answer); Blur's own effects still follow the Blur condition (held), not the consumption.",
    alternatives: [{ reading: "Blur is up only between its gain and the next cast (uptime ≈ the same share)", effect: "lower damage where Blur's own effects matter (Daze, Blur DoT lines, Subtle Impact)" }],
    test: "With Stab In The Back and a Blur source, cast the Main Skill repeatedly and watch how long the Blur icon stays between casts.",
    source: "research/core-talents-audit-2026-10-18.md §5 B3; src/consumption-procs.js; src/blur-effects.js",
    appliesWhen: (ctx) => hasCore(ctx, "Stab In The Back")
  },
  {
    id: "core-three-birds-splits",
    title: "Three Birds with One Stone: do the extra splits hit the dummy?",
    question: "\"+2 to Parabolic Projectile Splits quantity\": do the split projectiles land on the same single target, and how many Splits does Thunderbolt Overload have before the +2?",
    evidence: "user-supplied",
    current: "User-supplied 2026-10-19 (Google AI Mode answer, not tested in game; uncertain): each landing parabolic projectile splits 2 more times, and the splits land as area explosions on the same target at the skill's after-split damage (−50% on Bombard, Corrosive Shot, Flame Jet's bombs), with no Shotgun falloff. Thunderbolt Overload's per-Split bonus is not applied: its base Split count is not in the data.",
    alternatives: [
      { reading: "The splits fly off and need other targets", effect: "no extra damage on one dummy (the reading before 2026-10-19)" },
      { reading: "The splits take Shotgun falloff on the same target", effect: "less than 1 hit per split" }
    ],
    test: "Cast Bombard or Flame Jet at the dummy with and without the core, and count the damage numbers per cast.",
    source: "research/google-ai-mode-answers-2026-10-19.md; src/skill-hit-model.js parabolicSplit",
    appliesWhen: (ctx) => hasCore(ctx, "Three Birds with One Stone") && ctx.setups.some((setup) => (setup.tags || []).includes("Parabolic"))
  },
  // Core audit batch B7 (Minion): a reading still open, shown only with the core.
  {
    id: "core-rally-module-count",
    title: "Rally: how many Module Minions?",
    question: "Rally gives \"Synthetic Troop Minions summoned at a time +1\". A Module's Max Minion Quantity is a placeholder in the game text: does the extra Minion stay within it?",
    evidence: "user-supplied",
    current: "User-supplied 2026-10-19 (Google AI Mode answer, not tested in game; uncertain): +1 Minion per cast, Module summons included, up to the skill's max quantity. The planner counts 1 + 1 Module Minions (the Module's max is not in the data). Synthetic Troop summons with a published maximum are already at it.",
    alternatives: [{ reading: "A Module's max quantity is 1", effect: "×0.5 on the Module's damage (no second Minion)" }],
    test: "Summon a Module with Rally and count the Minions on the field.",
    source: "research/google-ai-mode-answers-2026-10-19.md; src/minion-damage-model.js",
    appliesWhen: (ctx) => hasCore(ctx, "Rally") && ctx.minions.some((minion) => minion.modeled && minion.family === "module")
  },
  {
    id: "joined-force-base",
    title: "Joined Force: 60% of what?",
    question: "Is Joined Force's 60% taken from the off-hand's local base damage (after its own local affixes) and added to the main hand before global multipliers?",
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-14, not an in-game test): yes; speed and crit come from the main hand only.",
    alternatives: [{ reading: "60% of the off-hand's flat added damage only", effect: "lower attack damage" }],
    test: "Compare the main-hand attack damage on the panel with and without Joined Force, and with a different off-hand.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.cores.has("Joined Force")
  },
  {
    id: "steep-strike-attempts",
    title: "Thunder Slash: Steep Strike attempts",
    question: "Does Thunder Slash store one Steep Strike attempt per 2 Multistrikes, checked on each attack, with Cat's Scratch and the skill's Steep increment in one pool?",
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-14/15, not an in-game test): one attempt per 2 repeat attacks, checked per attack; a use with a stored attempt is a Steep Strike.",
    alternatives: [{ reading: "Attempts are counted once per Multistrike sequence", effect: "fewer Steep Strikes per use" }],
    test: "Count Steep Strikes over 20 Thunder Slash uses while standing still.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.steepStrike?.multistrikeAttempts)
  },
  {
    id: "big-stride-window",
    title: "Big Stride: is the window held while moving?",
    question: "Is every attack a Steep Strike while you keep moving, or only the attacks within 4 s after each 8 m moved?",
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-15): the window stays open while moving, so every use is a Steep Strike while \"Moved recently\" is on.",
    alternatives: [{ reading: "One 4 s window per 8 m moved", effect: "fewer Steep Strikes when attacking while repositioning" }],
    test: "Count Steep Strikes while circling the dummy compared with standing still.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => hit.steepStrike?.window)
  },
  {
    id: "blade-cluster-hits",
    title: "Blade Cluster: extra Steep Strike hits",
    question: "Does \"Generates 2 additional Steep Strikes when the supported skill launches a Steep Strike\" mean two more Steep Strike hits on the same target per launch?",
    evidence: "user-supplied",
    current: "User-supplied reading (2026-10-15): yes, the Steep Strike part hits 3 times per launch.",
    alternatives: [{ reading: "2 more stored attempts instead (the earlier reading)", effect: "about ×0.35 on the Erika fixture's sustained figure" }],
    test: "Count the Steep Strike damage numbers per launch on the dummy.",
    source: "CLAUDE.md (Erika batch, 2026-10-14)",
    appliesWhen: (ctx) => ctx.skillHits.some((hit) => (hit.steepStrike?.clusterHits || 0) > 0)
  },
  {
    id: "rate-driven-buffs",
    title: "Buff uptimes taken from hit rates",
    question: "Are these buffs' uptimes right: Tremble's Numbed Effect (crit hits/s × 2 s), Bull's Rage's Euphoria (6 s per Activation Medium trigger or cooldown), Periodic Burst (2 s per 6 s or the Mobility cooldown)?",
    evidence: "provisional",
    current: "Provisional (2026-10-14): uptime from the planner's measured hit rates and cooldowns, capped at 100%.",
    alternatives: [{ reading: "The buff refreshes less often than the rate suggests", effect: "a lower uptime share for that buff" }],
    test: "Watch each buff icon over a 20 s dummy run and time how long it is up.",
    source: "CLAUDE.md (rate-driven buffs 2026-10-14)",
    appliesWhen: (ctx) => [ctx.planner.critNumbedBuffs, ctx.planner.empowerEffects, ctx.planner.periodicBurst].some((state) => activeEntries(state).length > 0)
  },
  {
    id: "shotgun-fan-count",
    title: "How many projectiles of a fan reach the dummy?",
    question: "Standing close, how many projectiles of this skill's fan hit the dummy? Only Chromatic Shot was measured.",
    evidence: "provisional",
    current: "Provisional: about half land standing close, ceil(n / 2), and one at range (observed for Chromatic Shot only).",
    alternatives: [
      { reading: "All projectiles land when close", effect: "more Shotgun hits, each at the falloff coefficient" },
      { reading: "Only one lands", effect: "a single hit per cast" }
    ],
    test: "Within 6 m, count the damage numbers per cast on the dummy, with and without Multiple Projectiles.",
    source: "CLAUDE.md (Shotgun Effect); src/shotgun-effect.js",
    appliesWhen: (ctx) => ctx.components.some(({ hit, component }) => hit.name !== "Chromatic Shot" && ["fan", "half"].includes(component.shotgun?.reach) && (component.shotgun?.count || 0) > 1)
  },
  {
    id: "pantheon-swiftness-aura-effect",
    title: "Pantheon's Elegy: scaled by Aura Effect?",
    question: "Is Precise: Swiftness's gained \"+120% Attack and Cast Speed\" scaled by that Aura's Aura Effect, like its base values?",
    evidence: "provisional",
    current: "Provisional: yes, scaled by the Aura's Aura Effect (precedent: Deep Pain takes the general Aura Effect).",
    alternatives: [{ reading: "A flat +120%, not scaled", effect: "lower Cast Speed with Aura Effect sources" }],
    test: "Read the panel's Cast Speed with and without an Aura Effect source (for example Aura Amplification) on Precise: Swiftness.",
    source: "CLAUDE.md (Pantheon's Elegy, 2026-10-15)",
    appliesWhen: (ctx) => ctx.hasItem("Pantheon's Elegy") && (ctx.setupNames.has("Precise: Swiftness") || ctx.hasText(/Precise: Swiftness/i))
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
    appliesWhen: (ctx) => Boolean(dance(ctx)) && (ctx.planner.heroMemories?.baseTraitLevel || 0) >= 5
  },
  {
    id: "crimson-gash-hits",
    title: "Crimson Gash on Terra hits",
    question: "How do Gash stacks (+12% additional Terra Skill Damage each, up to 8, 3 s) apply to Terra hits? Does each stack keep its own timer?",
    evidence: "unknown",
    current: "Unknown: the damage part is not modeled on hits (it never reaches a Terra skill's own DoT). Its −40% Terra Charge recovery per stack is modeled.",
    alternatives: [{ reading: "Every Terra hit takes the held stacks", effect: "×1.12 per held stack on Terra hits (×2.48 at 8 stacks)" }],
    test: "Compare a Terra hit's damage number at 0 Gash stacks and at several stacks.",
    source: "CLAUDE.md (Crimson Gash); research/selena-traits-2026-10-13.md",
    appliesWhen: (ctx) => ctx.hasItem("Crimson Gash") && Boolean(dance(ctx)?.mainIsTerra) && ctx.skillHits.some((hit) => (ctx.skillHitSetup(hit)?.tags || []).includes("Terra"))
  },
  {
    id: "wind-rhythm-terra",
    title: "Wind Rhythm on a Terra: does Cast Speed speed it up?",
    question: "Does Activation Medium: Wind Rhythm recast the Terra every cooldown ÷ (1 + Cooldown Recovery + share × Cast Speed)?",
    evidence: "provisional",
    current: "Provisional (DonTheCrown's Selena DoT sheet v0.3): yes, with the planner's own Cast Speed for the skill. This cadence feeds The Cycle I Resist and Terra Charge.",
    alternatives: [{ reading: "Cast Speed does not shorten the trigger interval", effect: "far fewer recasts (about 9.5 → 2 per second on the Frost Terra v2 build)" }],
    test: "Count Terra casts over 10 s with Wind Rhythm, then add or remove a Cast Speed source.",
    source: "CLAUDE.md (Wind Rhythm on a recast Terra DoT); research/donthecrown-selena-calc-v0.3.md",
    appliesWhen: (ctx) => Object.keys(ctx.planner.windRhythmTerra || {}).length > 0
  },
  {
    id: "terra-charge-restoration-gap",
    title: "Terra Charge Restoration: +10% unaccounted",
    question: "On the Frost Terra v2 build the panel reads 115.5% Terra Charge Restoration; the planner finds 105.5% (Growth Ring 30 + Ground Divide 75.5). Where do the other +10% come from?",
    evidence: "unknown",
    current: "Unknown: only the listed sources are counted.",
    alternatives: [{ reading: "A missing +10% source", effect: "slightly faster Terra Charge" }],
    test: "Remove items, slates and kismets one at a time and watch the panel's Terra Charge Restoration.",
    source: "CLAUDE.md (item-granted supports, Frost Terra v2)",
    appliesWhen: (ctx) => Boolean(dance(ctx)?.mainIsTerra) && (dance(ctx)?.charges?.recoverySources || []).length > 0
  },
  {
    id: "ill-omen-reap-purification",
    title: "Ill Omen with Reap Purification on a Boss",
    question: "With Reap Purification, does every Ill Omen stack deal 2.5% Max Life as True Damage on a Boss continuously, bypassing the once-only Boss rule?",
    evidence: "provisional",
    current: "Provisional (the user's source): yes, continuous on every tier.",
    alternatives: [{ reading: "The Boss lockout still applies", effect: "Ill Omen fires once on a Boss" }],
    test: "A long Boss or dummy run with Reap Purification, watching for repeated True Damage numbers.",
    source: "src/ill-omen.js; research/google-ai-mode-answers-2026-10-13.md",
    appliesWhen: (ctx) => Boolean(ctx.planner.illOmen?.reapPurification?.active)
  },
  {
    id: "trauma-town-sheet-gap",
    title: "Trauma: town sheet additional damage",
    question: "The in-game town sheet's general additional damage (3457%, ×35.57 on the Trauma fixture) is far below the planner's hit ledger (×229). Which combat layers does the game leave out of that line?",
    evidence: "unknown",
    current: "Unknown: the ledger keeps the combat layers (Tide, Idyll, Aim, Blur, Supercharge, Focus Blessing, Feud); nothing fitted.",
    alternatives: [{ reading: "The town sheet only excludes combat buffs", effect: "no change to dummy figures" }],
    test: "The in-game breakdown of the additional damage line in town and in combat.",
    source: "CLAUDE.md (generic ailment engine, open gap)",
    appliesWhen: (ctx) => Boolean(ctx.ailments.trauma?.modeled)
  },
  {
    id: "bard-song-non-channeled",
    title: "Bard Song on non-channeled skills",
    question: "In Bard, non-channeled skills channel Bard Song into a bubble that uses the skill. What are its channel interval and max stacks, and does that use count as Channeled?",
    evidence: "unknown",
    current: "Unknown: not modeled; those skills keep their normal casts.",
    alternatives: [{ reading: "Bard Song changes their cadence and takes the −20% Channeled penalty", effect: "lower damage for these skills; size unknown" }],
    test: "Time the Bard Song bubbles for one of these skills and compare its damage with and without Bard.",
    source: "research/selena-traits-2026-10-13.md (T5, Q3)",
    appliesWhen: (ctx) => ctx.heroId === "selena-sing-with-the-tide" && (ctx.planner.singWithTheTide?.bardSong?.skills || []).length > 0
  },
  {
    id: "scorching-beam-bard-residual",
    title: "Scorching Beam: Bard bubble share",
    question: "The Bard bubble part of Scorching Beam comes from a no-gear calibration, scaled to this build's Fire Resistance and Scorch uptime. Does it scale that way?",
    evidence: "provisional",
    current: "Provisional: the measured Bard residual, with Fire Resistance scaled from the level-85 dummy calibration (30%) and Scorch uptime estimated from chance and duration.",
    alternatives: [{ reading: "The bubble scales differently with resistance and Scorch", effect: "only the Bard-related part of the beam figure moves" }],
    test: "A Scorching Beam dummy run in Bard with Scorch on and off.",
    source: "src/scorching-beam-delivery.js; research/dummy-54s-gap-2026-10-09.md",
    appliesWhen: (ctx) => ctx.heroId === "selena-sing-with-the-tide" && ctx.setupNames.has("Scorching Beam") && Boolean(ctx.planner.bardDelivery?.applicable) && Boolean(ctx.planner.bardDelivery?.extrapolatedConditions)
  },
  {
    id: "follower-affix-third-slot",
    title: "Tartarus Skill: what can the third support slot hold?",
    question: "A tier III Tartarus Skill has two random support slots and an 'Empty Support Skill Slot or Random Support Skill'. Does that third slot roll from the skill's Drop pool when it drops, and does Tempering fill an empty one from the Forge pool only?",
    evidence: "provisional",
    current: "Provisional: the third slot takes either a Drop affix (rolled on drop) or a Forge affix (Tempering), so the planner offers both pools there and only the Drop pool in the first two slots (TLIDB pools; game text: Tempering has a 20% chance to fill the empty slot).",
    alternatives: [
      { reading: "The third slot only ever holds a Tempering (Forge) affix", effect: "Drop affixes leave the third slot's list" },
      { reading: "Tempering can roll any affix of the skill", effect: "Forge affixes also join the first two slots' lists" }
    ],
    test: "Look at a few tier III Tartarus Skills that dropped with a filled third slot, and at one Tempered skill: which affixes appear in the third slot?",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => followerAffixes(ctx).some((item) => item.slot === 2)
  },
  {
    id: "follower-affix-pain-amplification",
    title: "Pain Amplification (follower): whose Affliction, and does the DoT taken reach you?",
    question: "The follower skill's Pain Amplification clears 10 Affliction when it deals damage (every 2 s) and gives +12% additional Damage Over Time taken for 8 s. Does it clear your Affliction on the dummy, and does the +12% reach your damage over time?",
    evidence: "unknown",
    current: "Not modeled: neither the Affliction clear nor the +12% Damage Over Time taken is applied.",
    alternatives: [
      { reading: "+12% DoT taken reaches your DoT; the clear touches only the follower's own Affliction", effect: "about ×1.12 on your damage over time while the follower hits" },
      { reading: "It also clears 10 of your Affliction every 2 s", effect: "your Affliction average drops; the net effect depends on your Affliction rate" }
    ],
    test: "Dummy run with a DoT build: the follower skill with and without Pain Amplification, comparing the Affliction readout and the damage.",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => hasFollowerAffix(ctx, "Pain Amplification")
  },
  {
    id: "follower-scorching-pulse-stacks",
    title: "Scorching Pulse (follower): how long does each Reaping Duration stack last, and how fast does the follower Reap?",
    question: "Origin Tartarus: Scorching Pulse gives '+30% Reaping Duration for the Follower and allies for each Reaping dealt recently. Stacks up to 10'. Does each stack keep its own 4 s, or does a new stack refresh all of them? And are the follower's Reap sources read right: Rekindled Embers' extra cast (no cast time, cooldown untouched, nothing rolled inside its 1 s gate), Reaping Agony (one Reap per 1 s per copy while the follower's DoT is on the dummy) and Rising Heat (+3% per whole +5% of your Reaping Recovery Speed)?",
    evidence: "game data (partial)",
    current: "Game data: the stack affix (16649485) fires on the follower's own Reaping event (trigger 1000032), so your Reaps add none, and grants a 4 s stack (node 306, stacking mode 3, up to 10) to the follower and its allies. The planner reads each stack as keeping its own 4 s: stacks = min(10, the follower's Reaps in the last 4 s), with Reaps/s = its Scorching Pulse casts + Rekindled Embers' extra casts (20% per cast, p ÷ (1 + p × casts inside the 1 s gate)) + 1 per second per Reaping Agony while its DoT is up (ceil(DoT s ÷ 1 s) per DoT window otherwise). Base cadence: 1 stack (+30%). The 5 s / 20 s windows build the stacks from 0. Rising Heat adds min(300, 3 × whole 5% steps of your Reaping Recovery Speed) to the follower's Reap duration only.",
    alternatives: [
      { reading: "Each new stack refreshes all stacks", effect: "a follower that Reaps more often than every 4 s (Cooldown Reduction, Rekindled Embers, Reaping Agony) builds to 10 stacks: up to +300%" },
      { reading: "Rekindled Embers' extra cast resets or uses the cooldown, or rolls again", effect: "fewer or more extra casts than 20% of the follower's casts" },
      { reading: "Reaping Agony's 1 s gate is shared by all copies, or Reaps whenever any follower damage ticks", effect: "at most 1 Reap a second from Reaping Agony in total, or more than 1 per copy" },
      { reading: "Rising Heat scales smoothly (3/5 per 1%) rather than per whole 5%", effect: "up to +2.4% more on the follower's Reap duration" }
    ],
    test: "Equip Origin Scorching Pulse on a Witch Rat and hit the dummy with a DoT build. Count the Reaping Duration buff stacks next to your buff bar: about 1 at the base cadence; then add Cooldown Reduction / Rekindled Embers / Reaping Agony (with a follower DoT such as Black Hole or Additional Ignite) and check whether the count matches 4 × the follower's Reaps per second or climbs to 10.",
    source: "research/followers/scorching-pulse-2026-10-19.md",
    appliesWhen: (ctx) => (ctx.planner.follower?.selection?.skills || []).some((entry) => entry.skill?.name === "Origin Tartarus: Scorching Pulse")
  },
  {
    id: "follower-affix-catalyst",
    title: "Catalyst (follower): whose Affliction rises?",
    question: "Catalyst on a follower skill reads '+50 Affliction inflicted per second'. Is that the follower's own Affliction rate, or does it raise the Affliction on the dummy that your damage over time reads?",
    evidence: "unknown",
    current: "Not modeled: no Affliction is added.",
    alternatives: [{ reading: "It adds to the dummy's Affliction your DoT reads", effect: "a higher Affliction average for your damage over time" }],
    test: "Dummy run with a DoT build: the Affliction readout with the follower skill with and without Catalyst.",
    source: FOLLOWER_AFFIX_NOTES,
    appliesWhen: (ctx) => hasFollowerAffix(ctx, "Catalyst")
  },
  {
    id: "follower-special-plague",
    title: "Plague (ULT follower): whose Wilt gains the Non-Erosion Damage taken?",
    question: "The Plague letter's special effect reads '-30% additional Wilt Duration' and 'Inflicted Wilt gains an additional effect: +1% additional Non-Erosion Damage taken (multiplies)'. Does it act on your Wilt on the dummy or only on Wilt the follower inflicts, and is the +1% per Wilt stack?",
    evidence: "game data (partial)",
    current: "Not modeled: neither line is applied (game modifier 600000008 stores -30 and 1; the follower's Witch Rat skills inflict no Wilt unless a support affix adds a Wilt chance).",
    alternatives: [
      { reading: "Your Wilt gains it, +1% per stack (multiplies)", effect: "up to about ×1.35 on your non-Erosion damage at 30 Wilt stacks, and your Wilt lasts 30% less" },
      { reading: "Only the follower's own Wilt gains it", effect: "nothing for a build whose follower inflicts no Wilt" }
    ],
    test: "Dummy run with a Wilt build and a non-Erosion hit: the Plague follower against another Witch Rat letter, comparing the hit damage and the Wilt duration.",
    source: FOLLOWER_LETTER_NOTES,
    appliesWhen: (ctx) => ctx.planner.follower?.selection?.follower?.id === "plague"
  },
  {
    id: "follower-special-barbarian-intimidation",
    title: "Wild Barbarian King (ULT follower): whose Steep Strike inflicts Barbarian Intimidation?",
    question: "The Wild Barbarian King letter's special effect 'Inflicts Barbarian Intimidation on enemies when Steep Strike hits an enemy' (game buff: +15% additional Critical Strike Damage taken for 5 s). Do your Steep Strikes inflict it, or only the follower's own (its Mammoth skills launch none)?",
    evidence: "game data (partial)",
    current: "Not modeled: no Critical Strike Damage taken is applied (the value is from the game's buff data; TLIDB does not publish it).",
    alternatives: [{ reading: "Your Steep Strikes inflict it", effect: "+15% additional Critical Strike Damage taken on the crit share of your hits while you land Steep Strikes" }],
    test: "Dummy run with a Steep Strike build and crits: the Wild Barbarian King follower against another Mammoth letter, comparing the crit damage.",
    source: FOLLOWER_LETTER_NOTES,
    appliesWhen: (ctx) => ctx.planner.follower?.selection?.follower?.id === "wild-barbarian-king"
  }
]);

/** The registry entries that apply to this build (planner result + state). A failing check counts as not applying. */
export function openQuestionsFor(planner, state = planner?.state) {
  if (!planner) return [];
  const ctx = openQuestionContext(planner, state);
  return OPEN_QUESTIONS.filter((entry) => {
    try { return Boolean(entry.appliesWhen(ctx)); } catch { return false; }
  });
}

/** Plain text for pasting into Discord or Reddit: title, question, planner now, alternatives, test. */
export function openQuestionsText(entries = []) {
  return entries.map((entry, index) => [
    `${index + 1}. ${entry.title}`,
    `Question: ${entry.question}`,
    `Planner now: ${entry.current}`,
    "Alternatives:",
    ...entry.alternatives.map((alt) => `- ${alt.reading} — ${alt.effect}`),
    `How to test: ${entry.test}`
  ].join("\n")).join("\n\n");
}

// "Submit an answer" (src/open-questions-panel.js): the URL builder lives with the other report links.
export { ANSWER_REPO, ANSWER_TEMPLATE, ANSWER_URL_MAX, answerIssueUrl } from "./feedback-links.js";
