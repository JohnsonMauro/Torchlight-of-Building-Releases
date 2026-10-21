// A hero trait's tooltip as the legacy tooltip's HTML. The hero panel shows its traits with React
// (apps/web/src/features/hero/TraitTooltip.tsx, from src/app/bridge/trait-tooltip-view.ts); only a damage path source
// naming a trait still comes here (planner-tooltips.js damageSourceTooltipContent), until the Stats tooltips move.
// Delete this file then.
import { allHeroTraitsSs13 } from "../../data/heroes/all-hero-traits-ss13.generated.js";
import { heroById } from "../../data/heroes/hero-catalog-ss13.js";
import { baseTraitDescriptionForLevel, withoutArtificialMoonLines } from "../../engine/heroes/hero-memory-rules.js";
import { EXTRA_ROW_NOTE } from "../bridge/trait-tooltip-view.ts";
import { traitKeywordDetailsHtml, traitKeywordTextHtml } from "../hero/trait-keyword-markup.js";
import { escapeHtml } from "../html.js";
import { coverageBadge, heroTraitCoverage, heroTraitCoverageReason } from "../planner/calculation-coverage.js";
import { plannerState } from "../planner/session.js";
import { heroTraitTooltipLevel } from "../hero/hero-tooltip-queries.js";
import { traitClasses as trc } from "./tooltip-kind-classes.js";

// A hero trait: its effects at the level the trait has in this build.
export function heroTraitTooltipContent(element) {
  const hero = heroById(plannerState.hero.selectedHeroId),
    trait = hero && allHeroTraitsSs13[hero.id]?.traits.find((item) => item.name === element.dataset.heroTraitTooltip);
  if (!trait) return null;
  const levelKey = element.dataset.heroTraitLevelKey || "base";
  const traitLevel = heroTraitTooltipLevel(levelKey);
  const emphasize = (line) => {
    const progression = /\(([^()]*(?:\/)[^()]*)\)(%?)/g;
    let html = "",
      offset = 0;
    for (const match of line.matchAll(progression)) {
      html += traitKeywordTextHtml(hero.id, line.slice(offset, match.index));
      const values = match[1].split("/"),
        activeIndex = Math.min(values.length - 1, traitLevel - 1);
      html += `<span class="trait-progression ${trc.progression}">(${values.map((value, index) => `<${index === activeIndex ? "b" : "span"} class="${index === activeIndex ? `trait-current-value ${trc.current}` : `trait-other-value ${trc.other}`}">${escapeHtml(value.trim())}</${index === activeIndex ? "b" : "span"}>`).join(`<span class="trait-separator ${trc.separator}">/</span>`)})${escapeHtml(match[2])}</span>`;
      offset = match.index + match[0].length;
    }
    return html + traitKeywordTextHtml(hero.id, line.slice(offset));
  };
  const description =
    levelKey === "base" ? baseTraitDescriptionForLevel(hero.id, trait.description) : trait.description;
  const descriptionLines = description.split("\n").filter(Boolean);
  const visibleLines = withoutArtificialMoonLines(hero.id, descriptionLines);
  const selected = element.getAttribute("aria-pressed") === "true";
  return {
    traitHtml: `<div class="hero-trait-tooltip-head ${trc.head}"><strong class="${trc.title}">${escapeHtml(trait.name)}</strong>${coverageBadge(heroTraitCoverage(hero.id, trait.name, visibleLines, selected), heroTraitCoverageReason(hero.id, trait.name, descriptionLines, selected))}<em class="${trc.level}">Level ${traitLevel}</em></div><small class="hero-trait-unlock ${trc.unlock}">Unlocks at hero level ${trait.level}</small><div class="hero-trait-effects ${trc.effects}">${visibleLines.map((line) => `<p>${emphasize(line)}</p>`).join("")}${String(levelKey).endsWith(":extra") ? `<p>${escapeHtml(EXTRA_ROW_NOTE)}</p>` : ""}${trait.name === "Sing with the Tide" ? `<p>Damage effects use the current base trait level. Bard state is assumed; bubbles, movement, Tide duration and state switching are excluded from this tag.</p>` : trait.name === "Murmurs of the Distant Tide" ? `<p>Additional Tide Effect scales the Tide damage bonuses in the stat sheet and damage path. Bard state is assumed; reduced Tide duration is ignored.</p>` : trait.name === "Idyll of the Tide" ? `<p>Stat sheet and damage path use the Idyll stack count set in Combat, defaulting to 15. Stack buildup and loss are not simulated.</p>` : trait.name === "Wave Aria" ? `<p>Damage component is included in calculations. Tide placement and duration are outside this badge’s scope.</p>` : ""}</div>${traitKeywordDetailsHtml(hero.id, visibleLines)}<small class="hero-trait-source ${trc.source}">TLIDB · CURRENT TRAIT LEVEL ${traitLevel}</small>`,
  };
}
