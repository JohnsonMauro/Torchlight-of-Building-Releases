// Tangle and Dormant Entanglement (added 2026-10-13 for the Goddess of Knowledge core Acquaintance: "Has Dormant Entanglement").
//
// Sourced:
// - Keyword Dormant Entanglement (game hyperlink 766; TLIDB tooltip in research/tlidb-belt.html and tlidb-divinity-slate-ss13.html):
//   "When having Dormant Entanglement, +40% additional Tangle Damage for each inactivated Tangle".
// - Game manual (manual_rule_des 1001020420–1001020424): a Tangle is activated when it attaches to an enemy (the highest rarity
//   in range first; base attach range 8 m) and then continuously triggers its Spell; with no attachable enemy it becomes
//   inactivated. Base duration 8 s; at the limit a new Tangle replaces the oldest. Triggering interval = the Spell's casting
//   interval. The base Max Tangle Quantity is 2; the highest is 4.
// - Tangle Skills: a Spell supported by Spell Tangle or Activation Medium: Tangle is cast as a Tangle; Manifold Entanglement
//   "Creates Tangles equal to Max Tangle Quantity when you use the supported skill".
//
// User-supplied 2026-10-13 (Google AI Mode summary of TLIDB Dormant_Entanglement / Activation_Medium_Skill and Tangle build
// guides; research/google-ai-mode-answers-2026-10-13.md §9) confirms the first three readings below; the cadence one stays open.
// - One Tangle attaches per enemy (the keyword "You can attach N additional Tangle(s) to enemies", hyperlink 30001300, implies a
//   per-enemy limit; its base is read as 1). On the single training dummy: 1 activated, the rest of Max Tangle Quantity inactivated.
// - Max Tangle Quantity is held (best case, own buffs pre-built): the build keeps recasting its Tangle Skill within 8 s.
// - "Tangle Damage" is the damage of the Spell the Tangle triggers: its hits and its own DoT (not ailments).
// - The Tangle's own trigger cadence (activated Tangles × the Spell's casting interval) is not modeled: the Tangle Skill keeps
//   its ordinary cast-rate model.
import { normalizePercentageText } from "./percentage-text.js";

export const TANGLE_SUPPORTS = Object.freeze(["Spell Tangle", "Activation Medium: Tangle", "Manifold Entanglement"]);
export const BASE_MAX_TANGLE_QUANTITY = 2;
export const HIGHEST_MAX_TANGLE_QUANTITY = 4;
export const TANGLES_ATTACHED_PER_ENEMY = 1;
export const DORMANT_ENTANGLEMENT_PER_INACTIVATED = 40;

const clean = (text) => normalizePercentageText(String(text ?? "")).replace(/\s+/g, " ").trim().replace(/^\[[^\]]+\]\s*/, "");
export const isDormantEntanglementLine = (text) => /^Has Dormant Entanglement$/i.test(clean(text));

/** Setups cast as Tangles: active Spell setups with an enabled Tangle support. */
export function tangleSetups(setups = [], activeNames = new Set()) {
  // The Tangle supports cannot support Channeled Skills (TLIDB support text; manual rule 1001020421). A support a trait sets
  // aside (replaced by Youga's Clockwork Core, or blocked by "Non-Main Skills cannot be tangled": `traitReplaced` /
  // `disabledReason`) makes no Tangle.
  return setups.filter((setup) => activeNames.has(setup.name) && !(setup.tags || []).includes("Channeled") && (setup.supports || []).some((support) => !support?.traitReplaced && !support?.disabledReason && TANGLE_SUPPORTS.includes(support?.name)));
}

// Youga – The Ultimate One's Clockwork Core (src/youga-ultimate-one.js): the supported skill is attached to the Core as a
// Spell Tangle at Max Tangle Quantity, so it is a Tangle Skill whose Tangles are all activated (on the Core, not on enemies):
// none is inactivated, and Dormant Entanglement gives it nothing. `coreSetupKey` names it; `extraQuantity` carries Max Tangle
// Quantity lines a trait derives (Artificial Moon: +1 per +1 Max Sentry Quantity).
export function resolveTangles({ setups = [], activeNames = new Set(), modifierTexts = [], coreSetupKey = null, extraQuantity = [] } = {}) {
  const core = coreSetupKey ? setups.find((setup) => setup.setupKey === coreSetupKey && activeNames.has(setup.name)) || null : null;
  const tangle = tangleSetups(setups, activeNames).filter((setup) => setup !== core);
  const quantitySources = [];
  for (const line of modifierTexts) {
    const match = clean(line.text).match(/^\+(\d+) (?:to )?Max Tangle Quantity$/i);
    if (match) quantitySources.push({ source: line.source, text: clean(line.text), value: Number(match[1]) * (line.multiplier ?? 1) });
  }
  quantitySources.push(...extraQuantity);
  const maxQuantity = Math.min(HIGHEST_MAX_TANGLE_QUANTITY, BASE_MAX_TANGLE_QUANTITY + quantitySources.reduce((sum, line) => sum + line.value, 0));
  const activated = tangle.length ? Math.min(maxQuantity, TANGLES_ATTACHED_PER_ENEMY) : 0;
  const inactivated = tangle.length ? Math.max(0, maxQuantity - activated) : 0;
  const dormantSources = modifierTexts.filter((line) => isDormantEntanglementLine(line.text));
  const hasDormant = dormantSources.length > 0;
  // Holding Dormant Entanglement twice does not add a second keyword effect.
  const additionalPercent = hasDormant && tangle.length ? DORMANT_ENTANGLEMENT_PER_INACTIVATED * inactivated : 0;
  const reason = !hasDormant ? "no Dormant Entanglement source"
    : !tangle.length && core ? `${core.name} is attached to Clockwork Core at Max Tangle Quantity (${maxQuantity}): every Tangle is activated, none inactivated`
    : !tangle.length ? "no Tangle skill in the build (Spell Tangle, Activation Medium: Tangle or Manifold Entanglement on an active Spell)"
      : !inactivated ? `no inactivated Tangle (Max Tangle Quantity ${maxQuantity}, ${activated} attached to the dummy)`
        : `+${DORMANT_ENTANGLEMENT_PER_INACTIVATED}% additional Tangle Damage × ${inactivated} inactivated Tangle${inactivated === 1 ? "" : "s"} (Max Tangle Quantity ${maxQuantity}: base ${BASE_MAX_TANGLE_QUANTITY}${quantitySources.length ? ` + ${quantitySources.reduce((sum, line) => sum + line.value, 0)}` : ""}, cap ${HIGHEST_MAX_TANGLE_QUANTITY}; ${activated} attached to the single dummy, provisional: one Tangle per enemy) on ${tangle.map((setup) => setup.name).join(", ")}`;
  const line = additionalPercent ? { source: `Dormant Entanglement (${dormantSources[0].source})`, text: `+${additionalPercent}% additional Tangle Damage (${DORMANT_ENTANGLEMENT_PER_INACTIVATED}% × ${inactivated} inactivated Tangle${inactivated === 1 ? "" : "s"}; game hyperlink 766; inactivated count provisional)`, value: additionalPercent, category: "Additional damage", provisional: true } : null;
  return {
    setups: [...tangle, ...(core ? [core] : [])].map((setup) => ({ name: setup.name, setupKey: setup.setupKey, ...(setup === core ? { clockworkCore: true, activated: maxQuantity, inactivated: 0 } : {}) })), maxQuantity, quantitySources, activated, inactivated,
    dormant: { present: hasDormant, sources: dormantSources.map((item) => item.source), additionalPercent, active: Boolean(additionalPercent), reason },
    // Additional-damage lines per Tangle setup key, for that setup's hits and its own DoT (plain data: the planner result is
    // compared structurally across save / reload).
    linesBySetup: Object.fromEntries(line ? tangle.map((setup) => [setup.setupKey, [line]]) : [])
  };
}

/** A resolved-line entry (src/line-effects.js shape) so the badge and the line list show the status with its reason. */
/** The Dormant Entanglement lines for one setup (empty unless it is a Tangle Skill and the line is active). */
export const tangleLinesFor = (tangles, setupKey) => tangles?.linesBySetup?.[setupKey] || [];

export function dormantEntanglementLineEntries(tangles, modifierTexts = []) {
  return modifierTexts.filter((line) => isDormantEntanglementLine(line.text)).map((line) => ({
    source: line.source, origin: line.origin, text: clean(line.text), condition: "dormantEntanglement", params: {}, group: null,
    active: tangles.dormant.active, conditionText: tangles.dormant.reason, provisional: tangles.dormant.active, factor: null, bodies: [],
    status: tangles.dormant.active ? "In calc" : "Inactive"
  }));
}
