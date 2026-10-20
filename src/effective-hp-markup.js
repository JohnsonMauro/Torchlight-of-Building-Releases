// The Stats page's Effective HP banner (src/stat-sheet.js), drawn from src/effective-hp.js effectiveHpModel. Kept apart from
// the model, which the calculation imports, so the calculation does not load panel markup.
import { escapeHtml } from "./html.js";
import { formatRecountInteger } from "./number-format.js";
import { toggleNumberMarkup } from "./dummy-recount-panel.js";
import { baseLife } from "./effective-hp.js";

const round = (value, places = 3) => Math.round(value * 10 ** places) / 10 ** places;
const percentText = (value, places = 1) => `${round(value, places)}%`;
const sourceTitle = (sources) => sources.map((item) => `${item.source}: ${item.text}`).join("\n");
const poolTitle = (item, label) =>
  [
    `${label} · (base + flat + gear) × (1 + increased%) × additional`,
    `base ${item.base} · flat ${item.flat} · gear ${item.gear} · +${item.increased}% · ×${item.additional}`,
    ...item.sources.map((source) => `${source.source}: ${source.text}`),
  ].join("\n");

/** Banner markup in the damage panel's style from `effectiveHpModel`'s result; the checklist sits on the right. */
export function effectiveHpMarkup(model) {
  const { pools, types } = model;
  const integer = (value) => (Number.isFinite(value) ? formatRecountInteger(value) : "Immune");
  // The recount classes carry the styling; the "ehp-" classes keep these rows apart from the damage panel's.
  const row = (key, label, value, note = "", extraClass = "") =>
    `<div class="dummy-recount-row ehp-row${extraClass ? ` ${extraClass}` : ""}" data-ehp-field="${key}"${note ? ` title="${escapeHtml(note)}"` : ""}><span class="dummy-recount-label ehp-label">${escapeHtml(label)}</span>${Number.isFinite(value) ? toggleNumberMarkup(`ehp:${key}`, value, { className: "dummy-recount-value ehp-value" }) : `<strong class="dummy-recount-value ehp-value">${escapeHtml(integer(value))}</strong>`}</div>`;
  const hero = row(
    "weakest",
    `Effective HP · weakest: ${model.weakest.type}`,
    model.weakest.guaranteed,
    `Usable pool ÷ ${model.weakest.type} mitigation (Armor, resistance, additional damage taken). Evasion, block and avoidance are not counted here.`,
    "dummy-recount-hero",
  );
  const pair = `<div class="dummy-recount-pair">${row("pool", "Usable pool", pools.total, `Life after sealing ${formatRecountInteger(pools.usableLife)} + Energy Shield ${formatRecountInteger(pools.energyShield.value)}${pools.barrier ? ` + ${pools.barrier.movement ? "Barrier" : "Guard Barrier"} ${formatRecountInteger(pools.barrier.absorb)}` : ""}`)}${row("expected", `Expected vs hits · weakest: ${model.weakestExpected.type}`, Math.min(model.weakestExpected.expectedAttack, model.weakestExpected.expectedSpell), "Lowest of the attack and spell expected values: evasion, block and chance to avoid damage as averages. A single unlucky hit still sees only the guaranteed figure.")}${row("dot", `Weakest vs damage over time: ${model.weakestDot.type}`, model.weakestDot.dot.guaranteed, `Life after sealing + Energy Shield (${formatRecountInteger(model.dotPool)}, no Barrier) ÷ ${model.weakestDot.type} resistance and damage-taken lines that are not hit-only. Armor, evasion, block and avoidance do not apply.`)}</div>`;
  const layerLine = (layer) => `${layer.source}: ${layer.text}`;
  const dotTitle = (item) => {
    const { dot } = item;
    const ailment = dot.ailment;
    const inactive = model.dotLayers.filter(
      (layer) => !layer.active && (layer.scope === "DoT" || layer.scope === ailment?.name),
    );
    return [
      `Damage over time · pool ${formatRecountInteger(model.dotPool)} ÷ ×${dot.mitigation.toFixed(3)}`,
      `Resistance ${percentText(item.resistancePercent)} · additional damage taken ×${dot.additionalFactor} · no Armor, evasion, block or avoid`,
      ...dot.layers.map(layerLine),
      ...(ailment
        ? [
            ailment.immune
              ? `${ailment.name}: immune`
              : `${ailment.name}: ×${ailment.mitigation.toFixed(3)} → ${ailmentValue(ailment)} (additional ×${ailment.additionalFactor}${ailment.layers.some((layer) => !layer.additional && !layer.kismetGroup) ? ` · ${ailment.increasedPercent}% damage taken, summed` : ""}${ailment.layers.some((layer) => layer.kismetGroup) ? ` · kismets ${ailment.kismetPercent}%, stacked additively` : ""})`,
            ...ailment.layers.map(layerLine),
          ]
        : []),
      ...inactive.map(
        (layer) => `${layer.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · ${layerLine(layer)}`,
      ),
    ].join("\n");
  };
  // Summed (mod 3) ailment lines at −100% or below leave no damage taken: not an immunity, so it is labelled apart.
  const ailmentValue = (ailment) =>
    ailment.immune
      ? "Immune"
      : Number.isFinite(ailment.guaranteed)
        ? formatRecountInteger(ailment.guaranteed)
        : "fully mitigated";
  const dotCell = (item) =>
    `<td class="ehp-dot" title="${escapeHtml(dotTitle(item))}">${integer(item.dot.guaranteed)}${item.dot.ailment ? `<small class="ehp-dot-ailment" data-ehp-ailment="${escapeHtml(item.dot.ailment.name)}">${escapeHtml(item.dot.ailment.name)} ${escapeHtml(ailmentValue(item.dot.ailment))}</small>` : ""}</td>`;
  // Taken as (TLIDB Damage Type Conversion): each share takes its own type's Armor, resistance and damage taken.
  const mitigationTitle = (item) =>
    [
      item.conversion?.length > 1 || (item.conversion?.[0] && item.conversion[0].type !== item.type)
        ? `Taken as ${item.conversion.map((part) => `${percentText(part.share * 100, 2)} ${part.type} (×${part.factor.toFixed(3)})`).join(" + ")}`
        : `Armor ${percentText(item.armorReductionPercent)} · resistance ${percentText(item.resistancePercent)} · additional damage taken ×${item.additionalFactor}`,
      ...(item.conversion || []).flatMap((part) => part.sources),
      ...item.layers.map((layer) => `${layer.source}: ${layer.text}`),
    ].join("\n");
  const typeRows = types
    .map(
      (item) =>
        `<tr><th scope="row">${escapeHtml(item.type)}</th><td class="ehp-mitigation" title="${escapeHtml(mitigationTitle(item))}">×${item.mitigation.toFixed(3)}</td><td>${integer(item.guaranteed)}</td><td title="${escapeHtml(`Evade ${percentText(model.evade.attack * 100)} · block ${percentText(model.block.attackChance)} × ${percentText(model.block.ratio)} ratio · avoid ${percentText(model.avoidance.percent)}`)}">${integer(item.expectedAttack)}</td><td title="${escapeHtml(`Evade ${percentText(model.evade.spell * 100)} (60% rating) · block ${percentText(model.block.spellChance)} × ${percentText(model.block.ratio)} ratio · avoid ${percentText(model.avoidance.percent)}`)}">${integer(item.expectedSpell)}</td>${dotCell(item)}</tr>`,
    )
    .join("");
  const table = `<table class="ehp-types"><thead><tr><th scope="col">Damage type</th><th scope="col" class="ehp-mitigation">Hit mitigation</th><th scope="col">Guaranteed</th><th scope="col">vs attacks</th><th scope="col">vs spells</th><th scope="col" class="ehp-dot" title="Damage over time: Life + Energy Shield ÷ resistance and non-hit damage taken; the ailment of that type below">vs DoT</th></tr></thead><tbody>${typeRows}</tbody></table>`;
  const marks = { immune: "✓", conditional: "◐", reduced: "◐", worse: "✕", none: "✕" };
  const statusLabel = {
    immune: "Immune",
    conditional: "Conditional",
    reduced: "Reduced",
    worse: "Weakened",
    none: "Not protected",
  };
  // The summed detail ("-101% damage taken · 14% chance to avoid") and the per-source lines are the row's hover text.
  const checkTitle = (item) =>
    [
      (item.status !== "immune" && item.status !== "none") || item.immuneBySum ? item.detail : "",
      item.note,
      ...item.sources.map(
        (source) => `${source.source}: ${source.text}${source.mapping ? ` (${source.mapping})` : ""}`,
      ),
    ]
      .filter(Boolean)
      .join("\n");
  const checklist = `<aside class="ehp-checklist" aria-label="Ailment and crowd control immunity"><span class="dummy-recount-mix-title">Ailments and crowd control</span><ul>${model.checklist.map((item) => `<li class="ehp-check ehp-check-${item.status}"${checkTitle(item) ? ` title="${escapeHtml(checkTitle(item))}"` : ""}><i class="ehp-mark" aria-hidden="true">${marks[item.status]}</i><span class="ehp-check-name">${escapeHtml(item.label)}${item.likely && item.status !== "immune" ? ` <em>likely</em>` : ""}</span><span class="ehp-check-status">${escapeHtml(item.status === "reduced" && item.mitigationPercent > 0 ? `${statusLabel.reduced} ${round(item.mitigationPercent, 1)}%` : statusLabel[item.status])}</span></li>`).join("")}</ul></aside>`;
  const chip = (label, value, title) =>
    `<span class="ehp-layer" title="${escapeHtml(title)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></span>`;
  const layers = [
    chip(
      "Max Life",
      `${formatRecountInteger(pools.life.value)}${pools.lifeReservedPercent ? ` · ${percentText(pools.lifeReservedPercent)} sealed` : ""}`,
      poolTitle(pools.life, "Max Life"),
    ),
    chip(
      "Energy Shield",
      formatRecountInteger(pools.energyShield.value),
      poolTitle(pools.energyShield, "Max Energy Shield"),
    ),
    ...(pools.barrier
      ? [
          chip(
            pools.barrier.movement ? "Barrier" : "Guard Barrier",
            formatRecountInteger(pools.barrier.shield),
            `${pools.barrier.source} · ${pools.barrier.trigger}\n20% × (Max Life + Max Energy Shield)${pools.barrier.shieldBonusPercent ? ` × (1 + ${pools.barrier.shieldBonusPercent}% Barrier Shield)` : ""}, absorbs 50% of hit damage; counts ${formatRecountInteger(pools.barrier.absorb)} toward the pool${pools.barrier.shieldBonusSources.length ? `\n${sourceTitle(pools.barrier.shieldBonusSources)}` : ""}`,
          ),
        ]
      : []),
    chip(
      "Armor",
      `${formatRecountInteger(pools.armor.value)} · ${percentText(types[0].armorReductionPercent)} phys`,
      `${poolTitle(pools.armor, "Armor")}\nReduction = 2 × Armor ÷ (0.9 × 2 × Armor + 3000 + 300 × min(${model.enemyLevel}, 90)); ${percentText(pools.nonPhysicalArmorRate * 100, 2)} of it against non-Physical; cap 80%`,
    ),
    chip(
      "Evasion",
      `${formatRecountInteger(pools.evasion.value)} · ${percentText(model.evade.attack * 100)} / ${percentText(model.evade.spell * 100)}`,
      `${poolTitle(pools.evasion, "Evasion")}\nEvade = 1 − 1.15 × Accuracy ÷ (Accuracy + 0.5 × Evasion^0.75), cap 75%; enemy Accuracy ${model.evade.accuracy} at level ${model.enemyLevel}; against spells the chance uses 60% of the Evasion rating (game panel Spell Evasion Chance) and an evaded spell still deals 60% (TLIDB: evasion reduces spell damage by 40%)`,
    ),
    chip(
      "Block",
      `${percentText(model.block.attackChance)} / ${percentText(model.block.spellChance)} × ${percentText(model.block.ratio)}`,
      `Attack / Spell Block Chance × Block Ratio (cap ${percentText(model.block.ratioCap)}; TLIDB: 30% base, 60% max by default, up to 80%; Block Chance up to 100%)${model.block.panel ? `\nAegis of Fire active (best case): the character panel without it reads ${percentText(model.block.panel.attackChance)} / ${percentText(model.block.panel.spellChance)} × ${percentText(model.block.panel.ratio)}` : ""}\n${sourceTitle(model.block.sources) || "No block lines"}`,
    ),
    chip(
      "Avoid damage",
      percentText(model.avoidance.percent),
      sourceTitle(model.avoidance.sources) || "No chance-to-avoid lines",
    ),
    chip(
      "Resistances",
      types
        .slice(1)
        .map((item) => `${item.type} ${item.resistancePercent}%`)
        .join(" · "),
      "Effective (capped) resistances from the Resistances card",
    ),
    chip(
      "Damage taken",
      model.takenLayers.filter((layer) => layer.active).length
        ? model.takenLayers
            .filter((layer) => layer.active)
            .map(
              (layer) =>
                `${layer.scope === "All" ? "" : `${layer.scope} `}${layer.percent > 0 ? "+" : ""}${round(layer.percent, 2)}%`,
            )
            .join(" · ")
        : "none",
      [
        ...model.takenLayers.map(
          (layer) =>
            `${layer.active ? "Active" : layer.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · ${layer.source}: ${layer.text}`,
        ),
        ...(model.conversions || []).map(
          (line) =>
            `${line.active ? "Active" : line.unmodeled ? "Not applied (condition not modeled)" : "Inactive"} · taken as · ${line.source}: ${line.text}`,
        ),
      ].join("\n") || "No additional damage taken or taken-conversion lines",
    ),
  ].join("");
  const details = `<details class="dummy-recount-details"><summary>How this is calculated</summary><ul class="dummy-recount-assumptions"><li>Pool = Life × (1 − sealed %) + Energy Shield${pools.barrier ? ` + ${pools.barrier.movement ? "Barrier" : "Guard Barrier"} absorb` : ""}. Life = (${baseLife(model.characterLevel)} base + flat) × (1 + increased %) × additional; Energy Shield = (gear + flat) × (1 + increased %) × additional. TLIDB: 50 Life +13 per level, no base Energy Shield, Energy Shield is deducted before Life.</li><li>Guaranteed EHP = pool ÷ [(1 − Armor reduction) × (1 − resistance) × Π(1 + additional damage taken)]. With damage taken conversion ("Converts X% of Erosion Damage taken to Cold Damage") each share takes its new type's mitigation and the shares are summed (TLIDB Damage Type Conversion: the type changes before Damage Mitigation; past 100% the sources are scaled to 100%; it applies to hits and damage over time). Expected = guaranteed ÷ [(1 − evade) × (1 − avoid) × (1 − block chance × block ratio)].</li><li>vs damage over time = (Life × (1 − sealed %) + Energy Shield) ÷ [(1 − resistance) × Π(1 + additional damage taken that is not hit-only) × Π(1 + additional Damage Over Time taken)]. No Barrier (it absorbs Hit Damage), no Armor, evasion or block (TLIDB: defensive mechanics against Hit Damage), no chance to avoid damage. The ailment of each type (Trauma · Physical, Ignite · Fire, Wilt · Erosion) also takes its own lines: "additional Ignite Damage taken" multiplies (game mod 4); "Wilt / Trauma Damage taken" lines add together (game mod 3). Immune ailments show Immune; a summed reduction of 100% or more (damage taken, effect received, chance to avoid) counts as immunity (user rule 2026-10-13).</li><li>Injury Buffer (${percentText(model.injuryBufferPercent)}) delays part of each hit; the total is unchanged, so it does not change EHP. Energy Shield charge and Life regeneration are not counted.</li>${model.assumptions.map((text) => `<li>Assumed: ${escapeHtml(text)}</li>`).join("")}${model.provisional.map((text) => `<li>Provisional: ${escapeHtml(text)}</li>`).join("")}<li>Checklist mapping: TLIDB Ailment page (Ignite, Frostbite, Freeze, Shock, Numbed, Trauma, Wilt) and Crowd Control Effects page (Frostbite, Freeze, Paralysis, Knockback, Weaken, Slow, Taunt, Blinding). TLIDB has no Stun entry.</li></ul><p class="damage-bucket-footnote">Not an in-game figure: the Armor and Evasion formulas are TLIDB's beta-data text and no hit test has calibrated them.</p></details>`;
  return `<section class="stat-sheet-banner stat-sheet-banner-wide stat-sheet-ehp-banner" aria-label="Effective HP"><h2>Effective HP <small>Level ${model.enemyLevel} hits</small></h2><section class="dummy-recount-panel ehp-panel"><header class="dummy-recount-head"><span class="dummy-recount-tab">Defense (Level ${model.enemyLevel})</span><span class="dummy-recount-duration" title="Character level is not stored in the build; it sets base Life and Evasion">Character <strong>Lv.${model.characterLevel}</strong> assumed</span></header><div class="ehp-body"><div class="ehp-main"><div class="dummy-recount-body">${hero}${pair}</div>${table}</div>${checklist}</div></section><footer class="dummy-recount-foot"><div class="ehp-layers">${layers}</div>${details}</footer></section>`;
}
