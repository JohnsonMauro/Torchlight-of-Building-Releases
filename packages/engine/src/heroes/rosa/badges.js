// Rosa's badge modules (packages/engine/src/heroes/hero-trait-modules.js reads them): the module table row, the trait lines it
// reads and its badge handler, for High Court Chariot's Holy Domain.

// Rosa – High Court Chariot's Holy Domain (open question Q-H7): the base trait's Domain and +44%; the rest waits for B11.
const num = (text) => Number(String(text).replace("−", "-"));

export function holyDomainBadge(line, module, ctx) {
  const { state, traits, entries, timedEffects, entry, derive, rosa } = ctx;
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
    entries.push({
      source: line.source,
      origin: line.origin || "trait",
      text: line.clean,
      active: false,
      conditionText: `${module.label}: the Holy Domain is already held at uptime 1 from the 4 per second regeneration (Q-H7); radius and Block Chance change no dummy figure`,
      status: "No DPS effect",
      provisional: true,
      bodies: [],
      condition: "heroModule",
      group: null,
      module: module.key,
    });
  else
    entry(
      line,
      { ...module, status: "Not modeled" },
      false,
      "this Holy Domain / Murderous Intent clause waits for Rosa's batch B11 (Murderous Intent level, Block-driven gains, No Guard)",
    );
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
]);
