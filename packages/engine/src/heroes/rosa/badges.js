// Rosa's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): each row of the module table, the trait
// lines it reads and its badge handler, for High Court Chariot's Holy Domain and Unsullied Blade's Mercury Purged revival.

// Rosa – High Court Chariot's Holy Domain (open question Q-H7): the base trait's Domain and +44%; the rest waits for B11.
const num = (text) => Number(String(text).replace("−", "-"));

export function holyDomainBadge(line, module, ctx) {
  const { state, traits, timedEffects, entry, derive, neutral, rosa } = ctx;
  const pressed = state.requestedConditions?.traitSkillOnCooldown !== false;
  const domain =
    traits.some((item) =>
      /^When having at least \d+ Murderous Intent, you can cast the Trait Skill and consume \d+ Murderous Intent to create a Holy Domain/i.test(
        item.clean,
      ),
    ) && traits.some((item) => /^Restores \d+(?:\.\d+)? Murderous Intent per second$/i.test(item.clean));
  const held = domain && pressed;
  const why = !domain
    ? "the Holy Domain or Murderous Intent line is not in the build"
    : "the Trait Skill switch is off: the Holy Domain is never cast";
  if (!rosa.switched && domain) {
    rosa.switched = true;
    timedEffects.push({
      id: "traitSkillOnCooldown",
      label: "Holy Domain cast whenever 15 Murderous Intent are ready (Trait Skill)",
      source: module.label,
      target: "self",
      toggle: true,
      provisional: true,
      enabled: pressed,
      active: held,
      summary: "the Holy Domain held (a recast every 3.75 s; Q-H7: its duration assumed at least that long)",
      reason: held ? "best-case assumption" : why,
      parts: [],
    });
  }
  let match;
  if ((match = line.clean.match(/^While inside the Holy Domain ?, \+(\d+(?:\.\d+)?) ?% additional damage$/i))) {
    const body = `+${num(match[1])}% additional damage`;
    entry(
      line,
      module,
      held,
      held
        ? `the Holy Domain is held at uptime 1 (a recast every 3.75 s from 4 Murderous Intent per second; its duration is not in the readable data and is read as at least 3.75 s: Q-H7, provisional), centred on you: ${body}`
        : why,
      [body],
    );
    if (held) derive(body, line.source, "Holy Domain held (Q-H7)");
  } else if (/^When having at least \d+ Murderous Intent, you can cast the Trait Skill/i.test(line.clean))
    entry(
      line,
      module,
      held,
      held
        ? "cast whenever 15 Murderous Intent are ready (every 3.75 s at 4 per second), the dummy pulled inside: held at uptime 1 (Q-H7, provisional)"
        : why,
    );
  else if (/^Restores \d+(?:\.\d+)? Murderous Intent per second$/i.test(line.clean))
    entry(
      line,
      module,
      held,
      held ? "4 Murderous Intent per second: a Holy Domain (15) every 3.75 s, which holds it (Q-H7, provisional)" : why,
    );
  else if (
    /^Restores \d+ Murderous Intent when Blocking$/i.test(line.clean) ||
    /^For every \d+ Murderous Intent you currently have, \+\d+(?:\.\d+)? ?% Holy Domain radius/i.test(line.clean)
  )
    neutral(
      line,
      module,
      "No DPS effect",
      `the Holy Domain is already held at uptime 1 from the 4 per second regeneration (Q-H7); radius and Block Chance change no dummy figure`,
    );
  else
    entry(
      line,
      { ...module, status: "Not modeled" },
      false,
      "this Holy Domain / Murderous Intent clause waits for Rosa's batch B11 (Murderous Intent level, Block-driven gains, No Guard)",
    );
}

// Mercury Purged (revived memory, Rosa – Unsullied Blade; TLIDB keywords 2026-10-29, tlidb-pages/memory-revival-2026-10-29):
// "When inflicting <ailment>, gains Baptism: <name> for 8s". A build that inflicts the ailment on the dummy keeps refreshing the
// 8 s buff, so the Baptism holds while that ailment is on the dummy. Its offensive effect joins the build as a plain line; its
// "-30% additional <type> Damage taken" is the character's and is only named (a derived "damage taken" line lands on the dummy).
const MERCURY_PURGED = /^When inflicting (Frostbite|Ignite|Numbed), gains (Baptism: \w+) for [\d.]+ ?s$/i;
const BAPTISMS = Object.freeze({
  Frostbite: { offense: "+60% Skill Area", defense: "-30% additional Cold Damage taken" },
  Ignite: { offense: "+30% additional damage on Critical Strike", defense: "-30% additional Fire Damage taken" },
  Numbed: { offense: "+30% additional Max Damage", defense: "-30% additional Lightning Damage taken" },
});

export function mercuryPurgedBadge(line, module, ctx) {
  const { state, entry, derive } = ctx;
  const match = line.clean.match(MERCURY_PURGED);
  if (!match) {
    entry(line, { ...module, status: "Not modeled" }, false, "this Mercury Purged clause is not read");
    return;
  }
  const ailment = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  const baptism = match[2];
  const { offense, defense } = BAPTISMS[ailment];
  const onDummy =
    (state.enemyAilments || []).includes(ailment) || (ailment === "Ignite" && Boolean(state.igniteOnTarget));
  entry(
    line,
    module,
    onDummy,
    onDummy
      ? `${baptism} held: the build inflicts ${ailment} on the dummy, which refreshes the 8 s buff; its ${defense} is defensive, not applied`
      : `the build does not inflict ${ailment} on the dummy`,
    [offense],
  );
  if (onDummy) derive(offense, line.source, `${baptism} (Mercury Purged)`);
}

/** Rosa's hero-exclusive revived lines the modules read: Mercury Purged's three Baptism lines. */
export function rosaRevivedLine(heroId, clean) {
  return heroId === "rosa-unsullied-blade" && MERCURY_PURGED.test(clean);
}

export const ROSA_MODULES = Object.freeze([
  // Rosa's Holy Domain (open question Q-H7, recommended reading; hero trait audit 2026-10-19 §6): only the base trait's Domain and its
  // +44% are read; the other Holy Domain / Murderous Intent clauses wait for batch B11.
  {
    key: "holyDomain",
    heroes: /^rosa-high-court-chariot$/,
    label: "Rosa: Holy Domain",
    status: "Provisional",
    rule: 'Q-H7 recommended reading (provisional): Murderous Intent restores 4 per second and a Holy Domain costs 15, so the Trait Skill (pressed whenever 15 are ready: the Trait Skill switch) recasts it every 3.75 s; the Domain is read as lasting at least that long (its duration is not in the trait text or the readable records: open question), so it is held at uptime 1, centred on you with the dummy pulled inside: "While inside the Holy Domain, +44% additional damage" holds. The other Holy Domain and Murderous Intent clauses (Unbreakable Stand, Invulnerability, Divine Intervention, Desperation, Improvision) are batch B11.',
    lines: /Holy Domain|Murderous Intent/i,
    badge: holyDomainBadge,
  },
  {
    key: "mercuryPurged",
    heroes: /^rosa-unsullied-blade$/,
    label: "Rosa: Mercury Purged",
    status: "Provisional",
    rule: "Mercury Purged (revived memory): each line grants its Baptism for 8 s on inflicting its ailment, so the Baptism holds while the build inflicts that ailment on the dummy (Frostbite: Baptism: Impassive, -30% additional Cold Damage taken and +60% Skill Area; Ignite: Baptism: Rage, -30% additional Fire Damage taken and +30% additional damage on Critical Strike; Numbed: Baptism: Indolent, -30% additional Lightning Damage taken and +30% additional Max Damage; TLIDB keywords). Provisional: whether the three Baptisms can be held at once.",
    lines: MERCURY_PURGED,
    badge: mercuryPurgedBadge,
  },
]);
