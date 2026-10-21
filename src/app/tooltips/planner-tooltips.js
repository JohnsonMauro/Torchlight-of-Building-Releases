import { equipmentSlots } from "../../data/gear/crafting-catalog-ss13.js";
import { allHeroTraitsSs13 } from "../../data/heroes/all-hero-traits-ss13.generated.js";
import { kismetCatalogSs13 } from "../../data/pacts/kismet-catalog-ss13.js";
import { pactspiritTreesSs13 } from "../../data/pacts/pactspirit-trees-ss13.js";
import { selenaScorchingBeamPactsSs13 } from "../../data/pacts/selena-scorching-beam-ss13.js";
import { allProfessionTalentCatalogueSs13 } from "../../data/talents/all-profession-trees-ss13.generated.js";
import { selenaScorchingBeamTalentSetupSs13 } from "../../data/talents/selena-scorching-beam-ss13.js";
import { resolveTalentCandidate } from "../../engine/candidate-sources.js";
import { collectNormalizedGearModifiers } from "../../engine/engine.js";
import { heroTreeSelections, treeRowLevelKey } from "../../engine/heroes/hero-trait-tree.js";
import { orderedPactspiritNodes, pactspiritEffectsAtLevel } from "../../engine/pacts/pactspirit-levels.js";
import { treeExtraRowTooltipHtml } from "../hero/hero-trait-tree-markup.js";
import { escapeHtml } from "../html.js";
import { selectedPactspiritLevel } from "../pacts/pacts-controller.js";
import { $ } from "../planner/page.js";
import { currentPlanner, equippedSlateIds, plannerState, slatesForBoard, withRenderPass } from "../planner/session.js";
import { effectLabel, formatEffect } from "../talents/talent-labels.js";
import { gearTooltipContent } from "./gear-tooltips.js";
import { heroMemoryTooltipContent, sageScentTooltipContent } from "./hero-tooltips.js";
import { followerSkillTooltipContent, followerTooltipContent, heroTraitTooltipContent } from "./hero-trait-tooltips.js";
import { pactNodeTooltipContent, pactspiritTooltipContent } from "./pact-tooltips.js";
import { qolHelpTooltipHtml } from "./qol-help.js";
import { skillTooltipContent } from "./skill-tooltips.js";
import { slateTooltipContent } from "./slate-tooltips.js";
import { coreTalentTooltipContent, talentNodeTooltipContent } from "./talent-tooltips.js";
import {
  cancelTooltipHide,
  hidePlannerTooltip,
  hidePlannerTooltipSoon,
  positionPlannerTooltip,
  scheduleTooltipPosition,
  setRevivalAltDetails,
  setTooltipAnchor,
  tooltipAnchorElement,
} from "./tooltip-host.js";

const tooltipSelector =
  "[data-damage-source],.talent-node,.core-talent,.equipment-item,.inventory-item,[data-skill-tooltip],[data-support-tooltip],.skill-primary-socket:not(.empty-skill-slot),[data-hero-trait-support-id],[data-hero-trait-tooltip],[data-tree-extra-row-tooltip],[data-sage-scent-tooltip],.hero-memory-socket.filled,.hero-memory-item,.slate-piece,.crafted-slate-item,[data-pactspirit-name],[data-pact-node-tooltip],[data-follower-skill-tooltip],[data-follower-tooltip],[data-qol-help]";
function damageSourceTooltipContent(element) {
  const source = element.dataset.damageSource;
  const category = element.dataset.damageCategory || "";
  if (source === "Total Intelligence (0.5% per point)") {
    const planner = currentPlanner();
    const memory = planner.heroMemories?.totals?.["intelligence:flat"] || 0;
    const gear = planner.equipment?.candidate?.["intelligence:flat"] || 0;
    return {
      title: "Intelligence damage bonus",
      body:
        "Hero memories: " +
        memory +
        "\nEquipment: " +
        gear +
        "\nModeled total: " +
        (memory + gear) +
        " Intelligence\nOne additional damage factor: +" +
        (memory + gear) * 0.5 +
        "%",
    };
  }
  if (source === "Slates: additional Max Damage")
    return {
      title: "Additional Max Damage",
      body: "Raises the upper roll of Scorching Beam hits. The lower roll is unchanged. The equipped Fallen Starlight value already includes Judgment's increase; Prairie does not copy this affix. Ignite uses a separate base-damage attribute.",
    };
  if (source.startsWith("Core talent: ")) {
    const name = source.slice("Core talent: ".length);
    const core = Object.values(allProfessionTalentCatalogueSs13)
      .flatMap((panel) => panel.coreTalents || [])
      .find((core) => core.name === name);
    return { title: name, body: core?.description || "Core talent contribution" };
  }
  if (source.startsWith("Hero memor")) {
    const memories = currentPlanner().heroMemories;
    const line = memories.lines.find(
      (line) => source === line.source + ": " + line.text || source === line.source + ": Intelligence",
    );
    if (line) return heroMemoryTooltipContent({ dataset: { memoryInventoryId: line.memoryId } });
    return {
      title: source,
      body: memories.lines
        .filter((line) => line.stat === "intelligence")
        .map((line) => line.source + ": " + line.text)
        .join("\n"),
    };
  }
  const planner = currentPlanner();
  const proxy = (className, dataset) => {
    const target = document.createElement("span");
    target.className = className;
    Object.assign(target.dataset, dataset);
    return plannerTooltipContent(target);
  };
  const support = source.startsWith("Support: ")
    ? source.slice(9)
    : /Disintegrate/.test(source)
      ? "Scorching Beam: Disintegrate (Noble)"
      : source.endsWith(" support")
        ? source.slice(0, -8)
        : null;
  if (support) return proxy("", { supportTooltip: support, parentSkill: "Scorching Beam" });
  if (source.startsWith("Aura: ")) {
    const family = source.slice(6);
    const setup = planner.activation.setups.find(
      (entry) =>
        planner.activation.activeNames.has(entry.name) &&
        (entry.name === family || entry.name === `Precise: ${family}`),
    );
    if (setup) return proxy("", { skillTooltip: setup.name });
  }
  const skill = planner.activation.setups.find(
    (entry) =>
      source === entry.name || source.startsWith(`${entry.name} level `) || source.startsWith(`${entry.name} average `),
  );
  if (skill) return proxy("", { skillTooltip: skill.name });
  const traitName = /Selena level 10|Bard state|Tide effect|Enemy On the Tide/.test(source)
    ? "Sing with the Tide"
    : source.startsWith("Idyll of the Tide")
      ? "Idyll of the Tide"
      : source;
  const trait = [...document.querySelectorAll("[data-hero-trait-tooltip]")].find(
    (entry) => entry.dataset.heroTraitTooltip === traitName,
  );
  if (trait) return plannerTooltipContent(trait);
  const heroTrait = allHeroTraitsSs13[plannerState.hero.selectedHeroId]?.traits.find(
    (entry) => entry.name === traitName,
  );
  const treeRow = heroTreeSelections(plannerState.hero).indexOf(traitName);
  if (heroTrait)
    return proxy("", {
      heroTraitTooltip: traitName,
      heroTraitLevelKey:
        heroTrait.level <= 1
          ? "base"
          : treeRow >= 0
            ? treeRowLevelKey(plannerState.hero.selectedHeroId, treeRow)
            : `level${heroTrait.level}`,
    });
  const namedGear = planner.equipment.candidateItems.filter(
    (item) => source === item.name || source.startsWith(`${item.name}:`),
  );
  if (namedGear.length === 1) return proxy("equipment-item", { equipmentSlot: namedGear[0].slot });
  const namedSlate = slatesForBoard().find((item) => source === item.name);
  if (namedSlate) return proxy("slate-piece", { slateId: namedSlate.id });
  if (source.startsWith("Kismet: ")) {
    const name = source.slice(8);
    const slot = Object.entries(plannerState.pacts.kismetSlots || {}).find(
      ([, item]) => item.name === source || item.name === name,
    );
    if (slot) return proxy("", { pactNodeTooltip: "", kismetNode: slot[0], nodeName: "Equipped Kismet" });
    const kismet = kismetCatalogSs13.find((item) => item.name === source || item.name === name);
    if (kismet) return { title: name, body: (kismet.affixes || []).join("\n") };
  }
  const keyMap = [
    [/base ignite/i, "baseIgniteDamage"],
    [/fire damage over time/i, "fireDamageOverTimePercent"],
    [/damage over time/i, "damageOverTimePercent"],
    [/elemental damage/i, "elementalDamagePercent"],
    [/ailment damage enhancement/i, "ailmentDamageEnhancementPercent"],
    [/intelligence/i, "intelligence"],
    [/fire infiltration/i, "inflictsFireInfiltrationAgainstIgnited"],
    [/additional ignite/i, "additionalIgniteDamagePercent"],
    [/additional fire/i, "additionalFireDamagePercent"],
    [/affliction effect/i, "afflictionEffectPercent"],
    [/reaping recovery/i, "reapingRecoverySpeedPercent"],
    [/reaping duration/i, "reapingDurationPercent"],
    [/damage/i, "damagePercent"],
  ];
  const stat = keyMap.find(([pattern]) => pattern.test(`${source} ${category}`))?.[1];
  const contributors = [];
  if (/^Equipment|^Equipped gear/.test(source) && stat) {
    const rows = collectNormalizedGearModifiers(planner.equipment.candidateItems).filter((item) => item.stat === stat);
    contributors.push(
      ...rows.map(
        (item) =>
          `${item.source} (${equipmentSlots.find(([slot]) => slot === item.slot)?.[1] || item.slot})\n${item.text}`,
      ),
    );
  } else if (namedGear.length > 1) {
    contributors.push(
      ...namedGear.map(
        (item) =>
          `${item.name} (${equipmentSlots.find(([slot]) => slot === item.slot)?.[1] || item.slot})\n${(item.modifiers || []).join("\n")}`,
      ),
    );
  } else if (/^Talent/.test(source) && stat) {
    const candidate = resolveTalentCandidate(
      selenaScorchingBeamTalentSetupSs13,
      allProfessionTalentCatalogueSs13,
      planner.state.talentRanks,
      planner.state.talents,
    );
    for (const panel of candidate.setup.panels)
      for (const node of panel.allocatedNodes) {
        const value =
          (node.effectsPerRank?.[stat] || node.effects?.[stat] || 0) * (node.effectsPerRank ? node.rank : 1);
        if (node.rank > 0 && value)
          contributors.push(
            `${panel.name} · node ${node.coordinate} · rank ${node.rank}\n${formatEffect(stat, value)}`,
          );
      }
  } else if (/^Divinity Slate/.test(source)) {
    const words = stat
      ? effectLabel(stat)
          .replace(/percent|flat/gi, "")
          .trim()
      : category;
    for (const slate of slatesForBoard().filter((item) => equippedSlateIds.has(item.id))) {
      const affixes = [
        ...(slate.fixed || slate.affixes || []),
        ...(slate.brands || []),
        ...(slate.copiedTalents || []),
      ].filter((line) => words && line.toLowerCase().includes(words.toLowerCase()));
      if (affixes.length) contributors.push(`${slate.name}\n${affixes.join("\n")}`);
    }
  } else if (/^Pacts/.test(source)) {
    const words = /additional damage/i.test(source) ? "additional damage" : stat ? effectLabel(stat) : category;
    for (const node of document.querySelectorAll("[data-pact-node-tooltip]")) {
      if (node.getAttribute("aria-pressed") !== "true") continue;
      const effect = node.dataset.nodeEffect || "";
      const matches = /additional damage/i.test(source)
        ? /^\+[\d.]+% additional damage$/i.test(effect.trim())
        : words && effect.toLowerCase().includes(words.toLowerCase());
      if (matches) contributors.push(`${node.dataset.nodeName}\n${effect}`);
    }
    if (planner.state.pacts.kismetSlotMode && /additional damage/i.test(source))
      for (const name of planner.state.pacts.selectedSpirits || []) {
        if (!name || planner.state.pacts.activeSpirits[name] === false) continue;
        const sequence = orderedPactspiritNodes(pactspiritTreesSs13[name] || []);
        const outer = sequence.findIndex((node) => node.ring === "outer");
        if (planner.state.pacts.nativeNodeQuantities[`${name}:${outer}`] !== 1) continue;
        const effects = pactspiritEffectsAtLevel(name, selectedPactspiritLevel(name)).filter((line) =>
          /^\+[\d.]+% additional damage$/i.test(line),
        );
        if (effects.length) contributors.push(`${name}\n${effects.join("\n")}`);
      }
    if (!planner.state.pacts.kismetSlotMode)
      for (const spirit of selenaScorchingBeamPactsSs13.pactspirits) {
        if (planner.state.pacts.activeSpirits[spirit.name] === false) continue;
        for (const node of spirit.unreplacedNativeNodes) {
          const quantity = planner.state.pacts.nativeNodeQuantities[`${spirit.name}:${node.name}`] ?? node.quantity;
          if (quantity && node.effectsPerNode[stat])
            contributors.push(
              `${spirit.name} · ${node.name} ×${quantity}\n${formatEffect(stat, node.effectsPerNode[stat] * quantity)}`,
            );
        }
        if (/additional damage/i.test(source)) {
          const effects = pactspiritEffectsAtLevel(spirit.name, selectedPactspiritLevel(spirit.name)).filter((line) =>
            /^\+[\d.]+% additional damage$/i.test(line),
          );
          if (effects.length) contributors.push(`${spirit.name}\n${effects.join("\n")}`);
        }
      }
    if (/reaping duration/i.test(category))
      contributors.push(
        `Reaping Duration Fate nodes ×${planner.state.pacts.reapingDurationQuantity ?? 5}\n+12% Reaping Duration per node`,
      );
  }
  return {
    title: source,
    body: contributors.length
      ? contributors.join("\n\n")
      : `${category || "Damage source"}\nThis row combines the selected planner sources. Its contribution is shown in the damage path.`,
  };
}

// The tooltip content of an element: the first kind whose selector it matches, else its own text.
const tooltipKinds = [
  ["[data-tree-extra-row-tooltip]", () => ({ traitHtml: treeExtraRowTooltipHtml() })],
  ["[data-qol-help]", (element) => ({ qolHtml: qolHelpTooltipHtml(element.dataset.qolHelp) })],
  ["[data-damage-source]", damageSourceTooltipContent],
  ["[data-sage-scent-tooltip]", sageScentTooltipContent],
  [".core-talent", coreTalentTooltipContent],
  ["[data-pact-node-tooltip]", pactNodeTooltipContent],
  ["[data-pactspirit-name]", pactspiritTooltipContent],
  [".hero-memory-socket.filled,.hero-memory-item", heroMemoryTooltipContent],
  [".slate-piece,.crafted-slate-item", slateTooltipContent],
  ["[data-follower-skill-tooltip]", followerSkillTooltipContent],
  ["[data-follower-tooltip]", followerTooltipContent],
  ["[data-hero-trait-tooltip]", heroTraitTooltipContent],
  [".skill-primary-socket,.skill-support-socket,[data-skill-tooltip],[data-support-tooltip]", skillTooltipContent],
  [".talent-node", talentNodeTooltipContent],
  [".equipment-item,.inventory-item", gearTooltipContent],
];
// The classes of the plain title / text / footer content, and of a damage path source's breakdown (a fixed title, a
// scrolling text, a fixed footer; the frame is in apps/web/src/shell/planner-tooltip-classes.ts).
const GENERIC_CONTENT = {
  title: "block font-serif text-base font-bold text-[#ff9b3d]",
  body: "mt-2 block max-h-[300px] overflow-hidden text-[0.74rem]/[1.55] whitespace-pre-line text-[#dce3ea]",
  foot: "mt-2.5 block border-t border-[#343c47] pt-2 text-[0.62rem] tracking-[0.08em] text-[#7e8995] uppercase",
};
const SOURCE_SUMMARY_CONTENT = {
  title:
    "block flex-none border-b border-[#80634166] px-3.5 py-3 font-serif text-[0.9rem]/[1.3] font-bold text-[#f9ca65]",
  body: "block min-h-0 overflow-y-auto px-3.5 py-3 text-[0.74rem]/[1.6] whitespace-pre-line text-[#e3e6e4] [scrollbar-width:thin] [scrollbar-color:#806341_#071316]",
  foot: "block flex-none border-t border-[#80634166] px-3.5 py-[9px] text-[0.62rem] text-[#c4b18f]",
};
// The element's own hint (its title attribute), under any kind's content.
const ACTION_HINT =
  "planner-tooltip-action-hint block border-t border-[#45525d] bg-black/20 px-[11px] py-[9px] text-[0.65rem]/[1.4] text-[#d6c098]";
function plannerTooltipContent(element) {
  const kind = tooltipKinds.find(([selector]) => element.matches(selector));
  if (kind) return kind[1](element);
  const title = element.querySelector("h2,h3,strong")?.textContent?.trim() || "Planner detail";
  const body = element.textContent.replace(/\s+/g, " ").trim();
  return { title, body };
}
function showPlannerTooltip(element, x, y) {
  cancelTooltipHide();
  if (!document.body.classList.contains("unified-planner") && !element.matches("[data-damage-source],[data-qol-help]"))
    return;
  const content = withRenderPass(() => plannerTooltipContent(element));
  if (!content) return hidePlannerTooltip();
  const actionHint = element.getAttribute("title") || element.dataset.tooltipHint;
  if (element.hasAttribute("title")) {
    element.dataset.tooltipHint = actionHint;
    element.removeAttribute("title");
  }
  setTooltipAnchor(element);
  const tooltip = $("#planner-tooltip");
  const host = element.closest("#slate-inventory,#hero-memory-selector,#follower-selector") || document.body;
  if (tooltip.parentElement !== host) host.appendChild(tooltip);
  if (content.rarity) tooltip.dataset.rarity = content.rarity;
  else delete tooltip.dataset.rarity;
  tooltip.classList.toggle("six-affix", Boolean(content.sixAffix));
  tooltip.classList.toggle("priceless-item", Boolean(content.priceless));
  tooltip.classList.toggle("item-level-100", Boolean(content.itemLevel100));
  tooltip.classList.toggle("gear-tooltip", Boolean(content.html));
  tooltip.classList.toggle("skill-tooltip", Boolean(content.skillHtml));
  tooltip.classList.toggle("support-tooltip", Boolean(content.supportTooltip));
  tooltip.classList.toggle("aura-tooltip", Boolean(content.auraTooltip));
  tooltip.classList.toggle("sage-scent-tooltip", Boolean(content.scentHtml));
  tooltip.classList.toggle("hero-trait-tooltip", Boolean(content.traitHtml));
  tooltip.classList.toggle("memory-tooltip", Boolean(content.memoryHtml));
  tooltip.classList.toggle("follower-tooltip", Boolean(content.followerTooltip));
  tooltip.classList.toggle("slate-tooltip", Boolean(content.slateHtml));
  tooltip.classList.toggle("pact-tooltip", Boolean(content.pactHtml));
  tooltip.classList.toggle("qol-help-tooltip", Boolean(content.qolHtml));
  tooltip.classList.toggle("prism-tooltip", Boolean(content.prismHtml));
  tooltip.classList.toggle("basic-talent-tooltip", Boolean(content.basicTalentHtml));
  tooltip.classList.toggle("damage-source-tooltip", element.matches("[data-damage-source]"));
  const sourceSummary =
    element.matches("[data-damage-source]") &&
    !Object.keys(content).some((key) => key.endsWith("Html") || key === "html");
  tooltip.classList.toggle("source-summary-tooltip", sourceSummary);
  tooltip.dataset.talentType = content.basicTalentHtml ? content.talentType || element.dataset.nodeType || "micro" : "";
  const generic = sourceSummary ? SOURCE_SUMMARY_CONTENT : GENERIC_CONTENT;
  tooltip.innerHTML =
    content.qolHtml ||
    content.basicTalentHtml ||
    content.prismHtml ||
    content.pactHtml ||
    content.slateHtml ||
    content.memoryHtml ||
    content.html ||
    content.skillHtml ||
    content.traitHtml ||
    content.scentHtml ||
    `<strong class="${generic.title}">${escapeHtml(content.title)}</strong><span class="${generic.body}">${escapeHtml(content.body)}</span><small class="${generic.foot}">${sourceSummary ? "Source breakdown · scroll for more" : "Click to edit"}</small>`;
  if (actionHint)
    tooltip.insertAdjacentHTML("beforeend", `<small class="${ACTION_HINT}">${escapeHtml(actionHint)}</small>`);
  tooltip.setAttribute("aria-hidden", "false");
  tooltip.classList.add("visible");
  positionPlannerTooltip(x, y);
}
// The planner tooltip follows the pointer and keyboard focus; Alt shows revived memory details; a scroll hides it.
export function installPlannerTooltipEvents() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Alt") setRevivalAltDetails(true);
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Alt") setRevivalAltDetails(false);
  });
  window.addEventListener("blur", () => setRevivalAltDetails(false));
  window.addEventListener(
    "scroll",
    (event) => {
      if (event.target instanceof Element && event.target.closest("#planner-tooltip")) return;
      tooltipScrollQuietUntil = performance.now() + 160;
      hidePlannerTooltip();
    },
    { passive: true, capture: true },
  );
  document.addEventListener("pointerover", (event) => {
    if (performance.now() < tooltipScrollQuietUntil) return;
    const target = event.target.closest(tooltipSelector);
    if (
      target &&
      !target.contains(event.relatedTarget) &&
      !(event.pointerType === "touch" && target.matches("[data-qol-help]"))
    )
      showPlannerTooltip(target, event.clientX, event.clientY);
  });
  document.addEventListener("pointermove", (event) => {
    if (event.target.closest("#planner-tooltip.damage-source-tooltip")) return;
    if ($("#planner-tooltip").classList.contains("visible")) scheduleTooltipPosition(event.clientX, event.clientY);
  });
  document.addEventListener("pointerout", (event) => {
    const target = event.target.closest(tooltipSelector);
    if (
      target &&
      !target.contains(event.relatedTarget) &&
      !(event.pointerType === "touch" && target.matches("[data-qol-help]"))
    ) {
      if (target.matches("[data-damage-source]")) hidePlannerTooltipSoon();
      else hidePlannerTooltip();
    }
  });
  $("#planner-tooltip").addEventListener("pointerenter", cancelTooltipHide);
  $("#planner-tooltip").addEventListener("pointerleave", (event) => {
    if (!tooltipAnchorElement?.contains(event.relatedTarget)) hidePlannerTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest(tooltipSelector);
    if (target) {
      const box = target.getBoundingClientRect();
      showPlannerTooltip(target, box.right, box.top);
    }
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest(tooltipSelector)) hidePlannerTooltip();
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = event.target.closest?.("[data-qol-help]");
      qolHelpOpenAtPointerDown = button
        ? event.pointerType !== "mouse" &&
          tooltipAnchorElement === button &&
          $("#planner-tooltip").classList.contains("visible")
        : null;
    },
    true,
  );
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-qol-help]");
    if (!button) return;
    event.preventDefault();
    const open =
      qolHelpOpenAtPointerDown ??
      (tooltipAnchorElement === button && $("#planner-tooltip").classList.contains("visible"));
    qolHelpOpenAtPointerDown = null;
    if (open) hidePlannerTooltip();
    else {
      const box = button.getBoundingClientRect();
      showPlannerTooltip(button, box.right, box.top);
    }
  });
}

let tooltipScrollQuietUntil = 0;
// Section "?" help: hover and keyboard focus show it (above); a tap, pen click or Enter / Space toggles it
// (a mouse click only shows it, since hovering already did). Whether it was open is read at pointerdown.
let qolHelpOpenAtPointerDown = null;
