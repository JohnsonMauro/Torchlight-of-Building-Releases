// The skill selector's data for its dialog: the list, the highlighted choice's detail and the Confirm button.
import {
  activationMediumAffixLines,
  activationMediumLineConfigs,
  activationMediumSelectedLines,
  configurableSupportTierData,
  isSpiritMagusSkill,
  progressionRangeLabels,
  progressionSupportHasStars,
  progressionSupportText,
  progressionSupportTierData,
  specialSupportStarBonus,
} from "../../engine/index.ts";
import { displayTexts, htmlTextSegments } from "../bridge/display-text.ts";
import { searchText } from "../bridge/search-match.ts";
import { followerSkillSelectorList, followerSkillSelectorView } from "../hero/follower-panel.js";
import { heroTraitSupportConfig } from "../hero/hero-memory-display.js";
import { artwork } from "../planner/page.js";
import { currentEditedSetups, plannerState, setupStateKey } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { highlightedAuraEffect, highlightedSkillEffect, skillDisplaySs13 } from "./skill-display-ss13.js";
import { highlightedSupportEffect, supportDisplaySs13 } from "./support-display-ss13.js";
import { activeSkillBoardTab } from "./skill-board.js";
import {
  auraFamilyName,
  followerSelectorDraft,
  followerSelectorSlot,
  selectorChoiceIndex,
  selectorEntries,
  selectorKind,
  selectorLevel,
  selectorSpecialConfig,
  selectorTargetSetup,
  selectorTargetSupport,
  selectorTargetSupportSlot,
  skillSelectorSession,
} from "./skill-selector.js";

export const skillSelectorViewSources = {
  // The skill selector's title and list.
  skillSelector: skillSelectorSource,
};
// The skill selector's data (apps/web/src/features/skills/SkillSelectorDialog.tsx): the title and list, which the dialog
// filters by its search box, and the highlighted choice's detail and Confirm button (skillSelectorDetail).
function skillSelectorSource() {
  const result = (entry, index, tintClass = "") => ({
    index,
    ...displayTexts({ name: entry.name, tags: [...(entry.tags || ["Support"])] }),
    icon: entry.icon,
    tintClass,
    // The whole text of the choice: a long effect description is where most of what a player looks for sits.
    search: searchText([entry.name, ...(entry.tags || []), ...(entry.effects || []), ...(entry.details || []).flat()]),
  });
  if (selectorKind === "follower-skill") {
    const list = followerSkillSelectorList(plannerState, followerSelectorSlot);
    return {
      session: skillSelectorSession,
      title: list.title,
      placeholder: "Search skills…",
      selected: selectorChoiceIndex,
      groups: list.groups.map((group) => ({
        heading: group.heading,
        results: group.results.map((item) => ({ ...item, ...displayTexts({ name: item.name, tags: item.tags }) })),
      })),
      ...skillSelectorDetail(),
    };
  }
  const entries = selectorEntries();
  const label =
    selectorKind === "skill"
      ? activeSkillBoardTab === "auras"
        ? "Passive Skill / Aura"
        : "Active Skill"
      : selectorKind === "hero-support"
        ? `Support for ${heroTraitSupportConfig[ui.activeHeroTraitSupportId]?.skill || "trait skill"}`
        : `Support for ${selectorTargetSetup()?.name || "active skill"}`;
  return {
    session: skillSelectorSession,
    title: displayTexts(`Select ${label} · ${entries.length} available`),
    placeholder: selectorKind === "skill" ? "Search skills…" : "Search supports…",
    selected: selectorChoiceIndex,
    groups: [{ heading: null, results: entries.map((entry, index) => result(entry, index)) }],
    ...skillSelectorDetail(),
  };
}
const rangeText = ({ min, max }) => (min === max ? min : `${min}–${max}`);
const rollControl = (range, value, index = 0) => ({ index, min: range.min, max: range.max, step: range.step, value });
// The skill selector's detail (apps/web/src/features/skills/SkillSelectorDetail.tsx) for the highlighted choice, and its
// Confirm button. A follower skill's detail is still the HTML of src/app/hero/follower-panel.js followerSkillSelectorView.
function skillSelectorDetail() {
  if (selectorKind === "follower-skill") {
    const view = followerSkillSelectorView({
      state: plannerState,
      slot: followerSelectorSlot,
      choiceIndex: selectorChoiceIndex,
      draft: followerSelectorDraft,
      artwork,
    });
    return {
      detail: { kind: "follower", html: view.detailHtml },
      confirm: { label: view.confirmLabel, disabled: view.confirmDisabled },
    };
  }
  const entries = selectorEntries();
  const selectedSetup = selectorTargetSetup();
  const supportSelector = selectorKind === "support" || selectorKind === "hero-support";
  const entry = entries[selectorChoiceIndex];
  if (!entry)
    return {
      // A skill has nothing to set before it is chosen; a support has its tiers and rolls.
      detail: {
        kind: "empty",
        message: selectorKind === "skill" ? "Select a skill to preview" : `Select a ${selectorKind} to configure`,
      },
      confirm: { label: "Confirm", disabled: true },
    };
  const currentSupportName = supportSelector ? selectorTargetSupport()?.name : null;
  const installed =
    selectorKind === "support"
      ? selectedSetup?.supports.some(
          (support) => support.enabled && support.name === entry.name && support.name !== currentSupportName,
        )
      : selectorKind === "hero-support"
        ? false
        : (activeSkillBoardTab === "auras" || isSpiritMagusSkill(entry)) &&
          currentEditedSetups().some(
            (setup) =>
              (setup.enabled || setup.slotInactive) &&
              setup.role === "aura" &&
              setupStateKey(setup) !== setupStateKey(selectedSetup) &&
              auraFamilyName(setup.name) === auraFamilyName(entry.name),
          );
  const activeSupportCount = selectedSetup?.supports.filter((support) => support.enabled).length || 0;
  const replacingSupport =
    (selectorKind === "support" &&
      Boolean((plannerState.skills.supportOrder[setupStateKey(selectedSetup)] || [])[selectorTargetSupportSlot])) ||
    (selectorKind === "support" && selectorTargetSupportSlot < activeSupportCount);
  const full = selectorKind === "support" && (!selectedSetup || (activeSupportCount >= 5 && !replacingSupport));
  const config = selectorSpecialConfig;
  // Star supports (src/data/skills/special-support-tiers-ss13.js specialSupportTierData): one main affix with stars.
  const specialTiers = supportSelector ? configurableSupportTierData(entry.name) : null;
  const progressionTiers = supportSelector ? progressionSupportTierData(entry.name) : null;
  const selectedTier = specialTiers?.find((tier) => tier.tier === config?.tier) || specialTiers?.[0];
  const progressionTier = progressionTiers?.find((tier) => tier.tier === config?.tier) || progressionTiers?.[0];
  const skillDisplay = selectorKind === "skill" ? skillDisplaySs13(entry, selectorLevel) : null;
  const supportDisplay = supportSelector ? supportDisplaySs13(entry, selectorLevel) : null;
  const stars = (value) => ({ value, bonus: specialSupportStarBonus(value) });
  const affixLines = supportSelector ? activationMediumAffixLines(entry.name) : null;
  let progression = null;
  if (affixLines && progressionTier) {
    const lineConfigs = activationMediumLineConfigs(entry.name, config);
    const selectedText = new Map(
      (activationMediumSelectedLines(entry.name, config) || []).map((line) => [line.index, line.text]),
    );
    let shown = 0;
    const lines = [];
    affixLines.forEach((line, index) => {
      const members = line.choiceGroup
        ? affixLines
            .map((other, otherIndex) => (other.choiceGroup === line.choiceGroup ? otherIndex : -1))
            .filter((otherIndex) => otherIndex >= 0)
        : null;
      if (members && index !== (members.find((member) => lineConfigs[member].tier != null) ?? members[0])) return;
      const choiceLabel = (member) =>
        /cooldown/.test(affixLines[member].signature) ? "Cooldown Recovery Speed" : "Additional Duration";
      const selected = lineConfigs[index],
        option = line.options.find((item) => item.tier === selected.tier);
      lines.push({
        index,
        number: ++shown,
        tierText: selected.tier == null ? "Off" : `Tier ${selected.tier}`,
        text: option ? selectedText.get(index) || "" : "Not on this item",
        choice: members ? members.map((member) => ({ value: member, label: choiceLabel(member) })) : null,
        buttons: [
          ...line.options.map((item) => ({
            tier: item.tier,
            label: `T${item.tier}`,
            small: item.ranges.length ? item.ranges.map(rangeText).join(" · ") : "Fixed",
            active: item.tier === selected.tier,
          })),
          ...(line.optional && !members
            ? [{ tier: "off", label: "Off", small: "Not rolled", active: selected.tier == null }]
            : []),
        ],
        rolls: option
          ? option.ranges.map((range, rollIndex) => ({
              label: `${option.ranges.length > 1 ? `Value ${rollIndex + 1} · ` : ""}${range.min}–${range.max}`,
              ...rollControl(range, selected.rolls[rollIndex] ?? range.max, rollIndex),
            }))
          : [],
      });
    });
    progression = {
      medium: true,
      tier: progressionTier.tier,
      tiers: progressionTiers.map((tier) => ({ tier: tier.tier, active: tier.tier === progressionTier.tier })),
      lines,
    };
  } else if (progressionTier) {
    progression = {
      medium: false,
      heading: progressionSupportHasStars(entry.name) ? "Main affix" : "Affixes",
      tier: progressionTier.tier,
      tiers: progressionTiers.map((tier) => ({
        tier: tier.tier,
        small: tier.ranges.length ? tier.ranges.map(rangeText).join(" · ") : "Fixed",
        active: tier.tier === progressionTier.tier,
      })),
      text: progressionSupportText(entry.name, config).split(" | "),
      rolls: progressionTier.ranges.map((range, index) => ({
        label: progressionRangeLabels(entry.name, progressionTier.tier)[index] || `Affix value ${index + 1}`,
        ...rollControl(range, config.rolls?.[index] ?? range.max, index),
      })),
      stars: progressionSupportHasStars(entry.name) ? stars(config.stars) : null,
    };
  }
  const special = specialTiers
    ? {
        tier: selectedTier.tier,
        tiers: specialTiers.map((tier) => ({
          tier: tier.tier,
          small: `${rangeText(tier)}%`,
          active: tier.tier === selectedTier.tier,
        })),
        effect: selectedTier.effect,
        roll: rollControl(selectedTier, config.roll),
        stars: stars(config.stars),
      }
    : null;
  const effects = progressionTier
    ? [
        ...(activationMediumSelectedLines(entry.name, config)?.map((line) => `T${line.tier} · ${line.text}`) ||
          progressionSupportText(entry.name, config)
            .split(" | ")
            .map((line, index) => (index ? line : `Main affix · T${progressionTier.tier} · ${line}`))),
        ...(progressionSupportHasStars(entry.name)
          ? [`Star level · +${specialSupportStarBonus(config.stars)}% additional damage`]
          : []),
      ]
    : specialTiers
      ? [
          `Star bonus · +${specialSupportStarBonus(config.stars)}% additional damage`,
          `Main affix · T${selectedTier.tier} · ${config.roll >= 0 ? "+" : ""}${config.roll}% ${selectedTier.effect}`,
        ]
      : skillDisplay?.effects || supportDisplay?.effects || entry.effects;
  const highlight = (effect) =>
    supportSelector
      ? highlightedSupportEffect(effect)
      : entry.role === "aura"
        ? highlightedAuraEffect(effect)
        : highlightedSkillEffect(effect, entry.name);
  return {
    detail: {
      kind: "entry",
      level: selectorLevel,
      progression: displayTexts(progression),
      special: displayTexts(special),
      previewClass: supportSelector ? "support" : entry.role === "aura" ? "aura" : "",
      icon: entry.icon,
      ...displayTexts({
        name: entry.name,
        tags: [...(entry.tags || ["Spell", "Support"])],
        facts: (skillDisplay?.facts || supportDisplay?.facts || []).map(([label, value]) => ({
          label: String(label),
          value: String(value),
          addedDamage: label === "Effectiveness of Added Damage",
        })),
        reference: skillDisplay?.effectEstimate || null,
      }),
      effects: (effects?.length ? effects : ["See TLIDB for complete level scaling."]).map((effect) =>
        htmlTextSegments(highlight(effect)),
      ),
      source: entry.source,
      full,
    },
    confirm: { label: installed ? "Installed" : "Confirm", disabled: Boolean(installed || full) },
  };
}
