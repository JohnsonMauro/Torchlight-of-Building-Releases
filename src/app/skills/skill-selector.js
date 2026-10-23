// The skill selector dialog: skills, supports, a hero trait's support and a follower's skills.
import {
  activationMediumAffixLines,
  activationMediumLineConfigs,
  assignSkillBoardSlot,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  gameRuleDecides,
  heroCanPlaceMagusInActiveSlot,
  isSpiritMagusSkill,
  normalizeProgressionSupportConfig,
  progressionSupportTierData,
  selectorBaseLevel,
  specialSupportTierData,
  supportCanSupportSkill,
  supportFitsSlot,
  tlidbSkillCatalogSs14,
  tlidbSupportCatalogSs14,
  userInstalledSupports,
} from "#engine";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import {
  applyFollowerSkillDraft,
  followerDraftWithAffix,
  followerDraftWithTier,
  followerSelectorEntries,
  followerSelectorInitialIndex,
  followerSkillDraft,
} from "../hero/follower-panel.js";
import { heroTraitSupportConfig } from "../hero/hero-memory-display.js";
import { commitFollower, heroTraitSupportOptions } from "../hero/hero-controller.js";
import { $, showToast } from "../planner/page.js";
import {
  currentEditedSetups,
  persistPlannerState,
  plannerState,
  renderCandidateViews,
  setupStateKey,
  supportStateKey,
} from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { activeSkillBoardTab, selectorBoardSetups } from "./skill-board.js";

export let selectorKind = "skill";
export let skillSelectorSession = 0; // the skill selector's openings (apps/web/src/features/skills/SkillSelectorDialog.tsx)
export let selectorChoiceIndex = -1;
export let selectorLevel = 20;
export let selectorSpecialConfig = null;
let selectorTargetRow = 0;
export let selectorTargetSupportSlot = null;
let selectorTargetSetupName = null;
export const skillSelectorCommands = {
  openSkillSelector,
  chooseSkillSelectorEntry,
  confirmSkillSelector,
  setSelectorLevel,
  setSpecialTier,
  setSpecialRoll,
  setSupportStars,
  setProgressionTier,
  setProgressionRoll,
  setAffixLineTier,
  setAffixRoll,
  setAffixChoice,
  openHeroTraitSupport,
};

// The skill selector's follower skill editor: its tier, affix and roll controls edit the draft.
export function installSkillSelectorEvents() {
  document.addEventListener("change", (event) => {
    // Follower skill tier and support affixes (src/app/hero/follower-panel.js followerSkillEditorMarkup, 2026-10-19 user request): the picker's
    // preview card edits the highlighted skill's draft (followerSelectorDraft); Confirm saves it, Cancel drops it.
    if (event.target.matches("#skill-selector [data-follower-draft-tier]")) {
      followerSelectorDraft = followerDraftWithTier(
        plannerState,
        followerSelectorSlot,
        followerSelectorDraft,
        event.target.value,
      );
      renderSkillSelector();
      return;
    }
    if (event.target.matches("#skill-selector [data-follower-draft-affix]")) {
      followerSelectorDraft = followerDraftWithAffix(
        plannerState,
        followerSelectorSlot,
        followerSelectorDraft,
        Number(event.target.dataset.followerDraftAffix),
        event.target.value ? Number(event.target.value) : null,
      );
      renderSkillSelector();
      return;
    }
    if (event.target.matches("#skill-selector [data-follower-draft-roll]")) {
      const [affixSlot, k] = event.target.dataset.followerDraftRoll.split(":").map(Number),
        current = followerSelectorDraft?.affixes?.[affixSlot];
      if (current) {
        const rolls = [...(current.rolls || [])];
        rolls[k] = Number(event.target.value);
        followerSelectorDraft = followerDraftWithAffix(
          plannerState,
          followerSelectorSlot,
          followerSelectorDraft,
          affixSlot,
          current.id,
          rolls,
        );
        renderSkillSelector();
      }
      return;
    }
    if (event.target.checkValidity && !event.target.checkValidity()) {
      event.target.reportValidity();
      return;
    }
  });
}
function openHeroTraitSupport(heroId) {
  ui.activeHeroTraitSupportId = heroId;
  selectorKind = "hero-support";
  selectorChoiceIndex = -1;
  selectorSpecialConfig = null;
  const installed = selectorTargetSupport();
  selectorLevel = installed?.level || 20;
  if (installed) {
    selectorChoiceIndex = selectorEntries().findIndex((entry) => entry.name === installed.name);
    selectorSpecialConfig = {
      ...defaultConfigurableSupportConfig(installed.name, installed.effects),
      ...(normalizeProgressionSupportConfig(installed.name, installed.specialConfig) || {}),
    };
  }
  skillSelectorSession++;
  renderSkillSelector();
  openDialog("skill-selector");
  $("#skill-selector-search").focus();
}
// A follower skill slot opens the skill board's picker (#skill-selector) as selectorKind "follower-skill" (src/app/hero/follower-panel.js followerSkillSelectorView; 2026-10-15 user request).
export let followerSelectorSlot = 0;
// The picker's editor draft { name, tier, affixes } of the highlighted skill (src/app/hero/follower-panel.js followerSkillDraft): it opens on the
// slot's own skill, tier and affixes and resets to a newly highlighted skill's (the slot's values when it is the slot's skill).
export let followerSelectorDraft = null;
export function openFollowerSkillSelector(slot) {
  selectorKind = "follower-skill";
  followerSelectorSlot = slot;
  followerSelectorDraft = null;
  selectorTargetSetupName = null;
  selectorTargetSupportSlot = null;
  selectorChoiceIndex = followerSelectorInitialIndex(plannerState, slot);
  skillSelectorSession++;
  renderSkillSelector();
  openDialog("skill-selector");
  $("#skill-selector-search").focus();
}

export function selectorEntries() {
  if (selectorKind === "skill")
    return tlidbSkillCatalogSs14.filter((entry) =>
      activeSkillBoardTab === "auras"
        ? entry.role === "aura"
        : entry.role !== "aura" ||
          (heroCanPlaceMagusInActiveSlot(plannerState.hero.selectedHeroId) && isSpiritMagusSkill(entry)),
    );
  if (selectorKind === "hero-support") return heroTraitSupportOptions();
  const setup = selectorTargetSetup();
  if (!setup) return tlidbSupportCatalogSs14;
  const skillTags = tlidbSkillCatalogSs14.find((entry) => entry.name === setup.name)?.tags || [];
  return tlidbSupportCatalogSs14.filter((entry) => {
    if (selectorKind === "support" && !supportFitsSlot(entry, selectorTargetSupportSlot)) return false;
    if (entry.exclusiveFor) return entry.exclusiveFor === setup.name;
    if (setup.role === "aura") {
      // The game's tag filter decides when the aura and the support both have a stone record (packages/engine/src/supports/support-compatibility.js).
      if (
        gameRuleDecides(
          entry,
          tlidbSkillCatalogSs14.find((skill) => skill.name === setup.name),
        )
      )
        return supportCanSupportSkill(
          entry,
          tlidbSkillCatalogSs14.find((skill) => skill.name === setup.name),
          setup.supports,
        );
      if (entry.name === "Blind" && skillTags.includes("Spirit Magus")) return true;
      if (
        skillTags.includes("Focus") &&
        !entry.passiveOnly &&
        supportCanSupportSkill(
          entry,
          tlidbSkillCatalogSs14.find((skill) => skill.name === setup.name),
          setup.supports,
        )
      )
        return true;
      const description = (entry.effects || []).join(" ").toLowerCase();
      const supportsPassive = /supports passive skill/.test(description);
      const supportsAura = /supports aura skills?/.test(description);
      const supportsArea = /supports area skills?\./.test(description) && skillTags.includes("Area");
      if (supportsPassive || supportsAura || supportsArea) return true;
      return entry.passiveOnly && entry.tags.some((tag) => tag !== "Support" && skillTags.includes(tag));
    }
    return (
      !entry.passiveOnly &&
      supportCanSupportSkill(
        entry,
        tlidbSkillCatalogSs14.find((skill) => skill.name === setup.name),
        setup.supports,
      )
    );
  });
}

// A click on the skill selector's list: highlights that choice, with its saved level and configuration when it is the
// one in the slot.
function chooseSkillSelectorEntry(index) {
  selectorChoiceIndex = index;
  if (selectorKind !== "follower-skill") {
    const choice = selectorEntries()[selectorChoiceIndex];
    const current = selectorTargetSupport();
    selectorLevel = current?.name === choice?.name ? current.level : choice?.level || 20;
    const targetSetup = selectorTargetSetup(),
      saved =
        selectorKind === "hero-support"
          ? current?.name === choice?.name
            ? plannerState.hero.heroTraitSupportConfigs?.[ui.activeHeroTraitSupportId]
            : null
          : targetSetup
            ? plannerState.skills.specialSupportConfigs[supportStateKey(setupStateKey(targetSetup), choice?.name)]
            : null;
    selectorSpecialConfig = {
      ...defaultConfigurableSupportConfig(
        choice?.name,
        current?.name === choice?.name ? current.effects : choice?.effects,
      ),
      ...(saved || {}),
    };
  }
  renderSkillSelector();
}
export function auraFamilyName(name) {
  return String(name || "")
    .replace(/^Precise:\s*/i, "")
    .trim()
    .toLowerCase();
}
export function selectorTargetSetup() {
  const board = selectorBoardSetups(selectorKind === "support");
  return (
    (selectorTargetSetupName && board.find((setup) => setupStateKey(setup) === selectorTargetSetupName)) ||
    board[selectorTargetRow] ||
    null
  );
}
export function selectorTargetSupport() {
  if (selectorKind === "hero-support") {
    const name = plannerState.hero.heroTraitSupports?.[ui.activeHeroTraitSupportId] || "";
    const entry = tlidbSupportCatalogSs14.find((support) => support.name === name);
    return entry
      ? {
          ...entry,
          level: plannerState.hero.heroTraitSupportLevels?.[ui.activeHeroTraitSupportId] || entry.level || 20,
          specialConfig: plannerState.hero.heroTraitSupportConfigs?.[ui.activeHeroTraitSupportId],
        }
      : null;
  }
  const setup = selectorTargetSetup();
  if (!setup || selectorTargetSupportSlot === null) return null;
  const enabled = userInstalledSupports(setup);
  const byName = new Map(enabled.map((support) => [support.name, support]));
  const slots = Array.from({ length: 5 }, () => null);
  const setupKey = setupStateKey(setup),
    hasExplicitOrder = Object.hasOwn(plannerState.skills.supportOrder, setupKey);
  (plannerState.skills.supportOrder[setupKey] || []).slice(0, 5).forEach((name, index) => {
    slots[index] = byName.get(name) || null;
    byName.delete(name);
  });
  if (!hasExplicitOrder)
    for (const support of byName.values()) {
      const index = slots.indexOf(null);
      if (index >= 0) slots[index] = support;
    }
  return slots[selectorTargetSupportSlot];
}
// Before the skill selector shows a support with tiers, its configuration is filled in with the support's defaults (the
// slot's saved values kept); a follower skill's editor draft follows the highlighted skill.
function renderSkillSelector() {
  if (selectorKind === "follower-skill") {
    const highlighted = followerSelectorEntries(plannerState, followerSelectorSlot)[selectorChoiceIndex] || null;
    if (followerSelectorDraft?.name !== highlighted?.name)
      followerSelectorDraft = highlighted
        ? followerSkillDraft(plannerState, followerSelectorSlot, highlighted.name)
        : null;
  } else {
    const entry = selectorEntries()[selectorChoiceIndex];
    const supportSelector = selectorKind === "support" || selectorKind === "hero-support";
    if (entry && supportSelector && (configurableSupportTierData(entry.name) || progressionSupportTierData(entry.name)))
      selectorSpecialConfig = {
        ...defaultConfigurableSupportConfig(entry.name, selectorTargetSupport()?.effects || entry.effects),
        ...(normalizeProgressionSupportConfig(entry.name, selectorSpecialConfig) || {}),
      };
  }
  viewSourceChanged("skillSelector");
}

// Skill selector commands (apps/web/src/features/skills/SkillSelectorDialog.tsx and SkillSelectorDetail.tsx).
// Confirm: installs the highlighted choice at the selector's level (the level field commits when it is left, which a
// press on Confirm does first).
function confirmSkillSelector() {
  if (selectorKind === "follower-skill") {
    const entry = followerSelectorEntries(plannerState, followerSelectorSlot)[selectorChoiceIndex];
    if (!entry) return;
    const draft =
      followerSelectorDraft?.name === entry.name
        ? followerSelectorDraft
        : followerSkillDraft(plannerState, followerSelectorSlot, entry.name);
    followerSelectorDraft = null;
    closeDialog("skill-selector");
    commitFollower(applyFollowerSkillDraft(plannerState, followerSelectorSlot, draft), `${entry.name} equipped`);
    return;
  }
  selectorLevel = Math.max(1, Math.min(40, selectorLevel || 20));
  const entry = selectorEntries()[selectorChoiceIndex];
  if (!entry || (selectorKind === "support" && !supportFitsSlot(entry, selectorTargetSupportSlot))) return;
  const selected = selectorTargetSetup();
  if (selectorKind === "hero-support") {
    plannerState.hero.heroTraitSupports[ui.activeHeroTraitSupportId] = entry.name;
    plannerState.hero.heroTraitSupportLevels[ui.activeHeroTraitSupportId] = selectorLevel;
    if (selectorSpecialConfig)
      plannerState.hero.heroTraitSupportConfigs[ui.activeHeroTraitSupportId] = { ...selectorSpecialConfig };
    else delete plannerState.hero.heroTraitSupportConfigs[ui.activeHeroTraitSupportId];
    persistPlannerState();
    showToast(`${entry.name} linked to ${heroTraitSupportConfig[ui.activeHeroTraitSupportId]?.skill || "trait skill"}`);
  } else if (selectorKind === "skill") {
    const board = selectorBoardSetups();
    const replaced = board[selectorTargetRow];
    if (replaced?.name === entry.name) {
      const replacedKey = setupStateKey(replaced);
      plannerState.skills.skillLevels[replacedKey] = { baseLevel: selectorLevel };
    } else {
      if (replaced) {
        const replacedKey = setupStateKey(replaced),
          customIndex = plannerState.skills.customSetups.findIndex(
            (setup) => (setup.instanceId || setup.name) === replacedKey,
          );
        if (customIndex >= 0) plannerState.skills.customSetups.splice(customIndex, 1);
        else plannerState.skills.setupEnabled[replacedKey] = false;
      }
      const magusActiveSlot = activeSkillBoardTab !== "auras" && entry.role === "aura",
        disabledExisting = magusActiveSlot
          ? null
          : currentEditedSetups().find((setup) => setup.name === entry.name && !setup.enabled && !setup.slotInactive);
      if (disabledExisting && !currentEditedSetups().some((setup) => setup.name === entry.name && setup.enabled)) {
        const existingKey = setupStateKey(disabledExisting);
        plannerState.skills.setupEnabled[existingKey] = true;
        plannerState.skills.skillLevels[existingKey] = { baseLevel: selectorLevel };
        plannerState.skills.supportOrder[existingKey] = ["", "", "", "", ""];
        for (const support of disabledExisting.supports)
          plannerState.skills.supportEnabled[supportStateKey(existingKey, support.name)] = false;
        selectorTargetSetupName = existingKey;
      } else {
        const instanceId = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        plannerState.skills.customSetups.push({
          instanceId,
          role: entry.role,
          name: entry.name,
          baseLevel: selectorLevel,
          addedLevels: 0,
          supports: [],
          enabledSupportSlots: 0,
          ...(Number.isFinite(entry.sealedManaPercent) ? { sealedManaPercent: entry.sealedManaPercent } : {}),
          ...(magusActiveSlot ? { boardTab: "skills" } : {}),
          source: entry.source,
          custom: true,
        });
        plannerState.skills.supportOrder[instanceId] = ["", "", "", "", ""];
        selectorTargetSetupName = instanceId;
      }
    }
    plannerState.skills.boardSlots = assignSkillBoardSlot(
      plannerState.skills.boardSlots,
      activeSkillBoardTab,
      board,
      selectorTargetRow,
      selectorTargetSetupName,
    );
    persistPlannerState();
    showToast(`${entry.name} setup added`);
  } else {
    if (!selected) return;
    const selectedKey = setupStateKey(selected),
      order = [
        ...(plannerState.skills.supportOrder[selectedKey] ||
          userInstalledSupports(selected).map((support) => support.name)),
      ];
    while (order.length < 5) order.push("");
    const replaced = selected.supports.find(
      (support) => support.enabled && support.name === order[selectorTargetSupportSlot],
    );
    if (replaced && replaced.name !== entry.name) {
      if (replaced.custom)
        plannerState.skills.customSupports[selectedKey] = (
          plannerState.skills.customSupports[selectedKey] || []
        ).filter((item) => item.name !== replaced.name);
      else plannerState.skills.supportEnabled[supportStateKey(selectedKey, replaced.name)] = false;
    }
    plannerState.skills.customSupports[selectedKey] ||= [];
    const captured = selected.supports.find((support) => support.name === entry.name && !support.custom);
    const selectedSupportKey = supportStateKey(selectedKey, entry.name);
    plannerState.skills.supportEnabled[selectedSupportKey] = true;
    if (selectorSpecialConfig)
      plannerState.skills.specialSupportConfigs[selectedSupportKey] = { ...selectorSpecialConfig };
    if (captured) {
      plannerState.skills.supportLevels[selectedSupportKey] = selectorLevel;
    } else {
      const custom = plannerState.skills.customSupports[selectedKey].find((support) => support.name === entry.name);
      if (custom) custom.level = selectorLevel;
      else
        plannerState.skills.customSupports[selectedKey].push({
          name: entry.name,
          level: selectorLevel,
          manaCostMultiplierPercent: specialSupportTierData(entry.name) ? 110 : entry.manaCostMultiplierPercent,
          effects: structuredClone(entry.effects),
          custom: true,
        });
    }
    order[selectorTargetSupportSlot] = entry.name;
    plannerState.skills.supportOrder[selectedKey] = order.slice(0, 5);
    persistPlannerState();
    showToast(`${entry.name} linked to ${selected.name}`);
  }
  closeDialog("skill-selector");
  renderCandidateViews();
}
function selectorEntryName() {
  return selectorEntries()[selectorChoiceIndex]?.name;
}
function clampLevel(value) {
  return Math.max(1, Math.min(40, value));
}
function setSelectorConfig(next) {
  selectorSpecialConfig = next;
  renderSkillSelector();
}
// The detail's controls: the level, a star support's tier, roll and stars, a progression support's tier and rolls, and an
// Activation Medium's lines (tier, rolls, and the stat a line with a choice rolls).
function setSelectorLevel(value) {
  selectorLevel = clampLevel(Number(value) || 20);
  renderSkillSelector();
}
function setSpecialTier(tier) {
  const tierData = configurableSupportTierData(selectorEntryName())?.find((entry) => entry.tier === tier);
  if (tierData) setSelectorConfig({ ...(selectorSpecialConfig || {}), tier, roll: tierData.max });
}
function setSpecialRoll(value) {
  const tier = configurableSupportTierData(selectorEntryName())?.find(
    (item) => item.tier === selectorSpecialConfig?.tier,
  );
  if (tier)
    setSelectorConfig({ ...selectorSpecialConfig, roll: Math.max(tier.min, Math.min(tier.max, Number(value))) });
}
function setSupportStars(stars) {
  setSelectorConfig({ ...(selectorSpecialConfig || {}), stars });
}
function setProgressionTier(tier) {
  const name = selectorEntryName(),
    tierData = progressionSupportTierData(name)?.find((entry) => entry.tier === tier);
  if (!tierData) return;
  const next = { ...(selectorSpecialConfig || {}), tier, rolls: tierData.ranges.map((range) => range.max) };
  const choice = (selectorSpecialConfig?.lines || []).findIndex(
    (line, index) => line?.tier != null && activationMediumAffixLines(name)?.[index]?.choiceGroup,
  );
  delete next.lines;
  const lines = activationMediumLineConfigs(name, next, choice >= 0 ? choice : null);
  setSelectorConfig(lines ? { ...next, lines } : next);
}
function setProgressionRoll(index, value) {
  const tier = progressionSupportTierData(selectorEntryName())?.find(
      (item) => item.tier === selectorSpecialConfig?.tier,
    ),
    range = tier?.ranges[index];
  if (!range) return;
  const rolls = [...(selectorSpecialConfig.rolls || tier.ranges.map((item) => item.max))];
  rolls[index] = Math.max(range.min, Math.min(range.max, Number(value)));
  setSelectorConfig({ ...selectorSpecialConfig, rolls });
}
function setAffixLineTier(index, tier) {
  const name = selectorEntryName(),
    lines = activationMediumLineConfigs(name, selectorSpecialConfig),
    line = activationMediumAffixLines(name)?.[index];
  if (!lines || !line) return;
  const option = tier === "off" ? null : line.options.find((item) => item.tier === tier);
  lines[index] = option
    ? { tier: option.tier, rolls: option.ranges.map((range) => range.max) }
    : { tier: null, rolls: [] };
  setSelectorConfig({
    ...selectorSpecialConfig,
    lines: activationMediumLineConfigs(name, { ...selectorSpecialConfig, lines }, option ? index : null),
  });
}
function setAffixRoll(index, rollIndex, value) {
  const name = selectorEntryName(),
    lines = activationMediumLineConfigs(name, selectorSpecialConfig),
    option = activationMediumAffixLines(name)?.[index]?.options.find((item) => item.tier === lines?.[index]?.tier),
    range = option?.ranges[rollIndex];
  if (!range) return;
  const roll = Math.max(range.min, Math.min(range.max, Number(value)));
  if (!Number.isFinite(roll)) return;
  lines[index] = { ...lines[index], rolls: Object.assign([...lines[index].rolls], { [rollIndex]: roll }) };
  setSelectorConfig({ ...selectorSpecialConfig, lines });
}
function setAffixChoice(from, to) {
  const name = selectorEntryName(),
    lines = activationMediumLineConfigs(name, selectorSpecialConfig);
  if (!lines || from === to) return;
  lines[to] = { ...lines[from] };
  lines[from] = { tier: null, rolls: [] };
  setSelectorConfig({
    ...selectorSpecialConfig,
    lines: activationMediumLineConfigs(name, { ...selectorSpecialConfig, lines }, to),
  });
}
// Skills section commands (apps/web/src/features/skills): rows and sockets of the open board tab (activeSkillBoardTab).
// The skill selector dialog stays here (the follower's skill picker shares it).
function openSkillSelector(row, supportSlot) {
  selectorKind = supportSlot === null ? "skill" : "support";
  selectorTargetRow = row;
  selectorTargetSupportSlot = supportSlot;
  const target = selectorBoardSetups(selectorKind === "support")[selectorTargetRow];
  selectorTargetSetupName = target ? setupStateKey(target) : null;
  selectorChoiceIndex = -1;
  selectorLevel = 20;
  selectorSpecialConfig = null;
  if (selectorKind === "skill" && target) {
    selectorChoiceIndex = selectorEntries().findIndex((entry) => entry.name === target.name);
    // The selector edits the saved base level; "+N level" sources are added on top by the planner.
    selectorLevel = selectorBaseLevel(target);
  } else if (selectorKind === "support" && target) {
    const enabled = userInstalledSupports(target);
    const byName = new Map(enabled.map((support) => [support.name, support]));
    const slots = Array.from({ length: 5 }, () => null);
    (plannerState.skills.supportOrder[setupStateKey(target)] || []).slice(0, 5).forEach((name, index) => {
      slots[index] = byName.get(name) || null;
      byName.delete(name);
    });
    for (const support of byName.values()) {
      const index = slots.indexOf(null);
      if (index >= 0) slots[index] = support;
    }
    const installed = slots[selectorTargetSupportSlot];
    if (installed) {
      selectorChoiceIndex = selectorEntries().findIndex((entry) => entry.name === installed.name);
      selectorLevel = installed.level;
      selectorSpecialConfig = {
        ...defaultConfigurableSupportConfig(installed.name, installed.effects),
        ...(normalizeProgressionSupportConfig(installed.name, installed.specialConfig) || {}),
      };
    }
  }
  skillSelectorSession++;
  renderSkillSelector();
  openDialog("skill-selector");
  $("#skill-selector-search").focus();
}
