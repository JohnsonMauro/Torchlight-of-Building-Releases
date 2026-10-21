// Tooltips of the Pactspirits section: spirits and their tree nodes (with an installed Kismet).
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { pactspiritCatalogSs13 } from "../../data/pacts/pactspirit-catalog-ss13.js";
import { pactspiritTreesSs13 } from "../../data/pacts/pactspirit-trees-ss13.js";
import { kismetAffixesWithRolls, kismetKindForRing } from "../../engine/pacts/kismet-crafting.js";
import { microFateEffectScale, starTrailNote } from "../../engine/pacts/kismet-effects.js";
import { pactspiritEffectsAtLevel } from "../../engine/pacts/pactspirit-levels.js";
import { escapeHtml } from "../html.js";
import { boostedKismetAffixHtml } from "../pacts/kismet-markup.js";
import { kismetAffixCoverage, pactEffectCoverage } from "../pacts/pact-coverage.js";
import { selectedPactspiritLevel } from "../pacts/pacts-controller.js";
import { curseBadge } from "../planner/curse-notes.js";
import { plannerState } from "../planner/session.js";

// A Pactspirit tree node: its Kismet, or its own effect and the spirit's level bonuses.
export function pactNodeTooltipContent(element) {
  const { nodeName, nodeEffect, nodeRing, nodeIcon } = element.dataset;
  const equipped = plannerState.pacts.kismetSlots?.[element.dataset.kismetNode],
    kismet = kismetCatalogSs13.find((item) => item.name === equipped?.name),
    kismetBoost = kismet ? microFateEffectScale(plannerState.pacts, element.dataset.kismetNode) : null;
  if (kismet)
    return {
      rarity: kismet.rarity.toLowerCase(),
      pactHtml: `<div class="pact-tooltip-head"><img src="${kismet.icon}" alt=""><div><strong>${escapeHtml(kismet.name)}</strong><small>${kismet.rarity} · ${kismet.kind} Kismet${starTrailNote(kismetBoost) ? ` · ${starTrailNote(kismetBoost)}` : ""}</small></div></div><ul class="pact-tooltip-rewards">${kismetAffixesWithRolls(
        kismet,
        equipped.rolls,
      )
        .map(
          (affix) =>
            `<li>${boostedKismetAffixHtml(affix, kismetBoost)} ${curseBadge(kismetAffixCoverage(affix, { key: element.dataset.kismetNode }), affix)}</li>`,
        )
        .join(
          "",
        )}</ul><footer>${plannerState.pacts.kismetSlotMode ? (element.classList.contains("pact-tree-extra") ? "Right-click to edit or clear" : "Left-click to allocate · Right-click to edit or clear") : "Click to edit · Right-click to remove"} · Replaces ${escapeHtml(nodeName)}</footer>`,
    };
  const spiritName = element.closest(".pact-slot")?.querySelector("[data-pactspirit-name]")?.dataset.pactspiritName;
  const level = spiritName ? selectedPactspiritLevel(spiritName) : 1;
  const rewards = nodeRing === "outer" && spiritName ? pactspiritEffectsAtLevel(spiritName, level) : [];
  const spiritRarity = pactspiritCatalogSs13.find((spirit) => spirit.name === spiritName)?.rarity.toLowerCase();
  return {
    rarity: spiritRarity,
    pactHtml: `<div class="pact-tooltip-head">${nodeIcon ? `<img src="${nodeIcon}" alt="">` : ""}<div><strong>${escapeHtml(nodeName)}</strong><small>${nodeRing === "inner" ? "Micro node" : nodeRing === "mid" ? "Medium node" : nodeRing === "outer" ? "Outer node" : "Fate slot"}</small></div></div>${rewards.length ? `<h4>Level ${level} bonuses</h4><ul class="pact-tooltip-rewards">${rewards.map((effect) => `<li>${escapeHtml(effect)} ${curseBadge(pactEffectCoverage(effect), effect)}</li>`).join("")}</ul>` : nodeEffect ? `<p>${escapeHtml(nodeEffect)} ${curseBadge(pactEffectCoverage(nodeEffect), nodeEffect)}</p>` : ""}<footer>${plannerState.pacts.kismetSlotMode ? `Left-click to ${element.getAttribute("aria-pressed") === "true" ? "refund" : "allocate"}${nodeRing === "destiny" ? " · Right-click to configure Fate slots" : kismetKindForRing(nodeRing) ? " · Right-click to add a Kismet" : ""}` : nodeRing === "destiny" ? "Click to unlock extra Fate slots · Right-click to remove them" : kismetKindForRing(nodeRing) ? "Click to craft a Kismet · Right-click to remove" : "TLIDB · outer node"}</footer>`,
  };
}

// A Pactspirit: its overview and level bonuses.
export function pactspiritTooltipContent(element) {
  const entry = pactspiritCatalogSs13.find((spirit) => spirit.name === element.dataset.pactspiritName);
  if (!entry) return null;
  const outer = pactspiritTreesSs13[entry.name]?.find((node) => node.ring === "outer");
  const level = selectedPactspiritLevel(entry.name),
    rewards = pactspiritEffectsAtLevel(entry.name, level);
  return {
    rarity: entry.rarity.toLowerCase(),
    pactHtml: `<div class="pact-tooltip-head"><img src="${entry.icon}" alt=""><div><strong>${escapeHtml(entry.name)}</strong><small>${entry.category} · ${entry.rarity} · Level ${level}</small></div></div><h4>Pactspirit overview</h4><p>${escapeHtml(entry.description)}</p>${entry.rarity !== "Magic" ? `<p>Unlock ${entry.rarity === "Legendary" ? 2 : 1} Pact Node${entry.rarity === "Legendary" ? "s" : ""} in advance</p>` : ""}${outer ? `<section class="pact-tooltip-feature"><img src="${outer.icon}" alt=""><strong>${escapeHtml(outer.name)}</strong></section>` : ""}<h4>Level ${level} bonuses</h4>${rewards.length ? `<ul class="pact-tooltip-rewards">${rewards.map((effect) => `<li>${escapeHtml(effect)}</li>`).join("")}</ul>` : "<p>No level bonus listed.</p>"}<footer>Click to change · Right-click to remove</footer>`,
  };
}
