// A Kismet's tooltip as the legacy tooltip's HTML. The Pactspirits section shows its tooltips with React
// (apps/web/src/features/pacts/PactTooltip.tsx, from src/app/bridge/pact-tooltip-view.ts); only a damage path source
// naming a Kismet still comes here (planner-tooltips.js damageSourceTooltipContent), until the Stats tooltips move.
// Delete this file then.
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { pactspiritCatalogSs13 } from "../../data/pacts/pactspirit-catalog-ss13.js";
import { kismetAffixesWithRolls, kismetKindForRing } from "../../engine/pacts/kismet-crafting.js";
import { microFateEffectScale, starTrailNote } from "../../engine/pacts/kismet-effects.js";
import { pactspiritEffectsAtLevel } from "../../engine/pacts/pactspirit-levels.js";
import { escapeHtml } from "../html.js";
import { boostedKismetAffixHtml } from "../pacts/kismet-markup.js";
import { kismetAffixCoverage, pactEffectCoverage } from "../pacts/pact-coverage.js";
import { selectedPactspiritLevel } from "../pacts/pacts-controller.js";
import { curseBadge } from "../planner/curse-notes.js";
import { plannerState } from "../planner/session.js";
import { pactClasses as pc } from "./tooltip-kind-classes.js";

// A Pactspirit tree node: its Kismet, or its own effect and the spirit's level bonuses.
export function pactNodeTooltipContent(element) {
  const { nodeName, nodeEffect, nodeRing, nodeIcon } = element.dataset;
  const equipped = plannerState.pacts.kismetSlots?.[element.dataset.kismetNode],
    kismet = kismetCatalogSs13.find((item) => item.name === equipped?.name),
    kismetBoost = kismet ? microFateEffectScale(plannerState.pacts, element.dataset.kismetNode) : null;
  if (kismet)
    return {
      rarity: kismet.rarity.toLowerCase(),
      pactHtml: `<div class="pact-tooltip-head ${pc.head}"><img src="${kismet.icon}" alt=""><div><strong class="${pc.title}">${escapeHtml(kismet.name)}</strong><small class="${pc.kicker}">${kismet.rarity} · ${kismet.kind} Kismet${starTrailNote(kismetBoost) ? ` · ${starTrailNote(kismetBoost)}` : ""}</small></div></div><ul class="pact-tooltip-rewards ${pc.rewards}">${kismetAffixesWithRolls(
        kismet,
        equipped.rolls,
      )
        .map(
          (affix) =>
            `<li>${boostedKismetAffixHtml(affix, kismetBoost)} ${curseBadge(kismetAffixCoverage(affix, { key: element.dataset.kismetNode }), affix)}</li>`,
        )
        .join(
          "",
        )}</ul><footer class="${pc.footer}">${plannerState.pacts.kismetSlotMode ? (element.classList.contains("pact-tree-extra") ? "Right-click to edit or clear" : "Left-click to allocate · Right-click to edit or clear") : "Click to edit · Right-click to remove"} · Replaces ${escapeHtml(nodeName)}</footer>`,
    };
  const spiritName = element.closest(".pact-slot")?.querySelector("[data-pactspirit-name]")?.dataset.pactspiritName;
  const level = spiritName ? selectedPactspiritLevel(spiritName) : 1;
  const rewards = nodeRing === "outer" && spiritName ? pactspiritEffectsAtLevel(spiritName, level) : [];
  const spiritRarity = pactspiritCatalogSs13.find((spirit) => spirit.name === spiritName)?.rarity.toLowerCase();
  return {
    rarity: spiritRarity,
    pactHtml: `<div class="pact-tooltip-head ${pc.head}">${nodeIcon ? `<img src="${nodeIcon}" alt="">` : ""}<div><strong class="${pc.title}">${escapeHtml(nodeName)}</strong><small class="${pc.kicker}">${nodeRing === "inner" ? "Micro node" : nodeRing === "mid" ? "Medium node" : nodeRing === "outer" ? "Outer node" : "Fate slot"}</small></div></div>${rewards.length ? `<h4 class="${pc.heading}">Level ${level} bonuses</h4><ul class="pact-tooltip-rewards ${pc.rewards}">${rewards.map((effect) => `<li>${escapeHtml(effect)} ${curseBadge(pactEffectCoverage(effect), effect)}</li>`).join("")}</ul>` : nodeEffect ? `<p class="${pc.text}">${escapeHtml(nodeEffect)} ${curseBadge(pactEffectCoverage(nodeEffect), nodeEffect)}</p>` : ""}<footer class="${pc.footer}">${plannerState.pacts.kismetSlotMode ? `Left-click to ${element.getAttribute("aria-pressed") === "true" ? "refund" : "allocate"}${nodeRing === "destiny" ? " · Right-click to configure Fate slots" : kismetKindForRing(nodeRing) ? " · Right-click to add a Kismet" : ""}` : nodeRing === "destiny" ? "Click to unlock extra Fate slots · Right-click to remove them" : kismetKindForRing(nodeRing) ? "Click to craft a Kismet · Right-click to remove" : "TLIDB · outer node"}</footer>`,
  };
}
