// The engine's public entry: everything code outside packages/engine/src (the planner page in src/app, the game log import in
// src/game-log, the React app in apps/web) may use from the engine and its game data. Outside code imports only this
// module (tests/unit/import-graph.test.js); the engine never imports it. It is what a season of the game exposes: when the
// engine moves to the next season, this surface is what the page relies on.

// The calculation and its whole-build readings
export { resolveTalentCandidate } from "./candidate-sources.js";
export { characterStatRows, characterStatTotals, heroTraitLevelBonus, heroTraitSlotLevel } from "./character-stats.js";
export { automaticCombatConditionIds } from "./combat-condition-mode.js";
export { collectNormalizedGearModifiers, energyCostForSupportPositions } from "./engine.js";
export { BASE_CRITICAL_DAMAGE_PERCENT } from "./game-attribute-defaults.js";
export type { ExclusiveChoice, InstalledSupport, MainSkill, PlannerResult, SkillSetup } from "./planner-api.ts";
export { calculatePlanner } from "./planner.js";

// The stored build: defaults, normalization, validation, build codes
export { expandBuildCode } from "./state/build-code-compact.js";
export {
  decodePlannerState,
  defaultPlannerState,
  encodePlannerState,
  normalizePlannerState,
} from "./state/planner-state.ts";
export type { PlannerSkills, PlannerState } from "./state/planner-state.ts";
export { seasonChangeSummary } from "./state/season-migration.js";
export { currentSeason, seasonLabel } from "./state/season.ts";
export type { Season } from "./state/season.ts";
export { selectorBaseLevel } from "./state/skill-level-input.js";
export { clampCombatNumber, combatNumberLimits, validatePlannerState } from "./state/state-validation.ts";
export type { CombatNumber } from "./state/state-validation.ts";
export { normalizeSunsEmbraceItem } from "./state/suns-embrace-normalization.js";

// Ailments
export { parseReapingSource } from "./ailments/reaping-sources.js";

// Combat
export { excludeRecountSources, excludedSteadyDps, summarizeRecount, windowTotals } from "./combat/dummy-recount.js";
export { level85DummyDefenses } from "./combat/target-hit-mitigation.js";

// Defense
export { blessingRecoverySources, parseBlessingRecovery } from "./defense/blessing-gear-effects.js";
export { parseBlessingModifier } from "./defense/blessing-model.js";
export { parseBlockModifier } from "./defense/block-model.js";
export { baseLife, effectiveHpModel } from "./defense/effective-hp.js";

// Followers
export {
  tartarusAffixById,
  tartarusAffixChoices,
  tartarusAffixLines,
  tartarusAffixRanges,
  tartarusAffixSlotPool,
  tartarusAffixSlots,
} from "./followers/follower-affixes.js";
export {
  FOLLOWER_BUFFS,
  FOLLOWER_MAX_SLOTS,
  FOLLOWER_RARITY_SCHEME,
  defaultFollowerState,
  followerById,
  followerInitialSkillRule,
  followerLineStatus,
  followerRarityById,
  followerSelection,
  followerSkillEntryName,
  followerSkillEntryTier,
  followerSkillSlotQuantity,
  followerSkillSlots,
  followerSlotSkills,
  followers,
  missingFollowerEngine,
  normalizeFollowerState,
  plainFollowerLine,
  staticFollowerAffixReading,
  staticFollowerLineReading,
  staticFollowerTraitReading,
  tartarusKeyword,
  tartarusSkillByName,
  tartarusSkillTierName,
  tartarusSkillTiers,
} from "./followers/follower-model.js";

// Gear
export { canDropGearInSlot } from "./gear/gear-drag.js";
export { itemCardRarity } from "./gear/graft-legendaries.js";
export {
  legendaryLineTiers,
  legendaryLowerTierTemplates,
  legendaryTierTemplate,
  legendaryTierTextForAffixId,
} from "./gear/legendary-affix-tiers.js";
export { legendaryModifierSignature, reconcileLegendaryModifiers } from "./gear/legendary-modifier-signature.js";
export {
  allPlaceholderTemplates,
  keywordRollParts,
  placeholderOption,
  placeholderOptionForText,
  placeholderOptionTemplate,
  placeholderPool,
  placeholderTemplates,
} from "./gear/legendary-placeholder-pools.js";
export {
  folkloreRingModifier,
  folkloreRingOptionFromModifiers,
  folkloreRingOptions,
} from "./gear/legendary-ring-options.js";
export {
  isLegacyRareBase,
  rareBaseByGameId,
  rareBaseById,
  rareBaseByName,
  rareBaseForItem,
} from "./gear/rare-base-lookup.js";
export { voraxBaseAffixSlotPool } from "./gear/vorax-base-affixes.js";

// Heroes
export { carinoSpecialAmmoOptions } from "./heroes/carino-special-ammo.js";
export { catsNightSafariStatus } from "./heroes/erika-wind-stalker.js";
export { isExclusiveRevival } from "./heroes/hero-exclusive-revivals.js";
export { switchHeroLoadout } from "./heroes/hero-loadouts.js";
export { heroMemoryLineCoverage, revivedAffixCoverage } from "./heroes/hero-memory-model.js";
export {
  artificialMoonGate,
  baseTraitDescriptionForLevel,
  baseTraitLevelForMemory,
  clampMemoryEnhancement,
  closestMemoryTier,
  endsArtificialMoonSection,
  memoryBaseStatLabel,
  memoryMaxEnhancementForRarity,
  memoryScaledBaseStat,
  memoryTierNumericValue,
  nonBaseTraitLevelExtras,
  reduceBaseTraitMemoryStat,
  slotTraitLevel,
  traitLevelBonusForEnhancement,
  withoutArtificialMoonLines,
} from "./heroes/hero-memory-rules.js";
export { resolveHeroModules } from "./heroes/hero-trait-modules.js";
export {
  EXTRA_PICK_AFFIX,
  EXTRA_PICK_LEVEL,
  TREE_ROW_LEVELS,
  heroTraitTree,
  heroTreeCapacity,
  heroTreeRules,
  heroTreeSelections,
  treeBoardLayout,
  treeMaxCapacity,
  treeRowLevelKey,
  treeRules,
} from "./heroes/hero-trait-tree.js";
export { CLOCKWORK_CORE, TRAIT_SLOT_GRANTS, YOUGA_ULTIMATE_ONE_ID } from "./heroes/trait-board-grants.js";

// Pacts
export { fateExtraSlots, fateSlotChoice, fateSlotChoices } from "./pacts/fate-slot-unlocks.js";
export {
  kismetAffixesWithRolls,
  kismetKindForRing,
  kismetRollControls,
  kismetSlotKey,
  normalizeKismetRolls,
} from "./pacts/kismet-crafting.js";
export {
  activeKismetSlotKeys,
  kismetSlotTexts,
  microFateEffectScale,
  parseKismetEffect,
  starTrailNote,
} from "./pacts/kismet-effects.js";
export { transferKismetSlot } from "./pacts/kismet-slot-transfer.js";
export { equippedKismetSummary } from "./pacts/pact-kismet-summary.js";
export {
  nativePactspiritNodeEffect,
  orderedPactspiritNodes,
  pactspiritEffectsAtLevel,
  pactspiritLevel,
  togglePactNodeChain,
} from "./pacts/pactspirit-levels.js";
export { selectPactspirit, sortPactspirits } from "./pacts/pactspirit-selection.js";

// Skills
export { AIM_UPTIME_AUTO_SENTINEL } from "./skills/aim-model.js";
export { auraGainedLineStatus } from "./skills/aura-gained-effects.js";
export { curseSlotSummary } from "./skills/curse-limit.js";
export { heroCanPlaceMagusInActiveSlot, isSpiritMagusSkill } from "./skills/magus-active-slot.js";
export { assignSkillBoardSlot, moveSkillBoardSlot, skillBoardRows } from "./skills/skill-board-slots.js";
export { classifySkillCoverage, supportClauseCoverage, supportLineCoverage } from "./skills/skill-coverage.js";
export { readWeapon, weaponHands, weaponLocalLineKind, weaponTypeOf } from "./skills/weapon-damage-model.js";

// Supports
export { gameRuleDecides, supportCanSupportSkill } from "./supports/support-compatibility.js";
export {
  supportFitsSlot,
  supportSlotsForSetup,
  transferSupportSlot,
  userInstalledSupports,
} from "./supports/support-slot-transfer.js";

// Talents
export { modeledCoreTalents } from "./talents/core-talent-model.js";
export {
  PEDIGREE_OF_GODS,
  isValidPedigreeAffix,
  normalizePedigreeAffixes,
  pedigreeSlotTypes,
} from "./talents/pedigree-slots.js";
export {
  etherealPrismBases,
  inverseImageEffectMultiplier,
  inverseImageReflectedBounds,
  inverseImageReflectedCoordinates,
  inverseImageReflectionMap,
  inverseImageRoll,
  inverseImageRolls,
  inverseImageTalentNodes,
  prismAddedCoreEffect,
  prismAffixes,
  prismArea,
  prismAreaBounds,
  prismBaseAffixesForBase,
  prismBaseEffect,
  prismLegendaryAffixesForBase,
  prismMutationDownside,
  prismNodeAffixes,
  prismRareAffixesForBase,
  prismReplacesCore,
  prismSupportsLegendaryAffix,
} from "./talents/prism-crafting.js";
export {
  SLATE_BOARD_ROWS,
  adjacentSlateIds,
  canPlaceSlate,
  isCopySlate,
  isJudgmentSlate,
  slateOffsets,
  slateSize,
  slateTransformRules,
} from "./talents/slate-board.js";
export {
  craftedSlateShape,
  isActiveJudgment,
  judgmentAffectedSlateIds,
  judgmentAffixTargetPercent,
  legendarySlateShapes,
  scaleJudgmentAffix,
} from "./talents/slate-judgment.js";
export {
  MAX_TALENT_POINTS,
  TALENT_THRESHOLDS,
  allocateTalentToMaxWithPrerequisites,
  allocateTalentWithPrerequisites,
  canAllocateTalent,
  pruneInvalidTalentRanks,
  removeTalentWithDependents,
  talentEffectText,
  talentPointTotals,
} from "./talents/talent-rules.js";
export { activeTalentTreeLayouts, talentTreeLayouts } from "./talents/talent-layouts.js";
export { godTalentTrees, talentFamilies, talentOptionsForSlot } from "./talents/talent-selection-rules.js";

// Text
export { gameKeyword, gameKeywordSegments, gameKeywordsExplained } from "./text/game-keywords.js";
export { isNameReadCoreClause, nameReadCoreGrant } from "./text/granted-core-lines.js";
export { heroTraitKeyword, heroTraitKeywordSegments, heroTraitKeywordsIn } from "./text/inline-keywords.js";
export {
  combineStatuses,
  coverageContext,
  dazeStatus,
  engineLineStatus,
  heroModuleLineStatus,
  intelligenceLineStatus,
  mainStatLineStatus,
  nameReadCoreStatus,
  neutralStatuses,
  plannerEngines,
  refineCoverage,
  routeStatus,
  setCoverageContext,
  skillLevelLineStatus,
} from "./text/line-coverage.js";
export { residualNonDamageStatus } from "./text/line-families.js";
export { namedGearAffixLines } from "./text/named-gear-affixes.js";
export { DASH, formatRecountInteger, formatShortNumber } from "./text/number-format.js";
export { cleanGameText, normalizePercentageText } from "./text/percentage-text.js";
export { matchTalentTextClause } from "./text/talent-text-effects.js";

// Game data
export { towerSequenceTexts } from "../data/changed-item-ids.js";
export { divinitySlateAffixes, divinitySlateTreeFamilies } from "../data/divinity-slate-affixes.js";
export { memoryAffixTiers, memoryRevivalAffixIds, observedGameAffixIds } from "../data/game-import-tlidb.generated.js";
export { netherKingFixedAffixes } from "../data/nether-king-slate-affixes.js";
export { netherKingUltimateAffixes } from "../data/nether-king-ultimate-affixes.js";
export { pedigreeCoreAffixes } from "../data/pedigree-core-affixes.js";

// Game data: Assets
export { tliArt } from "../data/assets/tli-art.js";

// Game data: Catalogs
export { tlidbSkillCatalog, tlidbSupportCatalog } from "../data/catalogs/tlidb.js";

// Game data: Gear
export { baseAffixTiers, baseAffixes } from "../data/gear/base-affixes.generated.js";
export { beltBlends } from "../data/gear/belt-blends.generated.js";
export { corrosionImplicitsForBase, defaultBaseForItem } from "../data/gear/corrosion-implicits.js";
export { craftAffixes } from "../data/gear/craft-affixes.generated.js";
export { craftItemTypes, equipmentSlots, voraxItemTypes } from "../data/gear/crafting-catalog.js";
export { gearGroupOfType, gearGroups } from "../data/gear/gear-groups.js";
export { legendaryCorrodedModifiers } from "../data/gear/legendary-corroded-modifiers.generated.js";
export { legendaryGear } from "../data/gear/legendary-gear.generated.js";
export { legendaryGearTypes } from "../data/gear/legendary-gear-types.js";
export { rareBaseItems } from "../data/gear/rare-base-items.generated.js";
export { selenaScorchingBeamGear } from "../data/gear/selena-scorching-beam.js";
export { towerSequences } from "../data/gear/tower-sequences.generated.js";
export { voraxCrafting } from "../data/gear/vorax-crafting.generated.js";

// Game data: Heroes
export { allHeroTraits } from "../data/heroes/all-hero-traits.generated.js";
export { heroById, heroCatalog } from "../data/heroes/hero-catalog.js";
export { heroMemoryAffixes } from "../data/heroes/hero-memory-affixes.js";
export { heroMemoryFixedT0Affixes } from "../data/heroes/hero-memory-fixed-t0.js";
export { heroMemoryTierAffixes } from "../data/heroes/hero-memory-tiers.js";
export { lunarPhaseRevivedAffixDetails } from "../data/heroes/memory-revival-details.js";
export {
  equippedBaseTraitSlot,
  lunarPhaseRevivedAffixes,
  memoryFitsBaseTraitSlot,
  normalizeRevivedAffix,
  regularRevivedAffixNames,
  regularRevivedAffixes,
  revivedAffixForMemoryType,
  revivedAffixRollRange,
  revivedAffixTiers,
} from "../data/heroes/memory-revival.js";
export { sageScentIngredients } from "../data/heroes/sage-scent-options.js";
export { sageElixirs } from "../data/heroes/sage-scent.generated.js";

// Game data: Pacts
export { kismetCatalog } from "../data/pacts/kismet-catalog.js";
export { pactspiritCatalog } from "../data/pacts/pactspirit-catalog.js";
export { pactspiritTrees } from "../data/pacts/pactspirit-trees.js";

// Game data: Skills
export { activationMediumGameAffixes } from "../data/skills/activation-medium-game-affixes.generated.js";
export { scaledAuraEffects } from "../data/skills/aura-scaling.js";
export { selenaCompleteSkillLoadout } from "../data/skills/selena-complete-skill-loadout.js";
export { skillProgression } from "../data/skills/skill-progression.generated.js";
export {
  activationMediumAffixLines,
  activationMediumGameLine,
  activationMediumGameRolls,
  activationMediumLineConfigs,
  activationMediumSelectedLines,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  isActivationMedium,
  normalizeProgressionSupportConfig,
  progressionRangeLabels,
  progressionSupportHasStars,
  progressionSupportText,
  progressionSupportTierData,
  specialSupportStarBonus,
  specialSupportTierData,
} from "../data/skills/special-support-tiers.js";
export { supportProgression } from "../data/skills/support-progression.generated.js";

// Game data: Slates
export { selenaScorchingBeamSlates } from "../data/slates/selena-scorching-beam.js";

// Game data: Talents
export { allProfessionTalentCatalogue } from "../data/talents/all-profession-trees.generated.js";
export { TLIDB_PRISM_AFFIXES } from "../data/talents/prism-affixes-tlidb.generated.js";
export { selenaScorchingBeamTalentSetup } from "../data/talents/selena-scorching-beam.js";

// The game id map (0.9 MB), loaded on demand: only a game log import reads it.
export const importGameIdMap = () => import("../data/game-id-map.generated.js").then((module) => module.gameIdMap);
