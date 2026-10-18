import { normalizePercentageText } from "./percentage-text.js";
import { yougaClauseKey, yougaLineStatus } from "./youga-ultimate-one.js";

// Youga clause → badge module (src/youga-ultimate-one.js YOUGA_PATTERNS).
const YOUGA_GROUPS = Object.freeze({
  coreShare: "yougaCore", nonMain: "yougaCore", coreGrant: "yougaCore", moonTangle: "yougaCore", moonDamage: "yougaCore",
  recalled: "yougaRecall", huntCast: "yougaRecall", huntTrack: "yougaRecall", huntRecall: "yougaRecall", huntPenetration: "yougaRecall",
  claimGain: "yougaVault", claimExtend: "yougaVault", doomDefer: "yougaVault", doomInversion: "yougaVault",
  threadsLinks: "yougaChains", threadsCooldown: "yougaChains", threadsTransfer: "yougaChains", threadsRatio: "yougaChains", commandGain: "yougaChains", commandDominion: "yougaChains",
  measureExtend: "yougaSelves", measureEffect: "yougaSelves", measureDuration: "yougaSelves", liftSummon: "yougaSelves", liftRestore: "yougaSelves", liftDamage: "yougaSelves"
});

// Per-hero trait mechanics (research/talent-batch-2026-10-12.md §6.2, chunk 4). Trait lines join planner.modifierTexts
// (origin "trait"), so plain clauses already reach every engine; this module reads the hero-specific states the plain
// readers cannot. There is no in-game reference run for any of them yet, so every module is Provisional, with its
// assumptions listed, and §9 names the run that would check it. A module is implemented only where the trait text and the
// keyword tooltips define it; where the cycle is left undefined it stays Not modeled with the reason (no guessed cadence).

const num = (text) => Number(String(text).replace("−", "-"));
const round = (value) => Math.round(value * 10000) / 10000;

export const HERO_MODULES = Object.freeze([
  { key: "ammo", heroes: /^carino-/, label: "Carino: ammo", status: "Provisional",
    rule: "\"Projectile Skills consume ammo\": the \"when consuming ammo\" bonuses apply to Projectile skills. Every Projectile cast is read as consuming ammo (Ranger of Glory: Projectile Skills are unavailable while reloading; Lethal Flash / Zealot of War: assumed). Reload downtime and Special Ammo are not modeled." },
  { key: "illusion", heroes: /^youga-spacetime-illusion$/, label: "Youga: Spacetime Illusion", status: "Provisional",
    rule: "\"The Spacetime Illusion uses your Main Skill once every 1.5 s. The Spacetime Illusion's castings are considered your castings\": an extra stream of Main Skill uses at (1 ÷ 1.5 s) × (1 + Spacetime Illusion Cast Frequency), each a full use of the Main Skill (modeled skill hits only). Cooldown-scaled Cast Frequency (Me and Myself) is not read." },
  { key: "purgatory", heroes: /^gemma-flame-of-pleasure$/, label: "Gemma: Purgatory", status: "Provisional",
    rule: "Purgatory lasts 5 s (+ \"Purgatory Duration\" lines) with an 8 s cooldown and is auto-cast whenever available: uptime = duration ÷ cooldown (≤ 1), the dummy inside it (it follows the player). The ≤ 1 s auto-cast check delay is ignored (an upper bound). Its damage-taken and Fire lines apply at that uptime in sustained figures; the 5 s / 20 s windows and the recount follow the casts from t = 0 (best case)." },
  { key: "crimsonTide", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Crimson Tide", status: "Provisional",
    rule: "\"Creates a Crimson Tide while the Main Terra Skill lasts\": user-confirmed 2026-10-13, the Crimson Tide (and its \"+X% additional damage taken by enemies affected by Crimson Tide\") is active whenever a Main Terra Skill is active; it does not need movement (keyword 80060's \"while moving\" clause is its knockback / Slow, not the damage taken). The dummy (within 10 m, inside the Main Terra Skill that follows you) is affected the whole time; the line reaches hits and DoTs." },
  // Selena (Dance of the Deep) path clauses (Selena traits batch 2026-10-13; src/selena-dance.js applies the defined ones).
  { key: "danceTerra", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Main Terra Skill", status: "Provisional",
    rule: "The Main Terra Skill is centred on you and follows you (the dummy inside its area: best case); Terra skills that are not the Main Skill deal no damage (src/selena-dance.js)." },
  { key: "terraCharge", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Terra Charge", status: "Provisional",
    rule: "Keyword 151 / manual 1001011320: a Terra cast consumes all its charges, each enhancing the skill. Charges consumed per cast = min(Max Terra Charge Stacks, charges gained over one cast interval) at the planner's recast cadence; Max Terra Charge = 1 + \"Max Terra Charge Stacks +N\" + Layered Hem's share of the Max Spell Burst increase; Terra Charge Recovery Speed shortens the 0.5 s charge interval; Artificial Moon sets 32% per charge (src/selena-dance.js)." },
  { key: "paradise", heroes: /^selena-dance-of-the-deep$/, label: "Selena: The Paradise I Curse", status: "Provisional",
    rule: "\"Enemies within the Main Terra Skill's area are cursed with Lv. 1 Ominous\": with an active Main Terra Skill the dummy is Cursed, so \"against Cursed enemies\" lines hold. Ill Omen is modeled in src/ill-omen.js (best-case Elite loop). This Ominous does not take a curse slot (user-confirmed 2026-10-13)." },
  { key: "danceStep", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Dance Step", status: "Not modeled",
    rule: "Crimson Endless Dance: \"Enters a random Dance Step state when casting a Main Terra Skill\" (game text 345425120: Crimson Dash, Agonizing Revival, Eternal Sleep). Left unmodeled by user decision (2026-10-13): the step is random. Only Eternal Sleep would touch damage (\"+X% additional damage taken ... Ends after taking damage equal to Y% of Max Life\"; X, Y and the stay time are not published)." },
  { key: "crimsonShade", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Crimson Shade", status: "Not modeled",
    rule: "Keyword 80061: a Crimson Shade does not move and casts your Main Terra Skill once centred on itself. Whether its Terra reaches the dummy, whether it consumes or gains Terra Charge, and how many Shades stand at once over a cast cycle are not defined." },
  { key: "cycleResist", heroes: /^selena-dance-of-the-deep$/, label: "Selena: The Cycle I Resist", status: "Provisional",
    rule: "TLIDB / game affixes 480006336, 591569216: 25% of the Critical Strike Rating increase is added to Terra Skill Duration; on a Terra cast while the previous Main Terra Skill lasts, Reap roll% (6–10) of its remaining duration (Reaping Duration applies). Modeled as a Reaping source at the Main Terra recast interval Δt: roll% × (T − Δt) s per Reap, T = 6 s × (1 + Terra Skill Duration % incl. the crit share); no internal cooldown, so every recast Reaps (user, 2026-10-13: the tooltip shows none; no cooldown node in either game record) (src/selena-dance.js resolveCycleResist). User-confirmed 2026-10-13: every Critical Strike Rating increase / decrease reaching the Main Terra counts (Minion and other skill types excluded), and the Reap settles every DoT on the dummy. Provisional: a skill-hit Terra's recast policy." },
  { key: "activationMediumTerra", heroes: /^selena-dance-of-the-deep$/, label: "Selena: Activation Medium: Terra", status: "Provisional",
    rule: "TLIDB Activation_Medium_Terra (captured 2026-10-13; user-stated reading confirmed): seals 20% Mana (Life with Drenched Hem); with an enemy within 25 m, triggers the supported Terra skill when Terra Charge reaches max (no use time: a DoT Terra recasts every Max Terra Charge × charge interval and consumes them all), −30% Movement Speed for 2 s; +30% additional damage for the supported skill (hits and its own DoT, the support rule). Silencing Severance also stops other Activation Mediums on the Main Skill. Sealed Mana Compensation does not reduce the 20% seal (user-confirmed 2026-10-13). Provisional: a skill-hit Terra keeps its recast-on-expiry cadence." },
  { key: "rage", heroes: /^rehan-/, label: "Rehan: Rage / Berserk", status: "Not modeled",
    rule: "Max Rage, when Berserk ends (Anger) and Burst's damage are not in the trait text or the keyword tooltips, so the Rage level and Berserk uptime are undefined." },
  // Erika (Wind Stalker) batch 2026-10-14 (src/erika-wind-stalker.js applies the defined clauses through the Multistrike
  // sequence of src/skill-hit-model.js; these entries carry the badges, from state.windStalker).
  { key: "stalker", heroes: /^erika-wind-stalker$/, label: "Erika: Stalker", status: "Provisional",
    rule: "TLIDB keyword Stalker: \"+13% additional damage during Multistrike for every stack of Stalker. Initial max stacks: 3. Lasts for 4s\". Stacks held = min(max stacks, gains per second × 4 s): gains from movement (Moving) or 1 per Max Multistrike Count event (Cat's Punches); Cat's Vision raises the max by 1 per event, up to +3; Cat's Punches adds +1 initial Multistrike Count per 3 stacks. Provisional: \"during Multistrike\" = the repeated attacks; the initial count shifts every count of the sequence (src/skill-hit-model.js multistrikeSequence); Cat's Scratch's increment is held while events come within 4 s. 2026-10-14: Interest (share × the build's Movement Speed, capped, as additional Attack Damage), Cat Dive (per-level value × Movement Speed % chance per repeated attack to take the Max Multistrike Count attack's increment; user-confirmed reading, provisional) and Artificial Moon's Mark (+30% Mark Effect while Stalker is held) are read; Movement Speed is held in full (movement is constant, user rule)." },
  { key: "theaBlessings", heroes: /^thea-/, label: "Thea: Blessing cycle", status: "Not modeled",
    rule: "A Divine Blessing every 2 s in the order Focus, Agility, Tenacity: the Blessing duration is not in the trait text or the keyword tooltips, so how many stacks the cycle holds is undefined. God's Boon and the Divine Realm cycles are not modeled." },
  // Youga – The Ultimate One (2026-10-17; src/youga-ultimate-one.js settles the clauses, src/planner.js applies them to the skill
  // Clockwork Core supports): plain stat lines (Cooldown Recovery Speed, Skill Effect Duration, Movement Speed) reach the generic
  // readers; the board changes are applied by src/trait-board-grants.js. Each clause below is read from state.yougaUltimateOne
  // (yougaLineStatus: In calc / Inactive / Not on dummy / No DPS effect, with the reason).
  { key: "yougaCore", heroes: /^youga-the-ultimate-one$/, label: "Youga: Clockwork Core", status: "Provisional",
    rule: "I Am the Ultimate One: the Core's additional damage from the Cooldown Recovery Speed and Skill Effect Duration bonuses (180% of the increased pools, capped), Clockwork Core on the Main Skill (every Tangle attached to the Core triggers the skill at its casting interval, user-supplied 2026-10-18; only these Core triggers hit, the player's casts only summon or move the Core: user-decided 2026-10-18 from game-code evidence; the Core's crit cooldown reduction; Core bonuses reach the skill), the non-Main Tangle and Spell Burst blocks, and Artificial Moon (+1 Max Tangle Quantity and +20% additional Core damage per +1 Max Sentry Quantity). Provisional readings: src/youga-ultimate-one.js header." },
  { key: "yougaRecall", heroes: /^youga-the-ultimate-one$/, label: "Youga: Recall", status: "Provisional",
    rule: "Recall while Stasis Vault is active: a projectile that passes through the dummy (always Penetrate), touches the vault and is Recalled hits the dummy again, once per Recall at full damage, for Core-triggered casts inside the Vault (the player's casts fire nothing: user-decided 2026-10-18; Max Recall Count: base 1, once per trajectory, + I Will Hunt You Down's +1 per Jump, up to +2: user-supplied 2026-10-18); the Recalled-only damage lines; I Will Hunt You Down's Cast Speed penalty on the Core's triggers only while the Vault is active (user-supplied 2026-10-18). The return path crossing the dummy: provisional (switch \"Recalled projectiles hit the dummy\")." },
  { key: "yougaVault", heroes: /^youga-the-ultimate-one$/, label: "Youga: Stasis Vault", status: "Provisional",
    rule: "Stasis Vault pressed on cooldown (Trait Skill switch): uptime min(1, 8 s × Skill Effect Duration ÷ cooldown); I Come to Claim My Due's Centralization (2 per Recall, 4 s each) and its Vault extension at 20+ stacks; I See No Doomsday Today is defensive (No DPS effect)." },
  { key: "yougaChains", heroes: /^youga-the-ultimate-one$/, label: "Youga: Chains of Enslavement", status: "Provisional",
    rule: "Chains of Enslavement transfer damage between linked enemies (Not on dummy: one enemy); I Command All's Governance from hits on the linked Elite dummy while Supreme Descent is pressed on cooldown (link duration unpublished: held, provisional); Absolute Dominion stops non-Boss enemies only (Not on dummy)." },
  { key: "yougaSelves", heroes: /^youga-the-ultimate-one$/, label: "Youga: Selves of All Realms", status: "Provisional",
    rule: "Selves of All Realms pressed on cooldown: its Alternate Spacetime Youga effect on the supported skill at its uptime; I Am the Measure of All Time (cooldown extended by Cooldown Recovery Speed, capped at 24 s; +X% effect scales each value and cap; duration increases at 200%); I Need Not Lift a Finger's +X% additional Core damage while active and 4 s after. Provisional." },
  { key: "yougaOther", heroes: /^youga-the-ultimate-one$/, label: "Youga: other clauses", status: "Not modeled",
    rule: "A Youga clause this model has no reader for (a wording that differs from the TLIDB text)." },
  { key: "holyDomain", heroes: /^rosa-high-court-chariot$/, label: "Rosa: Holy Domain", status: "Not modeled",
    rule: "Murderous Intent (4 per second, 15 per Holy Domain) is defined, but how long a Holy Domain lasts is not, so the \"+44% additional damage while inside the Holy Domain\" uptime is undefined." },
  { key: "frostfire", heroes: /^gemma-ice-fire-fusion$/, label: "Gemma: Frostfire Rampage", status: "Not modeled",
    rule: "Frostfire Rampage (5 s, 10 s cooldown) starts after 5 Fire or Cold casts; whether casts during the cooldown count is not in the text, so the cycle is undefined." }
]);

const PATTERNS = {
  ammoProjectile: /^\+(\d+(?:\.\d+)?)% additional Projectile Damage when consuming ammo$/i,
  ammoDamage: /^\+(\d+(?:\.\d+)?)% additional damage when consuming ammo$/i,
  illusionUse: /^The Spacetime Illusion uses your Main Skill once every ([\d.]+) s\. The Spacetime Illusion ?'s castings are considered your castings$/i,
  illusionFrequency: /^\+(\d+(?:\.\d+)?)% Spacetime Illusion Cast Frequency$/i,
  illusionDamage: /^([+-]?\d+(?:\.\d+)?)% additional Spacetime Illusion Damage$/i,
  illusionUnableMain: /^Unable to cast the Main Skill$/i,
  illusionLimit: /^\+(\d+) Spacetime Illusion upper limit$/i,
  purgatoryBase: /^Purgatory has an initial radius of \d+ m, lasts for ([\d.]+) s, and has a cooldown of ([\d.]+) s$/i,
  purgatoryDuration: /^\+?([\d.]+) s Purgatory Duration$/i,
  purgatoryTaken: /^\+(\d+(?:\.\d+)?)% additional damage taken by enemies within the range of Purgatory$/i,
  purgatoryFire: /^\+(\d+(?:\.\d+)?)% additional Fire Damage against enemies within the range of Purgatory$/i,
  crimsonCreate: /^Creates a Crimson Tide while the Main Terra Skill lasts$/i,
  crimsonTaken: /^\+(\d+(?:\.\d+)?)% additional damage taken by enemies affected by Crimson Tide$/i
};
const MODULE_LINES = {
  ammo: /ammo|magazine|Magic Shot|reload/i,
  rage: /\bRage\b|Berserk|\bBurst\b|Seething Spirit/i,
  stalker: /Stalker|Multistrike damage increment for [\d.]+ s when the Max Multistrike Count|^During Multistrike ?, there is a|of the increase\/decrease on Movement Speed is also applied to additional Attack Damage/i,
  theaBlessings: /Divine Blessing|God's Boon|Divine Realm/i,
  holyDomain: /Holy Domain|Murderous Intent/i,
  frostfire: /Frostfire Rampage/i,
  yougaCore: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaCore" },
  yougaRecall: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaRecall" },
  yougaVault: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaVault" },
  yougaChains: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaChains" },
  yougaSelves: { test: (text) => YOUGA_GROUPS[yougaClauseKey(text)] === "yougaSelves" },
  yougaOther: { test: (text) => !yougaClauseKey(text) && /Clockwork Core|tangled|Tangle|Spell Burst|Recall|Stasis Vault|Supreme Descent|Selves of All Realms|Chains of Enslavement|Governance|Centralization/i.test(text) },
  illusion: /Spacetime Illusion/i,
  purgatory: /Purgatory/i,
  crimsonTide: /Crimson Tide/i,
  danceTerra: /^The Main Terra Skill is always centered on you and follows you$|^Non-Main Terra Skill cannot deal damage$/i,
  terraCharge: /Terra Charge/i,
  paradise: /are cursed with Lv\. \d+ Ominous/i,
  danceStep: /Dance Step/i,
  crimsonShade: /Crimson Shade/i,
  cycleResist: /Terra Skill Duration|previous Main Terra Skill/i,
  activationMediumTerra: /Activation Medium/i
};

/** The module a trait line belongs to for this hero, or null. */
export function heroModuleFor(heroId, text) {
  for (const module of HERO_MODULES) if (module.heroes.test(heroId || "") && MODULE_LINES[module.key].test(text)) return module;
  return null;
}

/**
 * @param {object[]} modifierTexts planner.modifierTexts (trait lines have origin "trait")
 * @param {object} state src/planner.js lineConditionState (heroId, activeTags, mainIsTerra)
 * @returns {{ entries, derived, illusion }}
 */
export function resolveHeroModules(modifierTexts = [], state = {}) {
  const heroId = state.heroId || "";
  const traits = modifierTexts.filter((line) => line.origin === "trait").map((line) => ({ ...line, clean: normalizePercentageText(String(line.text ?? "")).replace(/\s+/g, " ").trim() }));
  const entries = [], derived = [];
  // Clocked effects for the windows and the recount (src/timed-effects.js; Purgatory's casts).
  const timedEffects = [];
  let illusion = null;
  const derive = (text, source, conditionText) => derived.push({ text, source, origin: /damage taken$/i.test(text) ? "derived" : "trait", multiplier: 1, derivedFrom: source, lineEffect: { conditional: true, key: "heroModule", conditionText, provisional: true } });
  const entry = (line, module, active, conditionText, bodies = []) => entries.push({ source: line.source, origin: "trait", text: line.clean, active, conditionText: `${module.label}: ${conditionText}`, status: module.status === "Not modeled" ? "Not modeled" : active ? "In calc" : "Inactive", provisional: true, bodies: bodies.map((text) => ({ body: text, derivedText: active ? text : null, readers: ["hero"] })), condition: "heroModule", group: null, module: module.key });
  const moduleFor = (line) => heroModuleFor(heroId, line.clean);
  const projectile = (state.activeTags || new Set()).has("Projectile");
  for (const line of traits) {
    const module = moduleFor(line);
    if (!module) continue;
    if (module.status === "Not modeled") { entry(line, module, false, module.rule); continue; }
    // Youga – The Ultimate One (src/youga-ultimate-one.js yougaLineStatus): each clause's status and reason from the Clockwork
    // Core / trait-skill state (build-level before the hits, settled after them).
    if (/^youga/.test(module.key)) {
      const read = yougaLineStatus(state, yougaClauseKey(line.clean));
      if (!read) { entry(line, { ...module, status: "Not modeled" }, false, "this Youga clause is not read"); continue; }
      entries.push({ source: line.source, origin: "trait", text: line.clean, active: read.status === "In calc", conditionText: `${module.label}: ${read.reason}`, status: read.status, provisional: true, bodies: [], condition: "heroModule", group: null, module: module.key });
      continue;
    }
    let match;
    if (module.key === "ammo") {
      if ((match = line.clean.match(PATTERNS.ammoProjectile)) || (match = line.clean.match(PATTERNS.ammoDamage))) {
        const text = `+${round(num(match[1]))}% additional Projectile Damage`;
        entry(line, module, projectile, projectile ? "every Projectile cast consumes ammo (reload downtime not modeled; provisional)" : "no active Projectile skill", [text]);
        if (projectile) derive(text, line.source, "consuming ammo");
      } else entry(line, { ...module, status: "Not modeled" }, false, "ammo, magazine, reload and Special Ammo states are not modeled");
      continue;
    }
    if (module.key === "illusion") {
      if ((match = line.clean.match(PATTERNS.illusionUse))) {
        const frequency = traits.filter((item) => PATTERNS.illusionFrequency.test(item.clean)).reduce((sum, item) => sum + num(item.clean.match(PATTERNS.illusionFrequency)[1]), 0);
        const damage = traits.filter((item) => PATTERNS.illusionDamage.test(item.clean)).reduce((factor, item) => factor * (1 + num(item.clean.match(PATTERNS.illusionDamage)[1]) / 100), 1);
        const extraIllusions = traits.filter((item) => PATTERNS.illusionLimit.test(item.clean)).reduce((sum, item) => sum + num(item.clean.match(PATTERNS.illusionLimit)[1]), 0);
        const playerCasts = !traits.some((item) => PATTERNS.illusionUnableMain.test(item.clean));
        illusion = { intervalSeconds: num(match[1]), castFrequencyPercent: frequency, count: 1 + extraIllusions, usesPerSecond: (1 + extraIllusions) * (1 + frequency / 100) / num(match[1]), damageFactor: damage, playerCasts, source: line.source };
        entry(line, module, true, `${round(illusion.usesPerSecond)} extra Main Skill uses/s (${illusion.count} Illusion${illusion.count > 1 ? "s" : ""} × (1 + ${frequency}% Cast Frequency) ÷ ${illusion.intervalSeconds} s)${damage !== 1 ? `, ×${round(damage)} Illusion damage` : ""}${playerCasts ? "" : "; the player casts no Main Skill"}`);
      } else if (PATTERNS.illusionFrequency.test(line.clean) || PATTERNS.illusionDamage.test(line.clean) || PATTERNS.illusionUnableMain.test(line.clean) || PATTERNS.illusionLimit.test(line.clean)) entry(line, module, true, "read by the Spacetime Illusion stream");
      else entry(line, { ...module, status: "Not modeled" }, false, "this Spacetime Illusion clause is not read");
      continue;
    }
    if (module.key === "purgatory") {
      const base = traits.map((item) => item.clean.match(PATTERNS.purgatoryBase)).find(Boolean);
      const duration = (base ? num(base[1]) : 5) + traits.filter((item) => PATTERNS.purgatoryDuration.test(item.clean)).reduce((sum, item) => sum + num(item.clean.match(PATTERNS.purgatoryDuration)[1]), 0);
      const cooldown = base ? num(base[2]) : 8;
      const uptime = Math.min(1, duration / cooldown);
      const text = `uptime ${round(uptime * 100)}% (${round(duration)} s every ${cooldown} s; auto-cast delay ignored: provisional)`;
      // Audit of held debuffs (pact scripted-effects batch 2026-10-13): auto-cast whenever available, so a cast at t = 0 (best
      // case, user 2026-10-13); the 5 s / 20 s windows and the recount follow the casts, sustained figures keep the uptime.
      const cast = { kind: "periodic", durationSeconds: duration, periodSeconds: cooldown, startSeconds: 0 };
      if ((match = line.clean.match(PATTERNS.purgatoryTaken))) { const body = `+${round(num(match[1]) * uptime)}% additional damage taken`; entry(line, module, true, text, [body]); derive(body, line.source, text); timedEffects.push({ id: `purgatory:${line.source}`, label: "Purgatory", source: line.source, target: "enemy", toggle: false, enabled: true, active: true, parts: [{ type: null, reach: "all", percent: num(match[1]), schedule: cast }] }); }
      else if ((match = line.clean.match(PATTERNS.purgatoryFire))) { const body = `+${round(num(match[1]) * uptime)}% additional Fire Damage`; entry(line, module, true, text, [body]); derive(body, line.source, text); timedEffects.push({ id: `purgatoryFire:${line.source}`, label: "Purgatory", source: line.source, target: "self", toggle: false, enabled: true, active: true, parts: [{ type: "Fire", reach: "all", percent: num(match[1]), schedule: cast }] }); }
      else if (PATTERNS.purgatoryBase.test(line.clean) || PATTERNS.purgatoryDuration.test(line.clean)) entry(line, module, true, text);
      else entry(line, { ...module, status: "Not modeled" }, false, "this Purgatory clause is not read (ramps, charges, area, curses and conversions)");
      continue;
    }
    if (module.key === "crimsonTide") {
      // User-confirmed 2026-10-13: the Crimson Tide is active whenever a Main Terra Skill is active; it does not need movement
      // (before, it followed the Moving vs standing still group).
      const active = Boolean(state.mainIsTerra);
      const why = active ? null : "no active Main Terra Skill";
      if ((match = line.clean.match(PATTERNS.crimsonTaken))) { const body = `+${round(num(match[1]))}% additional damage taken`; entry(line, module, active, active ? "the Main Terra Skill is active: the dummy inside it is affected by the Crimson Tide (no movement needed, user-confirmed 2026-10-13)" : why, [body]); if (active) derive(body, line.source, "Crimson Tide on the dummy"); }
      else if (PATTERNS.crimsonCreate.test(line.clean)) entry(line, module, active, active ? "the Main Terra Skill is active (no movement needed, user-confirmed 2026-10-13)" : why);
      else entry(line, { ...module, status: "Not modeled" }, false, "this Crimson Tide clause is not read");
      continue;
    }
    // Erika (Wind Stalker): src/erika-wind-stalker.js settles these against the build's multistriking hits (state.windStalker:
    // windStalkerState before the hits, resolveWindStalker after them).
    if (module.key === "stalker") {
      const ws = state.windStalker || null;
      const text = line.clean.replace(/ ,/g, ",");
      const multistrikes = Boolean(ws?.multistrikes || ws?.eventsPerSecond > 0);
      const maxStacks = ws?.maxStacks ?? (ws ? ws.stalker.initialMaxStacks + (multistrikes ? ws.stalker.maxStackBonus : 0) : 3);
      const held = ws?.held ?? (ws?.stalker?.sustained ? maxStacks : 0);
      const noMultistrike = "no active Attack skill Multistrikes";
      const unmodeled = (why) => entry(line, { ...module, status: "Not modeled" }, false, why);
      if (/^Gains \d+ stacks? of Stalker for every [\d.]+ m of movement$/i.test(text)) {
        const moving = Boolean(ws?.moving);
        entry(line, module, moving && held > 0, moving ? held > 0 ? `moving (Movement group): Stalker held at ${held} stacks from movement` : noMultistrike : `standing still (the Movement group's choice): no Stalker from movement${held > 0 ? `; Stalker comes from Max Multistrike Count events (${held} stacks held)` : ""}`);
      } else if (/^Your Multistrike Count will not be interrupted during Stalker$/i.test(text)) {
        entries.push({ source: line.source, origin: "trait", text: line.clean, active: false, conditionText: `${module.label}: moving or using other skills interrupts Multistrike (game manual 1001020121); the planner never interrupts it on the dummy, so this has no DPS effect`, status: "No DPS effect", provisional: true, bodies: [], condition: "heroModule", group: null, module: module.key });
      } else if (/^At Max Multistrike Count, \+\d+ to Max Stalker Stacks, up to \+\d+, until Stalker ends$/i.test(text)) {
        entry(line, module, multistrikes && held > 0, multistrikes && held > 0 ? `Max Multistrike Count events keep raising the max: ${maxStacks} Stalker stacks (3 + ${maxStacks - 3}); ${held} held` : !multistrikes ? noMultistrike : "no Stalker on the dummy");
      } else if (/^At Max Multistrike Count, gains \d+ stacks? of Stalker$/i.test(text)) {
        entry(line, module, multistrikes, multistrikes ? `1 Stalker stack per Max Multistrike Count event (one per Multistrike sequence${ws?.gainPerSecond ? `, ${round(ws.gainPerSecond)}/s` : ""}); ${held} of ${maxStacks} held (4 s each; provisional)` : noMultistrike);
      } else if ((match = text.match(/^\+(\d+) to the initial Multistrike Count for every (\d+) stack\(s\) of Stalker$/i))) {
        const bonus = Math.floor(held / num(match[2])) * num(match[1]);
        entry(line, module, multistrikes && bonus > 0, multistrikes && bonus > 0 ? `+${bonus} initial Multistrike Count at ${held} Stalker stacks: every count of the sequence shifts by ${bonus} (provisional reading; src/skill-hit-model.js multistrikeSequence)` : !multistrikes ? noMultistrike : `${held} Stalker stacks: below ${match[2]}`);
      } else if (/Multistrike damage increment for [\d.]+ s when the Max Multistrike Count is reached$/i.test(text)) {
        const held4 = ws?.scratchHeld ?? multistrikes;
        entry(line, module, Boolean(held4), held4 ? "held: Max Multistrike Count events come within its 4 s (manual 1001020126: the increment × (1 + X%))" : noMultistrike);
      } else if (/^While Stalker is active, marks all enemies within/i.test(text)) {
        // Artificial Moon (2026-10-14; src/erika-wind-stalker.js windStalkerMoonMark → src/mark-effect.js). The line only arrives
        // when the Artificial Moon gate passes (src/hero-memory-rules.js artificialMoonGate).
        const moon = ws?.moonMark;
        entry(line, module, Boolean(moon?.active), moon?.active ? `Stalker is held, so the dummy (within ${moon.meters} m, best case) is Marked: +10% additional Critical Strike Damage taken × (1 + Mark Effect, this line's +${moon.effectPercent}% included) on the crit share of hits (src/mark-effect.js; provisional)` : !multistrikes && !ws?.moving ? noMultistrike : "Stalker is not held on the dummy (standing still with no Stalker gain at Max Multistrike Count)");
      } else if (/^During Multistrike, there is a/i.test(text)) {
        const dive = ws?.catDive;
        const chance = dive?.chancePercent || 0;
        if (!dive) unmodeled("this Cat Dive wording is not read");
        else entry(line, module, multistrikes && chance > 0, multistrikes && chance > 0 ? `${dive.perPercent}% × ${round(dive.movementSpeedPercent)}% Movement Speed = ${round(chance)}% chance per repeated attack to deal the Max Multistrike Count attack's damage increment instead of its own (Movement Speed held in full, user rule; reading user-confirmed 2026-10-14; provisional; src/skill-hit-model.js multistrikeSequence)` : !multistrikes ? noMultistrike : "no Movement Speed increase, so no chance");
      } else if (/of the increase\/decrease on Movement Speed is also applied to additional Attack Damage/i.test(text)) {
        const interest = ws?.interest;
        if (!interest) unmodeled("this Interest wording is not read");
        else {
          const body = `${interest.valuePercent >= 0 ? "+" : ""}${round(interest.valuePercent)}% additional Attack Damage`;
          const active = interest.valuePercent !== 0;
          entry(line, module, active, active ? `${interest.sharePercent}% × ${round(interest.movementSpeedPercent)}% Movement Speed = ${round(interest.rawPercent)}%${interest.capped ? `, capped at +${interest.capPercent}%` : ""} (the build's Movement Speed total, held in full: movement is constant, user rule 2026-10-14)` : "no Movement Speed increase", active ? [body] : []);
          if (active) derive(body, line.source, "Interest: Movement Speed share");
        }
      }
      else unmodeled("this Stalker clause is not read");
      continue;
    }
    // Activation Medium: Terra (src/selena-dance.js resolveActivationMediumTerra; the planner applies it).
    if (module.key === "activationMediumTerra") {
      const am = state.activationMediumTerra || null;
      const active = Boolean(am?.active);
      const why = am?.granted ? "no active Main Terra Skill" : "Activation Medium: Terra is not granted (Silencing Severance not selected)";
      if (/^The Main Terra Skill is supported by Activation Medium: Terra$/i.test(line.clean)) entry(line, module, active, active ? `+${am.additionalPercent}% additional damage for the Main Terra Skill (hits and its own DoT); triggered when Terra Charge is at max with the dummy within ${am.triggerMeters} m (no use time); seals ${am.sealPercent}% ${am.sealsLife ? "Life (Drenched Hem)" : "Mana"} (TLIDB; provisional readings listed in the module rule)` : why);
      else if (/^Main Skills cannot be supported by other Activation Mediums$/i.test(line.clean)) entry(line, module, active, active ? "other Activation Medium supports on the Main Skill are switched off" : why);
      else if (/^Activation Medium: Terra seals Life instead$/i.test(line.clean)) entry(line, module, active, active ? `the ${am.sealPercent}% seal is Life: it counts toward the Life sealed that Drenched Hem reads` : why);
      else entry(line, { ...module, status: "Not modeled" }, false, "this Activation Medium clause is not read");
      continue;
    }
    // The Cycle I Resist (src/selena-dance.js resolveCycleResist): a Reaping source at the Main Terra recast; Terra Skill Duration.
    if (module.key === "cycleResist") {
      const active = Boolean(state.mainIsTerra);
      entry(line, module, active, active ? (/previous Main Terra Skill/i.test(line.clean) ? "a Reaping source at the Main Terra recast: roll% × the previous Terra's remaining duration per Reap, Reaping Duration applied (src/selena-dance.js resolveCycleResist; provisional)" : "25% of the plain Critical Strike Rating increase joins Terra Skill Duration, which sets the remaining duration the Reap reads (provisional)") : "no active Main Terra Skill");
      continue;
    }
    // Dance of the Deep clauses settled in src/selena-dance.js (the planner applies them; these entries carry the badges).
    if (module.key === "danceTerra") { entry(line, module, true, /^Non-Main/i.test(line.clean) ? "Terra skills other than the Main Skill are taken off the dummy" : "the Main Terra Skill follows you: the dummy stays inside its area (best case)"); continue; }
    if (module.key === "terraCharge") {
      const terra = state.mainIsTerra || (state.activeTags || new Set()).has("Terra");
      entry(line, module, Boolean(terra), terra ? "Terra Charge consumption per cast (src/selena-dance.js; provisional)" : "no active Terra skill");
      continue;
    }
    if (module.key === "paradise") { const active = Boolean(state.mainIsTerra); entry(line, module, active, active ? "the dummy inside the Main Terra Skill's area is Cursed (Lv. 1 Ominous; Ill Omen counted in the Ill Omen line)" : "no active Main Terra Skill"); continue; }
  }
  return { entries, derived, illusion, timedEffects, modules: HERO_MODULES.filter((module) => module.heroes.test(heroId)) };
}
