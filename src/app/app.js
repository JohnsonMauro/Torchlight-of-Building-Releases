import { additionalDamagePathSources } from "./stats/damage-path-sources.js";
import { neutralStatuses, refineCoverage, setCoverageContext, dazeStatus } from "../engine/text/line-coverage.js";
import { OPEN_QUESTIONS, openQuestionsFor, openQuestionsText } from "./stats/open-questions.js";
import { bugAreaForView, platformName } from "./feedback/feedback-links.js";
import { createFeedbackDialog } from "./feedback/feedback-dialog.js";
import { expandBuildCode } from "../engine/state/build-code-compact.js";
import { calculationReportContext } from "./feedback/feedback-report-context.js";
import { APP_VERSION } from "./app-version.js";
import { createPlannerCache } from "./planner-cache.js";
import { microFateEffectScale, parseKismetEffect, starTrailNote } from "../engine/pacts/kismet-effects.js";
import { boostedKismetAffixHtml } from "./kismet-markup.js";
import { parseBlockModifier } from "../engine/defense/block-model.js";
import { kismetAffixCoverage, pactEffectCoverage } from "./pact-coverage.js";
import { modeledCoreTalents } from "../engine/talents/core-talent-model.js";
import { heroMemoryLineCoverage, revivedAffixCoverage } from "../engine/heroes/hero-memory-model.js";
import { catsNightSafariStatus } from "../engine/heroes/erika-wind-stalker.js";
import { calculatePlanner } from "../engine/planner.js";
import { automaticCombatConditionIds } from "../engine/combat-condition-mode.js";
import { classifySkillCoverage, supportClauseCoverage, supportLineCoverage } from "../engine/skills/skill-coverage.js";
import { curseSlotSummary } from "../engine/skills/curse-limit.js";
import { aimUptimeAfterToggle } from "./aim-controls.js";
import { provideViewSource, viewSourceChanged } from "./bridge/view-sources.ts";
import { pactsView, pactspiritSelectorView } from "./bridge/pacts-view-model.ts";
import { carinoAmmoSelectorView, sageScentSelectorView } from "./bridge/hero-dialogs-view-model.ts";
import { displayTexts, htmlTextSegments } from "./bridge/display-text.ts";
import { skillsView } from "./bridge/skills-view-model.ts";
import { slatesView } from "./bridge/slates-view-model.ts";
import { clampCombatNumber, combatNumberLimits } from "../engine/state/state-validation.ts";
import {
  coverageBadge,
  gearLineCoverage,
  talentEffectCoverage,
  talentLineCoverage,
  slateLineCoverage,
  prismAffixCoverage,
  prismAffixCoverageReason,
  heroTraitCoverage,
  heroTraitCoverageReason,
} from "./calculation-coverage.js";
import { scorchingBeamBaseHits, strippedBeamHitCoefficient } from "../engine/skills/scorching-beam-base-hit.js";
import { recountExcludedSources, setRecountSourceExcluded } from "./stats/dummy-recount-panel.js";
import { prepareStatSheet, statsView } from "./bridge/stats-view-model.ts";
import { prepareDamagePath } from "./bridge/damage-path-view-model.ts";
import { fireHitMitigation, mitigateScorchingBeamCycle } from "../engine/combat/target-hit-mitigation.js";
import { canDropGearInSlot } from "../engine/gear/gear-drag.js";
import { equipmentView } from "./bridge/equipment-view-model.ts";
import { heroTraitsView } from "./bridge/hero-traits-view-model.ts";
import {
  talentsView,
  talentDisplayNodes as talentNodesOnBoard,
  talentFamilyClass,
} from "./bridge/talents-view-model.ts";
import { folkloreRingModifier, folkloreRingOptionFromModifiers } from "../engine/gear/legendary-ring-options.js";
import { escapeHtml } from "./html.js";
import { traitKeywordTextHtml, traitKeywordDetailsHtml, traitGrantNoteHtml } from "./trait-keyword-markup.js";
import { isRenameKey, resolveBuildRename } from "./build-tab-rename.js";
import { qolHelpTooltipHtml } from "./qol-help.js";
import {
  followerPanelView,
  followerPickerView,
  followerSkillTooltipHtml,
  followerTooltipHtml,
  followerTooltipRarity,
  followerSkillSelectorView,
  followerSkillSelectorList,
  followerSelectorEntries,
  followerSelectorInitialIndex,
  pickFollower,
  setFollowerSkill,
  followerSkillDraft,
  applyFollowerSkillDraft,
  followerDraftWithTier,
  followerDraftWithAffix,
  readHeroPanelTab,
  writeHeroPanelTab,
} from "./follower-panel.js";
import { followerById, followerRarityById } from "../engine/followers/follower-model.js";
import { resolveTalentCandidate } from "../engine/candidate-sources.js";
import {
  calculateTalentSlateCandidate,
  calculatePactCandidate,
  calculateAuraLedger,
  calculateAvailableEnergy,
  allocateSkillEnergy,
  applyCapturedEnergyCosts,
  energyCostForSupportSlots,
  collectNormalizedGearModifiers,
} from "../engine/engine.js";
import { leveledSkillDamage } from "../engine/skills/skill-damage-progression.js";
import { skillDisplaySs13, highlightedSkillEffect, highlightedAuraEffect } from "./skill-display-ss13.js";
import { supportDisplaySs13, highlightedSupportEffect } from "./support-display-ss13.js";
import { selenaScorchingBeamTalentSetupSs13 } from "../data/talents/selena-scorching-beam-ss13.js";
import { professionTreeLayoutsSs13 } from "../data/talents/profession-tree-layouts-ss13.js";
import { allProfessionTalentCatalogueSs13 } from "../data/talents/all-profession-trees-ss13.generated.js";
import { divinitySlateAffixesSs13, divinitySlateTreeFamiliesSs13 } from "../data/divinity-slate-affixes-ss13.js";
import { netherKingFixedAffixesSs13 } from "../data/nether-king-slate-affixes-ss13.js";
import { assignSkillBoardSlot, moveSkillBoardSlot, skillBoardRows } from "../engine/skills/skill-board-slots.js";
import { heroCanPlaceMagusInActiveSlot, isSpiritMagusSkill } from "../engine/skills/magus-active-slot.js";
import {
  supportFitsSlot,
  transferSupportSlot,
  userInstalledSupports,
} from "../engine/supports/support-slot-transfer.js";
import { gameRuleDecides, supportCanSupportSkill } from "../engine/supports/support-compatibility.js";
import {
  judgmentAffectedSlateIds,
  scaleJudgmentAffix,
  isActiveJudgment,
  judgmentAffixTargetPercent,
} from "../engine/talents/slate-judgment.js";
import { netherKingUltimateAffixesSs13 } from "../data/nether-king-ultimate-affixes-ss13.js";
import { pedigreeCoreAffixesSs13 } from "../data/pedigree-core-affixes-ss13.js";
import { PEDIGREE_OF_GODS, pedigreeSlotTypes, normalizePedigreeAffixes } from "../engine/talents/pedigree-slots.js";
import { selenaScorchingBeamGearSs13 } from "../data/gear/selena-scorching-beam-ss13.js";
import { equipmentSlots, craftItemTypes, voraxItemTypes } from "../data/gear/crafting-catalog-ss13.js";
import { rareBaseItemsSs13 } from "../data/gear/rare-base-items-ss13.generated.js";
import { isLegacyRareBase, rareBaseById, rareBaseByName, rareBaseForItem } from "../engine/gear/rare-base-lookup.js";
import { baseAffixesSs13, baseAffixTiersSs13 } from "../data/gear/base-affixes-ss13.generated.js";
import { voraxBaseAffixSlotPool } from "../engine/gear/vorax-base-affixes.js";
import { craftAffixesSs13 } from "../data/gear/craft-affixes-ss13.generated.js";
import { legendaryGearSs13 } from "../data/gear/legendary-gear-ss13.generated.js";
import { legendaryCorrodedModifiersSs13 } from "../data/gear/legendary-corroded-modifiers-ss13.generated.js";
import {
  baseTypesForSlot,
  corrosionImplicitsForBase,
  defaultBaseForItem,
} from "../data/gear/corrosion-implicits-ss13.js";
import { beltBlendById, beltBlendOptions } from "./belt-blend-options.js";
import { towerSequencesSs13 } from "../data/gear/tower-sequences-ss13.generated.js";
import { towerSequenceOptionMarkup } from "./tower-sequence-options.js";
import { voraxCraftingSs13 } from "../data/gear/vorax-crafting-ss13.generated.js";
import { selenaScorchingBeamPactsSs13 } from "../data/pacts/selena-scorching-beam-ss13.js";
import { pactspiritCatalogSs13 } from "../data/pacts/pactspirit-catalog-ss13.js";
import {
  orderedPactspiritNodes,
  pactspiritEffectsAtLevel,
  pactspiritLevel,
  togglePactNodeChain,
} from "../engine/pacts/pactspirit-levels.js";
import {
  etherealPrismBases,
  inverseImageEffectMultiplier,
  inverseImageReflectedCoordinates,
  inverseImageReflectionMap,
  inverseImageTalentNodes,
  inverseImageRoll,
  inverseImageRolls,
  prismAffixes,
  prismBaseEffect,
  prismReplacesCore,
  prismSupportsLegendaryAffix,
  prismLegendaryAffixesForBase,
  prismArea,
  prismAreaBounds,
  prismNodeAffixes,
  prismRareAffixesForBase,
} from "../engine/talents/prism-crafting.js";
import { prismIcon, prismName } from "./prism-icons.js";
import {
  heroMemoryIcon,
  heroMemoryIsRevived,
  heroTraitSupportConfig,
  memoryTypesByTier,
} from "./hero-memory-display.js";
import { effectLabel, formatEffect, nodeTitle } from "./talent-labels.js";
import { switchHeroLoadout } from "../engine/heroes/hero-loadouts.js";
import { equippedKismetSummary } from "../engine/pacts/pact-kismet-summary.js";
import { fateExtraSlots, fateSlotChoice, fateSlotChoices } from "../engine/pacts/fate-slot-unlocks.js";
import { kismetCatalogSs13 } from "../data/pacts/kismet-catalog-ss13.js";
import {
  kismetAffixesWithRolls,
  kismetKindForRing,
  kismetRollControls,
  normalizeKismetRolls,
} from "../engine/pacts/kismet-crafting.js";
import { transferKismetSlot } from "../engine/pacts/kismet-slot-transfer.js";
import { pactspiritTreesSs13 } from "../data/pacts/pactspirit-trees-ss13.js";
import { activeCapturedPactspirits, selectPactspirit } from "../engine/pacts/pactspirit-selection.js";
import { selenaScorchingBeamSlatesSs13 } from "../data/slates/selena-scorching-beam-ss13.js";
import { selenaCompleteSkillLoadoutSs13 } from "../data/skills/selena-complete-skill-loadout-ss13.js";
import {
  activationMediumAffixLines,
  activationMediumLineConfigs,
  activationMediumSelectedLines,
  activationMediumSecondaryTierData,
  configurableSupportTierData,
  defaultConfigurableSupportConfig,
  normalizeProgressionSupportConfig,
  progressionRangeLabels,
  progressionSupportHasStars,
  progressionSupportTierData,
  progressionSupportText,
  specialSupportStarBonus,
  specialSupportTierData,
} from "../data/skills/special-support-tiers-ss13.js";
import { tliArt } from "../data/assets/tli-art.js";
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../data/catalogs/tlidb-ss13.js";
import { heroById } from "../data/heroes/hero-catalog-ss13.js";
import { allHeroTraitsSs13 } from "../data/heroes/all-hero-traits-ss13.generated.js";
import { sageElixirsSs13 } from "../data/heroes/sage-scent-ss13.generated.js";
import { sageScentIngredientsSs13 } from "../data/heroes/sage-scent-options-ss13.js";
import { heroMemoryAffixesSs13 } from "../data/heroes/hero-memory-affixes-ss13.js";
import { heroMemoryTierAffixesSs13 } from "../data/heroes/hero-memory-tiers-ss13.js";
import { heroMemoryFixedT0AffixesSs13 } from "../data/heroes/hero-memory-fixed-t0-ss13.js";
import {
  regularRevivedAffixesSs13,
  regularRevivedAffixNamesSs13,
  lunarPhaseRevivedAffixesSs13,
  normalizeRevivedAffix,
  revivedAffixForMemoryType,
  revivedAffixTiers,
  revivedAffixRollRange,
  equippedBaseTraitSlot,
  memoryFitsBaseTraitSlot,
} from "../data/heroes/memory-revival-ss13.js";
import { lunarPhaseRevivedAffixDetailsSs13 } from "../data/heroes/memory-revival-details-ss13.js";
import {
  baseTraitDescriptionForLevel,
  withoutArtificialMoonLines,
  baseTraitLevelForMemory,
  slotTraitLevel,
  nonBaseTraitLevelExtras,
  artificialMoonGate,
  clampMemoryEnhancement,
  closestMemoryTier,
  memoryBaseStatLabel,
  memoryScaledBaseStat,
  memoryMaxEnhancementForRarity,
  memoryTierNumericValue,
  traitLevelBonusForEnhancement,
  reduceBaseTraitMemoryStat,
} from "../engine/heroes/hero-memory-rules.js";
import {
  TALENT_THRESHOLDS,
  allocateTalentToMaxWithPrerequisites,
  allocateTalentWithPrerequisites,
  pruneInvalidTalentRanks,
  removeTalentWithDependents,
  talentEffectText,
  talentPointTotals,
} from "../engine/talents/talent-rules.js";
import { talentFamiliesSs13, talentOptionsForSlot } from "../engine/talents/talent-selection-rules.js";
import { canPlaceSlate, isCopySlate, slateSize, slateTransformRules } from "../engine/talents/slate-board.js";
import { downloadBackup, isSafeMode, setSafeMode } from "./storage/recovery-core.js";
import { restoreLatestRevision } from "./storage/build-library.ts";
import { selectorBaseLevel } from "../engine/state/skill-level-input.js";
import { defaultPlannerState, encodePlannerState } from "../engine/state/planner-state.ts";
import {
  clearPlannerState,
  createBuild,
  deleteAllBuilds,
  deleteBuild,
  duplicateActiveBuild,
  importBuildCode,
  libraryLoadIssues,
  loadBuildLibrary,
  loadPlannerState,
  plannerLibraryStorageKey,
  plannerStorageStatus,
  reconcileExternalLibraryChange,
  restoreBuildsFromBackup,
  revisionsTrimmedToFit,
  savePlannerState,
  setActiveBuild,
  openBuildChangedElsewhere,
  dismissOpenBuildChange,
  markPlannerStateClean,
  startNewLibrary,
  updateActiveBuildMetadata,
} from "./storage/build-library.ts";
import { providePlannerCommands } from "./bridge/planner-commands.js";
import { carinoSpecialAmmoOptions } from "../engine/heroes/carino-special-ammo.js";
import {
  importReportText,
  importSnapshot,
  listSnapshots,
  loadGameIdMap,
  readGameLogFile,
} from "../game-log/game-log-import.js";
import {
  gameLogAutoSnapshots,
  gameLogBuildName,
  gameLogFileStatus,
  gameLogFound,
  gameLogListFailedStatus,
  gameLogLogins,
  gameLogSummary,
} from "./bridge/game-log-import-view.ts";
import {
  heroTraitTree,
  heroTreeRules,
  heroTreeSelections,
  treeRowLevelKey,
  EXTRA_PICK_LEVEL,
} from "../engine/heroes/hero-trait-tree.js";
import { treeExtraRowTooltipHtml, EXTRA_ROW_NOTE } from "./hero-trait-tree-markup.js";
import { heroTraitLevelBonus } from "../engine/character-stats.js";
import { normalizeSunsEmbraceItem } from "../engine/state/suns-embrace-normalization.js";
import {
  legendaryModifierSignature,
  reconcileLegendaryModifiers,
} from "../engine/gear/legendary-modifier-signature.js";
import {
  applyLegendaryEditorEdits,
  editableLegendarySlots,
  legendaryEditorModel,
  legendarySourceForItem,
  legendaryTierForText,
  rollValuesFromText,
} from "./legendary-editor-model.js";
import { legendaryLineTiers, legendaryTierTemplate } from "../engine/gear/legendary-affix-tiers.js";
import {
  allPlaceholderTemplates,
  keywordRollParts,
  placeholderOption,
  placeholderOptionForText,
  placeholderOptionTemplate,
  placeholderPool,
} from "../engine/gear/legendary-placeholder-pools.js";
import { itemCardRarity } from "../engine/gear/graft-legendaries.js";

function upgradeExistingCorrodedItems(state) {
  const capturedById = new Map(selenaScorchingBeamGearSs13.items.map((item) => [`captured-${item.slot}`, item]));
  const upgrade = (item) => {
    if (!item) return item;
    if (item.name === "Sun's Embrace") return normalizeSunsEmbraceItem(item);
    const captured =
      capturedById.get(item.sourceInventoryId) ||
      selenaScorchingBeamGearSs13.items.find((entry) => entry.name === item.name);
    if (captured?.corrosionModifiers?.length && !item.corrosionModifiers?.length) {
      const legacyCorrosion =
        item.name === "Coldness Tracer's Tear" ? /^(?:\+8 Dexterity|You can cast 1 additional Curses)$/i : null;
      if (legacyCorrosion) {
        item.modifiers = (item.modifiers || []).filter((text) => !legacyCorrosion.test(text));
        item.corrosionModifiers = [...captured.corrosionModifiers];
        if (captured.implicitModifiers) item.implicitModifiers = [...captured.implicitModifiers];
        if (captured.legendaryModifiers) item.legendaryModifiers = [...captured.legendaryModifiers];
      }
    }
    const legendarySource = legendaryGearSs13.find(
      (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
    );
    if (legendarySource && item.legendaryModifiers?.length) {
      const knownLegendarySignatures = legendaryKnownModifierSignatures(legendarySource);
      reconcileLegendaryModifiers(item, knownLegendarySignatures);
    }
    return item;
  };
  (state.equipmentInventory || []).forEach(upgrade);
  Object.values(state.equipmentOverrides || {}).forEach(upgrade);
  for (const override of Object.values(state.equipmentOverrides || {})) {
    const source = (state.equipmentInventory || []).find((item) => item.id === override.sourceInventoryId);
    if (source?.rarity && !override.rarity) override.rarity = source.rarity;
  }
}

for (const entry of tlidbSkillCatalogSs13) tliArt.skills[entry.name] ||= entry.icon;
for (const entry of tlidbSupportCatalogSs13) tliArt.supports[entry.name] ||= entry.icon;

// Safe mode (Recovery screen): the planner opens on the Builds page and never runs build calculations until resumed.
const calculationsPaused = (() => {
  try {
    return isSafeMode(sessionStorage);
  } catch {
    return false;
  }
})();
let plannerState = loadPlannerState();
upgradeExistingCorrodedItems(plannerState);
// The open tree: the build's first one (applyPlannerState does the same for every build opened later).
let activeTalentPanel = plannerState.talents?.selectedTrees?.[0] || "Goddess of Deception";
let activeTalentSlot = 0;
let activeWorkspaceView = "talents";
let activeStatsPanel = "sheet";
let selectedDamagePath = "hit";
// The damage path tabs' keys (src/app/stats/damage-path-panel.js): a skill's hits, its ailments, a minion, the combined view.
const DAMAGE_PATH_KEY = /^(hit|ignite|reaping|combined|hit:[\w:-]+|ailment:[\w:-]+|minion:[\w:-]+)$/;
let selectedStatSheetSkill = "Scorching Beam";
const workspaceLocationKey = "tli-builder:workspace-location:v1";
function readWorkspaceLocation() {
  try {
    return JSON.parse(sessionStorage.getItem(workspaceLocationKey) || "null");
  } catch {
    return null;
  }
}
function saveWorkspaceLocation() {
  try {
    sessionStorage.setItem(
      workspaceLocationKey,
      JSON.stringify({
        view: activeWorkspaceView === "talents" && talentSlateMode ? "slates" : activeWorkspaceView,
        panel: activeTalentPanel,
        statsPanel: activeStatsPanel,
        damagePath: selectedDamagePath,
        statSheetSkill: selectedStatSheetSkill,
        scrollY: window.scrollY,
      }),
    );
  } catch {}
}
let activePrismTreeSlot = 1;
let prismDraft = null;
let prismEditingId = null;
let pendingPrismPlacement = null;
// Condition ids an exclusive choice can pin (src/engine/planner.js exclusiveConditionGroups).
const exclusiveChoiceConditionIds = [
  "blur",
  "blurRecentlyEnded",
  "moving",
  "nearTarget",
  "lowLifeAssumed",
  "lowManaAssumed",
];
let activeCoreThreshold = 12;
let selectedEquipmentSlot = "helmet";
let equipmentCraftMode = "rare";
let selectedLegendaryIndex = -1;
let selectedLegendaryBase = "";
let selectedLegendaryBeltBlendId = "";
let selectedLegendaryTowerSequenceId = "";
let selectedCorrosionIndex = -1;
let selectedLegendaryCorrodedModifiers = new Set();
let selectedFolkloreRingOption = "left";
// Chosen rolls of "<Random …>" placeholder lines (catalog index -> pool option id; src/engine/gear/legendary-placeholder-pools.js).
let selectedLegendaryPlaceholderChoices = new Map();
// Chosen tiers of tiered legendary lines (catalog index -> tier; src/engine/gear/legendary-affix-tiers.js). Unset = the best tier.
let selectedLegendaryTierChoices = new Map();
let equipmentSearch = "";
let selectedInventoryItemId = null;
let selectedPactspiritSlot = 0;
let activeKismetSlot = null;
let selectedKismetName = "";
let selectedKismetRolls = [];
let inventoryItemEditing = false;
let editingCraftItemId = null;
let selectedVoraxBaseName = "";
let editingCorrodedModifierIndices = new Set();
let editingFolkloreRingOption = "left";
let editingPlaceholderChoices = new Map();
let editingTierChoices = new Map();
let editingLegendaryTexts = new Map();
let selectedSlateId = null;
let slateEditMode = false;
let slatePlacementTarget = null;
let parkedSlates = {};
let slateToolsPosition = null;
let slatePendingDrop = null;
let talentSlateMode = false;
let activeSlateCrafterTab = "craft";
let selectedSlateGod = "Goddess of Deception";
let selectedNetherSlateType = "Judgment";
let selectedLegendarySlateName = "";
let editingCraftedSlateId = null;
let selectorKind = "skill";
let skillSelectorSession = 0; // the skill selector's openings (apps/web/src/shell/dialogs/SkillSelectorDialog.tsx)
let heroSelectorSession = 0; // the hero selector's openings (apps/web/src/shell/dialogs/HeroSelectorDialog.tsx)
let activeHeroDetailTab = "traits";
let pactspiritSelectorSession = 0; // the Pactspirit selector's openings (apps/web/src/shell/dialogs/PactspiritSelectorDialog.tsx)
let followerSelectorSession = 0; // the follower selector's openings (apps/web/src/shell/dialogs/FollowerSelectorDialog.tsx)
let sageScentSelectorKind = "elixir";
let sageScentSelectorSession = 0; // its openings (apps/web/src/shell/dialogs/SageScentSelectorDialog.tsx)
let activeCarinoAmmoSlot = 0;
let carinoAmmoSelectorSession = 0; // its openings (apps/web/src/shell/dialogs/CarinoAmmoSelectorDialog.tsx)
let activeHeroTraitSupportId = "";
let activeHeroMemoryTier = "";
let memoryDraft = null;
let editingMemoryId = null;
let selectorChoiceIndex = -1;
let selectorLevel = 20;
let selectorSpecialConfig = null;
let activeSkillBoardTab = "skills";
let selectorTargetRow = 0;
let selectorTargetSupportSlot = null;
let selectorTargetSetupName = null;
const capturedTalentPanels = new Map(selenaScorchingBeamTalentSetupSs13.panels.map((panel) => [panel.name, panel]));
const professionTreeLayoutsAllSs13 = Object.fromEntries(
  Object.entries(allProfessionTalentCatalogueSs13).map(([name, panel]) => [
    name,
    {
      nodes: panel.nodes,
      edges: panel.edges.filter(([x1, y1, x2, y2]) => Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1),
    },
  ]),
);
const allTalentPanelsSs13 = Object.values(allProfessionTalentCatalogueSs13).map((panel) => ({
  ...panel,
  ...(capturedTalentPanels.get(panel.name) || {}),
  coreTalents: panel.coreTalents,
  allocatedNodes: capturedTalentPanels.get(panel.name)?.allocatedNodes || [],
}));
const equippedSlateIds = new Set(
  plannerState.equippedSlateIds || selenaScorchingBeamSlatesSs13.slates.map((slate) => slate.id),
);
const slateGodKey = (name) =>
  ({
    "Goddess of Deception": "deception",
    "Goddess of Hunting": "hunting",
    "Goddess of Knowledge": "knowledge",
    "God of Machines": "machines",
    "God of Might": "might",
    "God of War": "war",
  })[name] || "deception";
const slateGameCaptureByName = {
  "Fallen Starlight": "./src/assets/tli/slates/game-captures/fallen-starlight.webp",
  "A Corner of Divinity": "./src/assets/tli/slates/game-captures/corner-of-divinity.webp",
  "Pedigree of Gods": "./src/assets/tli/slates/game-captures/pedigree-of-gods.webp",
  "Sparks of Moth Fire": "./src/assets/tli/slates/game-captures/sparks-of-moth-fire.webp",
  "When Sparks Set the Prairie Ablaze": "./src/assets/tli/slates/game-captures/prairie-ablaze.webp",
  "Space Rift": "./src/assets/tli/slates/game-captures/space-rift.svg",
  "Residence of Stars": "./src/assets/tli/slates/game-captures/residence-of-stars.svg",
  "Nether King's Divinity: Judgment": "./src/assets/tli/slates/game-captures/nether-king-judgment.png",
  "Nether King's Divinity: Contamination": "./src/assets/tli/slates/game-captures/nether-kings-contamination.svg",
  "Nether King's Divinity: Offspring": "./src/assets/tli/slates/game-captures/nether-king-offspring.svg",
};
const sparksOfMothFireCopyRules = [
  "Copies the last Talent on the adjacent slate above to this slate. Unable to copy the Core Talent.",
  "Copies the last Talent on the adjacent slate on the left to this slate. Unable to copy the Core Talent.",
  "Copies the last Talent on the adjacent slate below this slate. Unable to copy the Core Talents.",
  "Copies the last Talent on the adjacent slate on the right to this slate. Unable to copy the Core Talent.",
];
const sparksOfMothFireDirections = ["↑ Above", "← Left", "↓ Below", "→ Right"];
const residenceOfStarsCopyRule =
  "Copies the Medium Talents on the adjacent slate to this slate. Unable to copy Legendary Medium Talents.";
const prairieAblazeCopyRule = "Copies the last Talent on all adjacent slates. Unable to copy Core Talents.";
const spaceRiftCopyRules = [
  "Copies the Medium Talents, Legendary Medium Talents, and Ultimate Nether King Talents on the adjacent slate on the left to this slate",
  "Copies the Medium Talents, Legendary Medium Talents, and Ultimate Nether King Talents on the adjacent slate on the right to this slate",
];
const allGodSlateTalentTypes = ["Micro Talent", "Medium Talent", "Legendary Medium Talent"];
const legendaryTalentSlotTypes = {
  "Fallen Starlight": Array.from({ length: 4 }, () => allGodSlateTalentTypes),
  "A Corner of Divinity": Array.from({ length: 2 }, () => allGodSlateTalentTypes),
  [PEDIGREE_OF_GODS]: pedigreeSlotTypes,
};
const allDivinitySlateAffixes = Object.entries(divinitySlateAffixesSs13).flatMap(([god, affixes]) =>
  affixes.map((affix) => ({ ...affix, god })),
);
const slateAffixFamilyClass = (tree) => {
  const god = Object.entries(divinitySlateTreeFamiliesSs13).find(([, trees]) => trees.includes(tree))?.[0];
  return god ? `talent-family-${god.toLowerCase().replaceAll(" ", "-")}` : "";
};
const slateGodFamilyClass = (god) =>
  divinitySlateTreeFamiliesSs13[god] ? `talent-family-${god.toLowerCase().replaceAll(" ", "-")}` : "";
const coloredSlateAffix = (affix) => {
  const colon = affix.indexOf(": ");
  if (colon < 0) return escapeHtml(affix);
  const tree = affix.slice(0, colon),
    family = slateAffixFamilyClass(tree);
  return family
    ? `<b class="slate-affix-tree ${family}">${escapeHtml(tree)}</b>${escapeHtml(affix.slice(colon))}`
    : escapeHtml(affix);
};
const netherKingFixedPool = netherKingFixedAffixesSs13.map((affix) => ({
  ...affix,
  tree: "Nether King",
  god: "Nether King",
}));
const netherKingBrandPool = [
  ...allDivinitySlateAffixes,
  ...netherKingFixedPool,
  ...netherKingUltimateAffixesSs13.map((affix) => ({ ...affix, tree: "Nether King", god: "Nether King" })),
];
const godSlateCaptureByKey = {
  hunting: "goddess-of-hunting",
  knowledge: "goddess-of-knowledge",
  machines: "god-of-machines",
  might: "god-of-might",
  war: "god-of-war",
};
const godSlateShapeCapture = (god, shape) => `./src/assets/tli/slates/game-captures/${god}-${shape}.png`;
const godSlateCapturedShapes = {
  deception: [
    null,
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  hunting: [
    null,
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  knowledge: [
    null,
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  machines: [
    null,
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  might: [
    null,
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  war: [
    null,
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
};
const craftedSlateIcon = (slate) => {
  const template = slate.template || slate.name;
  if (String(slate.shape).endsWith("-0") && godSlateCaptureByKey[slateGodKey(slate.god)])
    return `./src/assets/tli/slates/game-captures/${godSlateCaptureByKey[slateGodKey(slate.god)]}.svg`;
  if (legendarySlateShapes[template] && slateGameCaptureByName[template]) return slateGameCaptureByName[template];
  const shapeIndex = Number(String(slate.shape).match(/-(1|2|3)$/)?.[1]);
  if (shapeIndex && slate.icon?.includes("/slates/gods/"))
    return godSlateShapeCapture(slateGodKey(slate.god), slateShapeCodes[shapeIndex]);
  return slateGameCaptureByName[template] || slate.icon;
};
const legendarySlateShapes = {
  "Fallen Starlight": [
    [0, 0],
    [0, 1],
  ],
  "Space Rift": [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  "A Corner of Divinity": [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  "Residence of Stars": [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [1, 3],
  ],
  "Pedigree of Gods": [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ],
  "Sparks of Moth Fire": [[0, 0]],
  "When Sparks Set the Prairie Ablaze": [[0, 0]],
  "Nether King's Divinity: Judgment": [
    [0, 0],
    [3, 0],
    [3, 3],
  ],
  "Nether King's Divinity: Contamination": [
    [0, 0],
    [0, 1],
  ],
  "Nether King's Divinity: Offspring": [
    [2, 0],
    [1, 1],
    [0, 2],
  ],
};
const craftedSlateShape = (shape, name, god) => {
  if (legendarySlateShapes[name]) return legendarySlateShapes[name];
  const index = Number(String(shape).match(/-(\d+)$/)?.[1]);
  if (Number.isInteger(index))
    return (
      godSlateCapturedShapes[slateGodKey(god)]?.[index] ||
      (slateGodKey(god) === "deception"
        ? [
            [0, 0],
            [1, 0],
            [1, 1],
            [2, 1],
          ]
        : [
            [1, 0],
            [2, 0],
            [0, 1],
            [1, 1],
          ])
    );
  return (
    {
      corner: [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      line: [
        [0, 0],
        [0, 1],
      ],
      tee: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      single: [[0, 0]],
    }[shape] || [[0, 0]]
  );
};
const craftedSlateForBoard = (slate) => ({
  ...slate,
  icon: craftedSlateIcon(slate),
  shape: craftedSlateShape(slate.shape, slate.template || slate.name, slate.god),
  fixed: (slate.affixes || []).filter(Boolean),
  level: 100,
});
const slatesForBoard = () => [
  ...selenaScorchingBeamSlatesSs13.slates,
  ...(plannerState.slates?.inventory || []).map(craftedSlateForBoard),
];
function parkSlateBesideGrid(slate, rotation = 0, flipX = 1, flipY = 1) {
  const stage = document.querySelector("#slate-board .slate-stage"),
    board = stage?.querySelector(".divinity-board");
  if (!stage || !board) return false;
  const stageRect = stage.getBoundingClientRect(),
    boardRect = board.getBoundingClientRect(),
    cell = boardRect.width / 6;
  const [columns, rows] = slateSize(slate, rotation, flipX, flipY),
    width = columns * cell,
    height = rows * cell;
  const blocked = [
    {
      x: boardRect.left - stageRect.left,
      y: boardRect.top - stageRect.top,
      width: boardRect.width,
      height: boardRect.height,
    },
  ];
  for (const [id, position] of Object.entries(parkedSlates)) {
    if (id === slate.id) continue;
    const other = slatesForBoard().find((item) => item.id === id);
    if (!other) continue;
    const [otherColumns, otherRows] = slateSize(
      other,
      position.rotation || 0,
      position.flipX || 1,
      position.flipY || 1,
    );
    blocked.push({
      x: (position.x / 100) * stageRect.width,
      y: (position.y / 100) * stageRect.height,
      width: otherColumns * cell,
      height: otherRows * cell,
    });
  }
  for (let y = 8; y + height <= stageRect.height; y += 12)
    for (let x = 8; x + width <= stageRect.width; x += 12) {
      if (
        blocked.some(
          (rect) =>
            x < rect.x + rect.width + 8 &&
            x + width + 8 > rect.x &&
            y < rect.y + rect.height + 8 &&
            y + height + 8 > rect.y,
        )
      )
        continue;
      parkedSlates = {
        ...parkedSlates,
        [slate.id]: {
          x: Math.round((x / stageRect.width) * 10000) / 100,
          y: Math.round((y / stageRect.height) * 10000) / 100,
          rotation,
          flipX,
          flipY,
        },
      };
      return true;
    }
  if (stageRect.height < 10000) {
    stage.style.minHeight = `${Math.ceil(stageRect.height + height + 24)}px`;
    if (stage.getBoundingClientRect().height > stageRect.height)
      return parkSlateBesideGrid(slate, rotation, flipX, flipY);
  }
  return false;
}
const validSlatePlacements = (placements) =>
  placements &&
  slatesForBoard()
    .filter((slate) => equippedSlateIds.has(slate.id))
    .every((slate) => placements[slate.id] && canPlaceSlate(slate, placements[slate.id], placements, slatesForBoard()));
let slatePlacements =
  plannerState.slates?.geometryVersion === 4 && validSlatePlacements(plannerState.slates?.placements)
    ? plannerState.slates.placements
    : structuredClone(selenaScorchingBeamSlatesSs13.capturedPlacements);
parkedSlates = plannerState.slates?.parked || {};
const disabledEquipmentSlots = new Set(plannerState.disabledEquipmentSlots);
const disabledSupportNames = new Set(plannerState.disabledSupportNames);
const talentRanks = new Map();
for (const panel of selenaScorchingBeamTalentSetupSs13.panels.filter(
  (panel) => plannerState.talents.useCapturedRanks !== false && plannerState.talents.selectedTrees.includes(panel.name),
)) {
  for (const node of panel.allocatedNodes) {
    const key = `${panel.name}:${node.coordinate}`;
    talentRanks.set(key, plannerState.talentRanks[key] ?? node.rank);
  }
}
for (const [key, rank] of Object.entries(plannerState.talentRanks || {}))
  if (!talentRanks.has(key)) talentRanks.set(key, rank);
for (const [panel, coordinate] of Object.entries(plannerState.talents.installedPrismNodes || {}))
  if (plannerState.talents.installedPrisms?.[panel]) talentRanks.set(`${panel}:${coordinate}`, 0);
const $ = (selector) => document.querySelector(selector);
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const format = (value) => number.format(value);
const artwork = (src, alt, className = "game-art") =>
  src
    ? `<span class="art-frame ${className}"><img src="${src}" alt="${escapeHtml(alt)}"><span aria-hidden="true">◆</span></span>`
    : `<span class="art-frame ${className}" aria-label="${escapeHtml(alt)}"><span aria-hidden="true">◆</span></span>`;

let searchableSelectTarget = null,
  searchableSelectMatches = [];
const fullTextTitle = (text) => (text ? ` title="${escapeHtml(text)}"` : "");
const slateAffixSelectPools = new WeakMap();
function slateAffixChoice(affix, fallbackGod, legendary = false) {
  const { tree, name, effect, god, talentName, maxDivinityEffect } = affix;
  const details = `${name}: ${legendary && talentName ? `${talentName} — ` : ""}${effect}`;
  return {
    value: `${tree}: ${details}`,
    textContent: `${tree} · ${name} — ${legendary && talentName ? `${talentName}: ` : ""}${effect}`,
    dataset: {
      affixTree: tree,
      affixDetails: details,
      affixFamily: (god || fallbackGod).toLowerCase().replaceAll(" ", "-"),
      maxDivinityEffect: maxDivinityEffect === 1 ? "1" : "",
    },
  };
}
function setSlateAffixPool(select, items, fallbackGod, legendary = false) {
  slateAffixSelectPools.set(
    select,
    items.map((item) => slateAffixChoice(item, fallbackGod, legendary)),
  );
}
function closeSearchableSelect() {
  $("#select-search-popover")?.remove();
  searchableSelectTarget = null;
  searchableSelectMatches = [];
}
function searchableOptions(select, query = "") {
  const needle = query.trim().toLowerCase();
  const pool = slateAffixSelectPools.get(select);
  if (pool) {
    const choices = pool
      .map((option, index) => ({
        option: { ...option, selected: select.value === option.value },
        index: index + 1,
        label: option.textContent,
        group: "",
      }))
      .filter(({ label }) => !needle || label.toLowerCase().includes(needle))
      .slice(0, 99);
    return needle
      ? choices
      : [{ option: select.options[0], index: 0, label: select.options[0].textContent.trim(), group: "" }, ...choices];
  }
  return [...select.options]
    .map((option, index) => ({
      option,
      index,
      label: option.textContent.trim(),
      group: option.parentElement?.tagName === "OPTGROUP" ? option.parentElement.label : "",
    }))
    .filter(
      ({ option, label, group }) =>
        !option.disabled &&
        (!needle ||
          `${label} ${group} ${option.dataset.revivedDescription || ""} ${option.dataset.optionDescription || ""} ${option.dataset.optionMeta || ""}`
            .toLowerCase()
            .includes(needle)),
    );
}
function renderSearchableSelectResults(query = "") {
  const results = $("#select-search-results");
  if (!results || !searchableSelectTarget) return;
  searchableSelectMatches = searchableOptions(searchableSelectTarget, query);
  results.innerHTML = searchableSelectMatches.length
    ? searchableSelectMatches
        .map(
          ({ option, index, label, group }, resultIndex) =>
            `<button type="button" class="select-search-result ${option.selected ? "selected" : ""} ${option.dataset.maxDivinityEffect === "1" ? "max-one-divinity" : ""}" data-select-search-index="${index}" data-select-search-result="${resultIndex}"${fullTextTitle([label, option.dataset.revivedDescription || option.dataset.optionDescription, option.dataset.optionMeta].filter(Boolean).join(" — "))}>${group ? `<small>${escapeHtml(group)}</small>` : ""}${option.dataset.affixTree ? `<div class="select-affix-row"><span class="select-affix-tag talent-family-${escapeHtml(option.dataset.affixFamily)}">${escapeHtml(option.dataset.affixTree)}</span><span class="select-affix-details">${escapeHtml(option.dataset.affixDetails)}</span>${option.dataset.maxDivinityEffect === "1" ? '<strong class="max-divinity-badge" title="Only one copy of this effect is active across equipped slates">MAX ACTIVE: 1</strong>' : ""}</div>` : option.dataset.revivedDescription ? `<strong class="select-revived-name">${escapeHtml(label)}</strong><span class="select-revived-description">${escapeHtml(option.dataset.revivedDescription)}</span>` : option.dataset.optionDescription || option.dataset.optionMeta ? `<strong class="select-option-name">${escapeHtml(label)}</strong>${option.dataset.optionDescription ? `<span class="select-option-description">${escapeHtml(option.dataset.optionDescription)}</span>` : ""}${option.dataset.optionMeta ? `<small class="select-option-meta">${escapeHtml(option.dataset.optionMeta)}</small>` : ""}` : `<span>${escapeHtml(label)}</span>`}</button>`,
        )
        .join("")
    : "<p>No matching options</p>";
}
function openSearchableSelect(select, initialQuery = "") {
  closeSearchableSelect();
  searchableSelectTarget = select;
  const revivedAffix = select.matches('[data-memory-field="revivedAffix"]');
  const rect = select.getBoundingClientRect(),
    dialog = select.closest("dialog"),
    dialogRect = dialog?.getBoundingClientRect(),
    footerRect = dialog?.querySelector(":scope > footer")?.getBoundingClientRect(),
    popover = document.createElement("div");
  popover.id = "select-search-popover";
  popover.className = `select-search-popover${revivedAffix ? " revived-affix-picker" : ""}`;
  const boundaryTop = Math.max(8, (dialogRect?.top || 0) + 8),
    boundaryBottom = Math.min(window.innerHeight - 8, footerRect?.top || dialogRect?.bottom || window.innerHeight - 8),
    desiredHeight = revivedAffix ? 430 : 356,
    spaceBelow = boundaryBottom - rect.bottom - 4,
    spaceAbove = rect.top - boundaryTop - 4,
    openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow,
    availableHeight = Math.max(150, Math.min(desiredHeight, openAbove ? spaceAbove : spaceBelow));
  popover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(288, rect.width) - 8))}px`;
  popover.style.top = `${openAbove ? Math.max(boundaryTop, rect.top - availableHeight - 4) : rect.bottom + 4}px`;
  popover.style.width = `${Math.max(280, rect.width)}px`;
  popover.style.maxHeight = `${availableHeight}px`;
  popover.innerHTML = revivedAffix
    ? `<div class="revived-picker-heading"><strong>Select Revived Affix</strong><button type="button" data-close-select-search aria-label="Close revived affix selector">×</button></div><label class="revived-picker-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search revived affixes" placeholder="Search revived affixes…" value="${escapeHtml(initialQuery)}"></label><div id="select-search-results"></div>`
    : `<input type="search" aria-label="Search options" placeholder="Type to search…" value="${escapeHtml(initialQuery)}"><div id="select-search-results"></div>`;
  const popoverHost = select.closest("dialog") || document.body;
  popoverHost.append(popover);
  if (typeof popover.showPopover === "function") {
    popover.setAttribute("popover", "manual");
    popover.showPopover();
  }
  renderSearchableSelectResults(initialQuery);
  const input = popover.querySelector("input"),
    results = popover.querySelector("#select-search-results");
  results.style.maxHeight = `${Math.max(70, availableHeight - (revivedAffix ? 112 : 58))}px`;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function chooseSearchableOption(index) {
  if (!searchableSelectTarget) return;
  const choice = slateAffixSelectPools.get(searchableSelectTarget)?.[Number(index) - 1];
  if (choice) {
    searchableSelectTarget.querySelector("[data-selected-affix]")?.remove();
    const option = new Option(choice.textContent, choice.value, true, true);
    option.dataset.selectedAffix = "";
    Object.assign(option.dataset, choice.dataset);
    searchableSelectTarget.add(option);
  } else searchableSelectTarget.selectedIndex = Number(index);
  searchableSelectTarget.dispatchEvent(new Event("input", { bubbles: true }));
  searchableSelectTarget.dispatchEvent(new Event("change", { bubbles: true }));
  closeSearchableSelect();
}

function capturePlannerState() {
  return {
    schemaVersion: 1,
    disabledEquipmentSlots: [...disabledEquipmentSlots],
    disabledSupportNames: [...disabledSupportNames],
    removedInventoryItemIds: plannerState.removedInventoryItemIds || [],
    equipmentOverrides: plannerState.equipmentOverrides,
    equipmentInventory: plannerState.equipmentInventory,
    hero: plannerState.hero,
    skills: plannerState.skills,
    equippedSlateIds: [...equippedSlateIds],
    slates: {
      geometryVersion: 4,
      placements: slatePlacements,
      parked: parkedSlates,
      affixOverrides: plannerState.slates?.affixOverrides || {},
      inventory: plannerState.slates?.inventory || [],
    },
    talentRanks: Object.fromEntries(talentRanks),
    talents: plannerState.talents,
    combat: plannerState.combat,
    followers: plannerState.followers,
    pacts: plannerState.pacts,
  };
}

let pendingCandidateRender = false;
let renderPassPlanner = null;

function persistPlannerState() {
  plannerState = capturePlannerState();
  upgradeExistingCorrodedItems(plannerState);
  savePlannerState(plannerState);
  // This tab's save replaced another tab's version (last save wins): the notice is out of date.
  if (document.getElementById("other-tab-notice") && !openBuildChangedElsewhere()) hideOtherTabNotice();
  updateStorageStatus();
  renderPassPlanner = null;
  if (!pendingCandidateRender) {
    pendingCandidateRender = true;
    queueMicrotask(() => {
      if (!pendingCandidateRender) return;
      pendingCandidateRender = false;
      renderCandidateViews();
    });
  }
}

function startActiveBuildRename(tab) {
  if (!tab || tab.classList.contains("renaming")) return;
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  if (!active) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "loadout-tab-rename";
  input.value = active.name;
  input.setAttribute("aria-label", "Build name");
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const name = save ? resolveBuildRename(input.value, active.name) : null;
    tab.classList.remove("renaming");
    input.remove();
    if (name) {
      updateActiveBuildMetadata({ name });
      updateStorageStatus();
      showToast("Build renamed");
    } else updateStorageStatus();
    tab.focus({ preventScroll: true });
  };
  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("contextmenu", (event) => event.stopPropagation());
  tab.classList.add("renaming");
  tab.querySelector("strong").after(input);
  input.focus();
  input.select();
}

function updateStorageStatus() {
  const status = document.querySelector(".loadout-status");
  if (!status) return;
  const library = loadBuildLibrary(),
    active = library.builds.find((build) => build.id === library.activeBuildId);
  const tab = document.querySelector(".loadout-tab");
  if (tab) {
    tab.querySelector("span").textContent = active ? "Active build" : "No active build";
    tab.querySelector("strong").textContent = active?.name || "Start a new build";
    if (active) tab.title = "Right-click to rename";
    else tab.removeAttribute("title");
  }
  const unsaved = plannerStorageStatus() === "unsaved";
  status.classList.toggle("storage-warning", unsaved);
  status.classList.toggle("no-build", !active);
  status.querySelector("span").textContent = unsaved
    ? libraryLoadIssues().unreadable
      ? "Saved builds unreadable — changes not saved"
      : "Storage full — changes not saved. Export your build."
    : active
      ? revisionsTrimmedToFit()
        ? "Autosaved locally · older revisions removed to fit browser storage"
        : "Autosaved locally"
      : "No build saved";
}

const cachedPlanner = createPlannerCache((state) => {
  if (calculationsPaused) throw new Error("Safe mode: calculations paused");
  return calculatePlanner(state);
});
function currentPlanner() {
  const planner = renderPassPlanner || cachedPlanner(capturePlannerState());
  setCoverageContext(planner);
  return planner;
}
// Curse limit (user-confirmed 2026-10-19: slots go in skill bar order, then gear, then pacts): the skill bar curses and the
// triggered curse lines not applied (past the limit, or a duplicate of a curse already applied: user decision 2026-10-19),
// for the red outline and the "Not applied" note. Each triggered entry carries its own reason.
function curseLimitState() {
  try {
    return curseSlotSummary(currentPlanner());
  } catch {
    return null;
  }
}
function curseSkillLeftOut(name) {
  const state = curseLimitState();
  return Boolean(name && state?.leftOut.some((curse) => curse.kind === "skill" && curse.name === name));
}
const curseLineKey = (text) =>
  String(text ?? "")
    .replace(/(\d)\s+%/g, "$1%")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
function curseLinesLeftOut() {
  const curses = currentPlanner()?.mechanics?.curses;
  return curses?.notApplied || curses?.limitDropped || [];
}
// An inventory copy carries its base slot ("ring"); the equipped slot it sits in is the one the curse records.
const curseOnItem = (curse, item) =>
  item
    ? curse.origin === "gear" &&
      (curse.slot === item.slot || curse.slot === equippedSlotForInventoryItem(item)) &&
      curse.source === item.name
    : curse.origin !== "gear";
function curseLineLeftOutReason(text, item = null) {
  const key = curseLineKey(text);
  if (!key) return "";
  const hit = curseLinesLeftOut().find((curse) => curseOnItem(curse, item) && key.includes(curseLineKey(curse.text)));
  return hit ? hit.reason || curseLimitState()?.reason || "" : "";
}
function curseItemOffReason(item) {
  if (!item) return "";
  const hit = curseLinesLeftOut().find((curse) => curseOnItem(curse, item));
  return hit ? hit.reason || curseLimitState()?.reason || "curse limit reached" : "";
}
function curseBadge(status, text) {
  const reason = curseLineLeftOutReason(text);
  return coverageBadge(status, reason ? `${status}: ${reason}` : "");
}
function curseLimitNoteHtml(reason) {
  return reason ? `<p class="curse-limit-note">Not applied: ${escapeHtml(reason)}</p>` : "";
}
// Manual Config mode: the same build in automatic mode tells which conditions have a source (src/configuration-panel.js).
const sourceProbeCache = createPlannerCache((state) => {
  if (calculationsPaused) throw new Error("Safe mode: calculations paused");
  return calculatePlanner(state);
});
function conditionSourceProbe() {
  const state = capturePlannerState();
  return sourceProbeCache({
    ...state,
    combat: { ...state.combat, conditionMode: "auto", conditions: {}, bestCaseOverrides: {} },
  });
}
function currentPactImpact() {
  return currentPlanner().pact;
}
function currentEquipmentImpact() {
  return currentPlanner().equipment;
}
const supportStateKey = (setupName, supportName) => `${setupName}:${supportName}`;
const setupStateKey = (setup) =>
  typeof setup === "string" ? setup : setup?.setupKey || setup?.instanceId || setup?.name;
function currentEditedSetups() {
  return currentPlanner().activation.setups;
}
function skillLevelLabel(skill) {
  const added = Number(skill.addedLevels) || 0;
  return `Lv.${skill.baseLevel}${added ? ` <span class="skill-level-bonus ${added < 0 ? "negative" : ""}">${added > 0 ? "+" : ""}${added}</span>` : ""}`;
}
function skillLevelDamageBonus(skill) {
  return leveledSkillDamage(skill).additionalPercent;
}
function currentAuraLedger() {
  return currentPlanner().aura;
}
function currentIgniteLimit() {
  return currentPlanner().igniteLimit;
}
function currentSourceDamageMultiplier() {
  return currentPlanner().sourceDamageMultiplier;
}
function refreshPactCandidate() {
  persistPlannerState();
  renderCandidateViews();
}

function emptyPlannerState() {
  const empty = structuredClone(defaultPlannerState);
  empty.disabledEquipmentSlots = equipmentSlots.map(([slot]) => slot);
  empty.removedInventoryItemIds = selenaScorchingBeamGearSs13.items.map((item) => `captured-${item.slot}`);
  empty.equipmentOverrides = {};
  empty.equipmentInventory = [];
  empty.hero = {
    selectedHeroId: "",
    selectedTraits: {},
    memories: {},
    memoryTraitLevels: {},
    memoryInventory: [],
    equippedMemoryIds: {},
    baseTraitMemoryId: "",
    baseTraitMemoryRoll: null,
    sageScent: { elixir: "", damage: "", defense: "", functional: "" },
    carinoSpecialAmmoSupports: ["", "", ""],
    heroTraitSupports: {},
    heroTraitSupportLevels: {},
    heroTraitSupportConfigs: {},
    treeTraits: {},
    heroLoadouts: {},
  };
  empty.skills = {
    setupOrder: [],
    boardSlots: { skills: [], auras: [] },
    supportOrder: {},
    setupEnabled: Object.fromEntries(selenaCompleteSkillLoadoutSs13.setups.map((setup) => [setup.name, false])),
    skillLevels: {},
    supportEnabled: {},
    supportLevels: {},
    specialSupportConfigs: {},
    customSupports: {},
    customSetups: [],
  };
  empty.equippedSlateIds = [];
  empty.slates = { geometryVersion: 4, placements: {}, affixOverrides: {} };
  empty.talentRanks = {};
  empty.talents = {
    useCapturedRanks: false,
    selectedTrees: ["", "", "", ""],
    coreSelections: {},
    prismInventory: [],
    installedPrisms: {},
    installedPrismNodes: {},
  };
  empty.pacts = {
    activeSpirits: Object.fromEntries(selenaScorchingBeamPactsSs13.pactspirits.map((spirit) => [spirit.name, false])),
    selectedSpirits: ["", "", ""],
    spiritLevels: {},
    nativeNodeQuantities: {},
    kismetSlots: {},
    fateUnlocks: {},
    kismetSlotMode: true,
    volcanoEnabled: [false, false, false, false],
    reapingDurationQuantity: 0,
    spellBlockEnabled: [false],
    attackBlockEnabled: [false, false],
  };
  empty.combat = {
    ...empty.combat,
    conditions: {
      ...Object.fromEntries(Object.keys(empty.combat.conditions).map((key) => [key, false])),
      targetLife: true,
      prebuiltSelfBuffs: true,
    },
  };
  return empty;
}

function applyPlannerState(next) {
  upgradeExistingCorrodedItems(next);
  plannerState = next;
  activeTalentSlot = 0;
  activeTalentPanel = next.talents?.selectedTrees?.[0] || "Goddess of Deception";
  disabledEquipmentSlots.clear();
  next.disabledEquipmentSlots.forEach((value) => disabledEquipmentSlots.add(value));
  disabledSupportNames.clear();
  next.disabledSupportNames.forEach((value) => disabledSupportNames.add(value));
  for (const setup of selenaCompleteSkillLoadoutSs13.setups)
    for (const support of setup.supports)
      if (next.skills.supportEnabled[supportStateKey(setup.name, support.name)] === false)
        disabledSupportNames.add(support.name);
  equippedSlateIds.clear();
  (next.equippedSlateIds || selenaScorchingBeamSlatesSs13.slates.map((slate) => slate.id)).forEach((value) =>
    equippedSlateIds.add(value),
  );
  slatePlacements =
    next.slates?.geometryVersion === 4 && validSlatePlacements(next.slates?.placements)
      ? next.slates.placements
      : structuredClone(selenaScorchingBeamSlatesSs13.capturedPlacements);
  parkedSlates = next.slates?.parked || {};
  talentRanks.clear();
  for (const panel of selenaScorchingBeamTalentSetupSs13.panels.filter(
    (panel) => next.talents.useCapturedRanks !== false && next.talents.selectedTrees.includes(panel.name),
  ))
    for (const node of panel.allocatedNodes) talentRanks.set(panel.name + ":" + node.coordinate, node.rank);
  for (const [key, value] of Object.entries(next.talentRanks || {})) talentRanks.set(key, value);
  for (const [panel, coordinate] of Object.entries(next.talents.installedPrismNodes || {}))
    if (next.talents.installedPrisms?.[panel]) talentRanks.set(`${panel}:${coordinate}`, 0);
  markLoadedStateClean();
  persistPlannerState();
}
// A freshly loaded build (loadPlannerState) differs from its stored copy only by
// load-time repairs (upgradeExistingCorrodedItems, derived talent ranks...).
// That is not an edit: build-library.ts skips saves equal to this state, so a
// tab without user edits never writes (and never triggers other tabs' notice).
function markLoadedStateClean() {
  try {
    const state = capturePlannerState();
    upgradeExistingCorrodedItems(state);
    markPlannerStateClean(state);
  } catch {}
}

// Build library commands (src/app/bridge/planner-commands.js). The Builds view (apps/web/src/features/builds) renders the library
// itself; these keep the planner's own state in step: save the open build, change the library, reload, re-render.
function openLibraryBuild(id, view) {
  persistPlannerState();
  setActiveBuild(id);
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  activateWorkspaceView(view, { scroll: false });
}
function backupLibraryBuilds() {
  persistPlannerState();
  try {
    showToast(`Backup downloaded · ${downloadBackup()}`);
  } catch {
    showToast("The backup could not be created");
  }
}
providePlannerCommands({
  openBuild: (id) => {
    openLibraryBuild(id, "builds");
    showToast("Build selected");
  },
  editBuild: (id) => {
    openLibraryBuild(id, "talents");
    showToast("Build opened for editing");
  },
  newBuild: () => {
    createBuild({ name: "New build", state: emptyPlannerState() });
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("talents", { scroll: false });
    showToast("New build ready · Rename it in Build Library");
  },
  duplicateActiveBuild: () => {
    persistPlannerState();
    duplicateActiveBuild();
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    showToast("Build duplicated — safe to experiment");
  },
  saveBuildDetails: ({ name, notes }) => {
    updateActiveBuildMetadata({ name, notes });
    updateStorageStatus();
    showToast("Build details saved");
  },
  deleteBuild: (id) => {
    deleteBuild(id);
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("builds", { scroll: false });
    showToast("Build deleted");
  },
  deleteAllBuilds: () => {
    deleteAllBuilds();
    applyPlannerState(loadPlannerState());
    renderCandidateViews();
    activateWorkspaceView("builds", { scroll: false });
    showToast("All builds deleted");
  },
  backupBuilds: backupLibraryBuilds,
  restoreBuilds: () => $("#restore-builds-file").click(),
  // Config tab (apps/web/src/features/configuration): every edit is saved and the card re-reads its source.
  setBestCaseMode: (auto) => {
    if (!auto) {
      const active = currentPlanner().conditions;
      for (const id of automaticCombatConditionIds) plannerState.combat.conditions[id] = active[id] !== false;
      // Keep the Life / Mana group choices automatic mode made (src/engine/planner.js exclusiveConditionGroups).
      for (const id of ["lowLifeAssumed", "lowManaAssumed"]) plannerState.combat.conditions[id] = active[id] === true;
      plannerState.combat.conditions.nearTarget = active.nearTarget !== false;
      // The Config tab's pinned choices (combat.bestCaseOverrides) become the manual switches they selected.
      plannerState.combat.conditions.blurRecentlyEnded = active.blurRecentlyEnded === true;
      plannerState.combat.bestCaseOverrides = Object.fromEntries(
        Object.entries(plannerState.combat.bestCaseOverrides || {}).filter(
          ([id]) => !exclusiveChoiceConditionIds.includes(id),
        ),
      );
    }
    // Back to automatic: drop the manual Distance choice so the Distance group compares again (a saved nearTarget applies
    // in both modes).
    else delete plannerState.combat.conditions.nearTarget;
    plannerState.combat.conditionMode = auto ? "auto" : "manual";
    persistPlannerState();
    renderConfiguration();
  },
  setCombatCondition: (id, on) => {
    // Own buffs built before the fight: stored in combat.bestCaseOverrides (src/engine/combat-condition-mode.js; 2026-10-14).
    if (id === "prebuiltSelfBuffs")
      plannerState.combat.bestCaseOverrides = {
        ...(plannerState.combat.bestCaseOverrides || {}),
        prebuiltSelfBuffs: on,
      };
    else plannerState.combat.conditions[id] = on;
    persistPlannerState();
    renderConfiguration();
  },
  // Best-case assumption switches (src/engine/planner.js bestCaseAssumptions): stored per build in combat.bestCaseOverrides.
  setBestCaseAssumption: (toggle, on) => {
    plannerState.combat.bestCaseOverrides = { ...(plannerState.combat.bestCaseOverrides || {}), [toggle]: on };
    persistPlannerState();
    renderConfiguration();
  },
  // "Reset to best case" turns every switch back on: the overrides are cleared, and so is a stored "off" for the same ids
  // in the conditions.
  resetBestCaseAssumptions: () => {
    for (const item of currentPlanner().bestCaseAssumptions || [])
      if (plannerState.combat.conditions[item.toggle] === false) delete plannerState.combat.conditions[item.toggle];
    plannerState.combat.bestCaseOverrides = {};
    persistPlannerState();
    renderConfiguration();
  },
  // A choice pins that option of an exclusive group (combat.bestCaseOverrides; src/engine/planner.js exclusiveChoicePins);
  // picking the best-case option clears the pin.
  pinExclusiveChoice: (groupName, index) => {
    const group = (currentPlanner().assumptions || []).find((item) => item.group === groupName);
    const option = group?.compared?.[index];
    if (!option || option.label === group.chosen) return;
    const overrides = { ...(plannerState.combat.bestCaseOverrides || {}) };
    for (const key of Object.keys(option.overrides || {})) {
      delete overrides[key];
      delete plannerState.combat.conditions[key];
    }
    if (option.label !== (group.best ?? group.chosen)) Object.assign(overrides, option.overrides);
    plannerState.combat.bestCaseOverrides = overrides;
    persistPlannerState();
    renderConfiguration();
  },
  setAimUptimeAuto: (auto) => {
    plannerState.combat.aimUptimePercent = aimUptimeAfterToggle(auto, currentPlanner().aim);
    persistPlannerState();
    renderConfiguration();
  },
  // Kept within what a stored build accepts (src/engine/state/state-validation.ts combatNumberLimits): a value out of range, or a
  // field the schema lacked, used to make every later save of the session throw.
  setCombatValue: (key, text) => {
    if (!Object.hasOwn(combatNumberLimits, key)) return;
    plannerState.combat[key] = clampCombatNumber(key, Number(text));
    persistPlannerState();
    renderConfiguration();
  },
  // Pactspirits section (apps/web/src/features/pacts).
  openPactspiritSelector: (slot) => {
    selectedPactspiritSlot = slot;
    pactspiritSelectorSession++;
    viewSourceChanged("pactspiritSelector");
    $("#pactspirit-selector").showModal();
    $("[data-pactspirit-search]").focus();
  },
  selectPactspirit: (name) => {
    plannerState.pacts.selectedSpirits = selectPactspirit(
      plannerState.pacts.selectedSpirits,
      selectedPactspiritSlot,
      name,
    );
    plannerState.pacts.activeSpirits = activeCapturedPactspirits(
      plannerState.pacts.selectedSpirits,
      selenaScorchingBeamPactsSs13.pactspirits.map((spirit) => spirit.name),
    );
    $("#pactspirit-selector").close();
    refreshPactCandidate();
  },
  removePactspirit: removeSelectedPactspirit,
  // A level change is saved without recalculating the page (as before); the section shows the new level.
  setPactspiritLevel: (name, level) => {
    plannerState.pacts.spiritLevels[name] = level;
    hidePlannerTooltip();
    persistPlannerState();
    renderPacts();
  },
  togglePactNode: (spiritName, nodeIndex) => {
    plannerState.pacts.nativeNodeQuantities = togglePactNodeChain(
      plannerState.pacts.nativeNodeQuantities,
      spiritName,
      nodeIndex,
      orderedPactspiritNodes(pactspiritTreesSs13[spiritName]).length,
    );
    refreshPactCandidate();
  },
  openKismetCrafter,
  clearKismetSlot: clearKismetNode,
  openFateSlotSelector,
  clearFateSlots,
  selectFateSlots,
  moveKismet,
  showToast: (text) => showToast(escapeHtml(text)),
  hideTooltip: hidePlannerTooltip,
  // Follower tab (apps/web/src/features/follower).
  openFollowerSelector: () => {
    followerSelectorSession++;
    viewSourceChanged("followerSelector");
    $("#follower-selector").showModal();
  },
  selectFollower: (followerId, rarityId) => {
    const next = pickFollower(plannerState, followerId, rarityId);
    $("#follower-selector").close();
    commitFollower(
      next,
      `${escapeHtml(followerById(next.followerId)?.displayName || "Follower")} · ${escapeHtml(followerRarityById(next.rarity)?.name || "")} selected`,
    );
  },
  openFollowerSkillSelector: (slot) => {
    hidePlannerTooltip();
    openFollowerSkillSelector(slot);
  },
  clearFollowerSkill: (slot) => {
    hidePlannerTooltip();
    commitFollower(setFollowerSkill(plannerState, slot, null), "Skill slot cleared");
  },
  // Skills section (apps/web/src/features/skills).
  setSkillBoardTab: (tab) => {
    activeSkillBoardTab = tab === "auras" ? "auras" : "skills";
    renderSkills();
  },
  openSkillSelector,
  chooseSkillSelectorEntry,
  confirmSkillSelector,
  clearSkillSelectorSlot,
  setSelectorLevel,
  stepSelectorLevel,
  setSpecialTier,
  setSpecialRoll,
  setSupportStars,
  setProgressionTier,
  setProgressionRoll,
  setAffixLineTier,
  setAffixRoll,
  setAffixChoice,
  removeSkill: removeBoardSkill,
  removeSupport: removeBoardSupport,
  moveSkill: moveBoardSkill,
  moveSupport: moveBoardSupport,
  resetSkills,
  // Divinity Slates board (apps/web/src/features/slates).
  selectSlate,
  clearSlateSelection,
  startSlateMove,
  placeSlateAtCell,
  transformSlate,
  wheelTransformSlate,
  removeSlate,
  rightClickRemoveSlate,
  dropSlate,
  slateDragCancelled: () => {
    renderSlates();
    showToast("Slate returned to its original position");
  },
  finishPendingSlate,
  editSlate,
  openSlateInventory: () => {
    renderSlateInventory();
    $("#slate-inventory").showModal();
  },
  // Gear section (apps/web/src/features/gear).
  openEquipmentSlot,
  unequipEquipmentSlot,
  equipInventoryItem: (id) => equipInventoryItem(inventoryItemById(id)),
  openInventoryItem: (id) => {
    const item = inventoryItemById(id);
    if (item) openInventoryItemDialog(item);
  },
  editInventoryItem: (id) => openInventoryItemEditor(inventoryItemById(id)),
  duplicateInventoryItem,
  resetEquipment,
  openEquipmentCrafter,
  dropGear,
  // Talent trees (apps/web/src/features/talents).
  openTalentTree,
  removeTalentTree,
  openTalentSlates,
  openCorePicker,
  selectCoreTalent,
  removeCoreTalent,
  clickTalentNode,
  rightClickTalentNode,
  resetTalentTree,
  reselectTalentTree,
  selectTalentTree,
  openPrismInventory,
  openPrismCrafter: () => openPrismCrafter(),
  editCraftedPrism,
  installCraftedPrism,
  deleteCraftedPrism,
  unequipPrism,
  cancelPrismPlacement,
  dropPrism,
  // Header build actions (apps/web/src/shell/SiteHeader.tsx and its dialogs).
  resetBuild,
  exportBuild,
  importBuild,
  // Import from game (apps/web/src/shell/dialogs/ImportGameLogDialog.tsx).
  openGameLogImport,
  chooseGameLogFile,
  showGameLogPicker: () => setGameLogView({ chooseOther: false, picker: true }),
  selectGameLogSnapshot,
  importGameLogBuild,
  closeGameLogImport: resetGameLogImport,
  // HERO tab (apps/web/src/features/hero).
  setHeroDetailTab: (tab) => {
    activeHeroDetailTab = tab;
    renderHeroTraitTree();
  },
  openHeroSelector,
  selectHero,
  openMemorySocket,
  removeMemory,
  pickHeroTrait,
  toggleTraitPathNode,
  moveTraitPick,
  openScentSlot,
  selectSageScent: (name) => setSageScent(name, `${escapeHtml(name)} selected`),
  clearSageScent: () => setSageScent("", "Scent slot cleared"),
  openCarinoAmmo,
  selectCarinoAmmo: (name) => {
    if (carinoProjectileSupportOptions().some((entry) => entry.name === name))
      setCarinoAmmo(name, `${escapeHtml(name)} installed`);
  },
  clearCarinoAmmo: () => setCarinoAmmo("", "Support slot cleared"),
  removeCarinoAmmo,
  openHeroTraitSupport,
  removeHeroTraitSupport,
  // Stats view (apps/web/src/features/stats).
  setStatsPanel: (panel) => {
    activeStatsPanel = panel;
    saveWorkspaceLocation();
    viewSourceChanged("stats");
  },
  selectStatSheetSkill: (key) => {
    selectedStatSheetSkill = key;
    saveWorkspaceLocation();
    renderCharacter();
  },
  reportCalculation,
  toggleRecountSource: (key) => {
    setRecountSourceExcluded(key);
    viewSourceChanged("stats");
  },
  showAllRecountSources: () => {
    setRecountSourceExcluded(null);
    viewSourceChanged("stats");
  },
  selectDamagePath: (key) => {
    selectedDamagePath = DAMAGE_PATH_KEY.test(key) ? key : "hit";
    saveWorkspaceLocation();
    viewSourceChanged("stats");
  },
  copyOpenQuestions,
  submitOpenQuestion,
});
// The FOLLOWER tab's data (src/app/follower-panel.js).
provideViewSource("follower", () => followerPanelView(plannerState));
// The Pactspirits section's data (src/app/bridge/pacts-view-model.ts).
provideViewSource("pacts", () => pactsView(plannerState.pacts));
// The Skills section's data (src/app/bridge/skills-view-model.ts) for the open board tab.
// The Divinity Slates board's data (src/app/bridge/slates-view-model.ts).
provideViewSource("slates", () =>
  slatesView({
    slates: slatesForBoard(),
    placements: slatePlacements,
    parked: parkedSlates,
    equipped: equippedSlateIds,
    ui: {
      selectedId: selectedSlateId,
      toolsPosition: slateToolsPosition,
      editMode: slateEditMode,
      pendingId: slatePendingDrop?.id ?? null,
    },
  }),
);
provideViewSource("skills", () => skillsView(currentPlanner(), plannerState.skills, activeSkillBoardTab));
// The Gear section's data (src/app/bridge/equipment-view-model.ts).
provideViewSource("equipment", equipmentSource);
// The talent trees' data (src/app/bridge/talents-view-model.ts).
provideViewSource("talents", talentsSource);
// The HERO tab's data (src/app/bridge/hero-traits-view-model.ts).
provideViewSource("heroTraits", () => heroTraitsView(plannerState.hero, activeHeroDetailTab));
// The Pactspirit selector's data (src/app/bridge/pacts-view-model.ts).
provideViewSource("pactspiritSelector", () => ({ session: pactspiritSelectorSession, ...pactspiritSelectorView() }));
// The follower selector's data (apps/web/src/shell/dialogs/FollowerSelectorDialog.tsx).
provideViewSource("followerSelector", () => ({
  session: followerSelectorSession,
  cards: followerPickerView(plannerState),
}));
// The HERO tab's scent and Special Ammo selectors (src/app/bridge/hero-dialogs-view-model.ts).
provideViewSource("sageScentSelector", () => ({
  session: sageScentSelectorSession,
  ...sageScentSelectorView(sageScentSelectorKind),
}));
provideViewSource("carinoAmmoSelector", () => ({
  session: carinoAmmoSelectorSession,
  ...carinoAmmoSelectorView(
    activeCarinoAmmoSlot,
    carinoProjectileSupportOptions(),
    plannerState.hero.carinoSpecialAmmoSupports || [],
    plannerState.hero.selectedTraits["carino-ranger-of-glory:level75"] === "Well Prepared",
  ),
}));
// The skill selector's title and list.
provideViewSource("skillSelector", skillSelectorSource);
// The prism inventory.
provideViewSource("prismInventory", prismInventorySource);
// The Import from game dialog.
provideViewSource("gameLogImport", gameLogImportSource);
// The talent tree, core talent and Fate slot pickers.
provideViewSource("talentPicker", talentPickerSource);
provideViewSource("corePicker", corePickerSource);
provideViewSource("fateSlotSelector", () => ({
  spirit: fateSlotSpirit,
  selected: plannerState.pacts.fateUnlocks?.[fateSlotSpirit] || "",
  choices: fateSlotChoices.map((choice) => ({ id: choice.id, label: choice.label })),
}));
// The hero selector's data (apps/web/src/shell/dialogs/HeroSelectorDialog.tsx).
provideViewSource("heroSelector", () => ({
  session: heroSelectorSession,
  selectedHeroId: plannerState.hero.selectedHeroId,
}));
// The Stats view's data (src/app/bridge/stats-view-model.ts).
provideViewSource("stats", statsSource);
// The Config tab's data (src/app/bridge/view-sources.ts). Manual mode also needs the same build in automatic mode (which conditions
// have a source); it is calculated only then.
provideViewSource("configuration", () => {
  const planner = currentPlanner();
  return {
    planner,
    combat: structuredClone(plannerState.combat),
    probe: plannerState.combat.conditionMode === "manual" ? conditionSourceProbe() : null,
    activeNames: planner.activation.activeNames,
  };
});

document.addEventListener("change", (event) => {
  // Follower skill tier and support affixes (src/app/follower-panel.js followerSkillEditorMarkup, 2026-10-19 user request): the picker's
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
  if (event.target.matches("[data-affix-roll-number]")) {
    const number = event.target,
      range = number.closest(".affix-roll-inputs")?.querySelector('input[type="range"]');
    if (range) {
      const typed = Number(number.value),
        fallback = Number(range.value),
        value = Math.min(Number(number.max), Math.max(Number(number.min), Number.isFinite(typed) ? typed : fallback));
      number.value = String(value);
      range.value = String(value);
      range.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }
  if (event.target.checkValidity && !event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
});

// A build that cannot be calculated must not stop the planner from loading: show
// the error and offer the previous saved version or safe mode (recovery-core.js).
function showCalculationFailure(error) {
  console.error(error);
  document.querySelector(".calculation-failure")?.remove();
  const message = escapeHtml(error?.message || String(error));
  document
    .querySelector("main")
    ?.insertAdjacentHTML(
      "afterbegin",
      `<div class="notice safe-mode-banner calculation-failure" role="alert"><span>This build couldn't be calculated: ${message}</span><span class="library-notice-actions"><button class="button" type="button" data-calculation-undo>Undo last change</button><button class="button button-secondary" type="button" data-calculation-safe-mode>Open safe mode</button></span></div>`,
    );
  const notice = document.querySelector(".calculation-failure");
  notice?.querySelector("[data-calculation-undo]")?.addEventListener("click", () => {
    let restored;
    try {
      const library = loadBuildLibrary(),
        active = library.builds.find((build) => build.id === library.activeBuildId);
      if (!active?.revisions?.length) {
        showToast("No earlier version of this build is saved");
        return;
      }
      restored = restoreLatestRevision();
    } catch (failure) {
      showToast(escapeHtml(failure?.message || "The earlier version could not be restored"));
      return;
    }
    applyPlannerState(restored);
    pendingCandidateRender = false;
    renderCandidateViews();
    if (!document.querySelector(".calculation-failure")) showToast("Last change undone");
  });
  notice?.querySelector("[data-calculation-safe-mode]")?.addEventListener("click", () => {
    setSafeMode(sessionStorage, true);
    location.reload();
  });
}
function clearCalculationFailure() {
  document.querySelector(".calculation-failure")?.remove();
}
// Only a full successful renderCandidateViews() clears the notice.
function runGuardedRender(renderStep) {
  try {
    renderStep();
    return true;
  } catch (error) {
    showCalculationFailure(error);
    return false;
  }
}

function renderCandidateViews() {
  if (calculationsPaused) {
    pendingCandidateRender = false;
    updateStorageStatus();
    return;
  }
  pendingCandidateRender = false;
  try {
    renderPassPlanner = cachedPlanner(capturePlannerState());
    if (focusedViews.has(activeWorkspaceView)) {
      if (activeWorkspaceView === "character") renderCharacter();
      if (activeWorkspaceView === "configuration") renderConfiguration();
      if (activeWorkspaceView === "builds") updateStorageStatus();
    } else {
      renderEquipment();
      renderSkills();
      renderSlates();
      renderTalents();
      renderPacts();
    }
    clearCalculationFailure();
  } catch (error) {
    showCalculationFailure(error);
  } finally {
    renderPassPlanner = null;
  }
}

const plannerSectionViews = new Set(["talents", "skills", "equipment", "pacts"]);
const focusedViews = new Set(["builds", "character", "configuration"]);
function activateWorkspaceView(viewName, { scroll = true, remember = true } = {}) {
  if (calculationsPaused) viewName = "builds";
  if (!loadBuildLibrary().builds.length) viewName = "builds";
  activeWorkspaceView = viewName;
  const focused = focusedViews.has(viewName);
  document.body.classList.toggle("unified-planner", !focused);
  document.body.classList.toggle("builds-workspace", viewName === "builds");
  document.body.classList.toggle("stats-workspace", viewName === "character");
  document.body.classList.toggle("config-workspace", viewName === "configuration");
  document.querySelectorAll(".app-view").forEach((view) => {
    const name = view.id.replace("-view", "");
    view.hidden = focused ? name !== viewName : !plannerSectionViews.has(name);
  });
  document
    .querySelectorAll(".view-tab")
    .forEach((button) => button.classList.toggle("active", button.dataset.view === viewName));
  if (focused) {
    if (viewName === "builds") updateStorageStatus();
    if (viewName === "character") renderCharacter();
    if (viewName === "configuration") renderConfiguration();
  } else {
    renderTalents();
    renderSkills();
    renderEquipment();
    renderPacts();
    renderSlates();
    if (scroll)
      requestAnimationFrame(() =>
        document.querySelector("#" + viewName + "-view")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    else window.scrollTo({ top: 0, behavior: "auto" });
  }
  if (remember) saveWorkspaceLocation();
}

// The header's Reset Build (confirmed in apps/web/src/shell/dialogs/ResetBuildConfirmDialog.tsx): the open build empties.
function resetBuild() {
  const empty = emptyPlannerState();
  applyPlannerState(empty);
  persistPlannerState();
  renderCandidateViews();
  showToast("Build reset to empty");
}
// The header's Export: the open build's code to the clipboard.
async function exportBuild() {
  persistPlannerState();
  try {
    await navigator.clipboard.writeText(encodePlannerState(plannerState));
    showToast("Build code copied to clipboard");
  } catch {
    showToast("Clipboard access was unavailable");
  }
}
// Import accepts the Export code and the compact "TLB3:" and "TLB2:" codes (src/engine/state/build-code-compact.js), which expand to the former.
async function importBuildText(text) {
  const code = await expandBuildCode(text);
  persistPlannerState();
  const imported = importBuildCode(code);
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  $("#import-build-dialog").close();
  activateWorkspaceView("builds", { scroll: false });
  showToast(`${escapeHtml(imported.name)} imported and active`);
}
// The Import dialog's Import Code (apps/web/src/shell/dialogs/ImportBuildDialog.tsx).
function importBuild(text) {
  importBuildText(text).catch(() => showToast("That build code could not be read"));
}
// Import from game (apps/web/src/shell/dialogs/ImportGameLogDialog.tsx shows the "gameLogImport" source). On open the
// planner asks its local reader for UE_game.log (the pnpm dev server /api/game-log/snapshots, or the desktop bridge);
// both return only sanitised build dumps (src/game-log/game-log-local.js). Without it, or when the user asks, the picked
// log is read in the page. Everything is dropped with the dialog, and an import always adds a new library entry.
let gameLogSources = new Map(),
  gameLogRows = [],
  gameLogImport = null,
  gameLogReadToken = 0,
  gameLogSession = 0;
const CLOSED_GAME_LOG_VIEW = {
  found: null,
  chooseOther: false,
  picker: false,
  reason: "",
  status: null,
  selectedId: null,
};
let gameLogView = CLOSED_GAME_LOG_VIEW;
const gameLogLocalServer = () =>
  /^https?:$/.test(location.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const autoGameLogUnavailable = () =>
  gameLogLocalServer() || typeof window.tliDesktop?.gameLogSnapshots === "function"
    ? "Automatic lookup needs the planner's local dev server (pnpm dev) or the desktop app."
    : "Choose your UE_game.log.";
function gameLogImportSource() {
  return {
    session: gameLogSession,
    ...displayTexts({
      ...gameLogView,
      logins: gameLogLogins(gameLogRows),
      summary: gameLogImport ? gameLogSummary(gameLogImport.report) : null,
    }),
  };
}
function setGameLogView(changes) {
  gameLogView = { ...gameLogView, ...changes };
  viewSourceChanged("gameLogImport");
}
function clearGameLogResults() {
  gameLogSources = new Map();
  gameLogRows = [];
  gameLogImport = null;
  gameLogView = { ...gameLogView, selectedId: null };
}
function resetGameLogImport() {
  gameLogReadToken += 1;
  clearGameLogResults();
  gameLogView = CLOSED_GAME_LOG_VIEW;
  viewSourceChanged("gameLogImport");
}
async function requestGameLogSnapshots() {
  if (typeof window.tliDesktop?.gameLogSnapshots === "function") return window.tliDesktop.gameLogSnapshots();
  // Only the local dev server (pnpm dev) has the reader; a static host (GitHub Pages) goes straight to the picker.
  if (!gameLogLocalServer()) return null;
  const response = await fetch("api/game-log/snapshots", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok || !/json/.test(response.headers.get("content-type") || "")) return null;
  return response.json();
}
async function findGameLog() {
  const token = gameLogReadToken;
  setGameLogView({ status: { text: "Looking for UE_game.log…" } });
  let result = null;
  try {
    result = await requestGameLogSnapshots();
  } catch {
    result = null;
  }
  if (token !== gameLogReadToken) return;
  const auto = result?.found && Array.isArray(result.files) ? gameLogAutoSnapshots(result.files) : null;
  if (!auto?.rows.length) {
    setGameLogView({
      status: null,
      picker: true,
      reason: result && result.found === false && result.reason ? result.reason : autoGameLogUnavailable(),
    });
    return;
  }
  gameLogSources = auto.sources;
  gameLogRows = auto.rows;
  setGameLogView({ status: null, found: gameLogFound(result.files[0]), chooseOther: true });
  await selectGameLogSnapshot(gameLogRows[0].id);
}
async function selectGameLogSnapshot(id) {
  const source = gameLogSources.get(id),
    token = gameLogReadToken;
  if (!source) return;
  setGameLogView({ selectedId: id });
  try {
    const idMap = await loadGameIdMap();
    if (token !== gameLogReadToken) return;
    gameLogImport = importSnapshot(source.scan, source.dumpId, idMap);
    setGameLogView({ status: null });
  } catch {
    if (token !== gameLogReadToken) return;
    gameLogImport = null;
    setGameLogView({ status: { text: "This snapshot could not be turned into a build." } });
  }
}
function openGameLogImport() {
  resetGameLogImport();
  gameLogSession += 1;
  $("#import-game-log-dialog").showModal();
  findGameLog();
}
async function chooseGameLogFile(file) {
  const token = ++gameLogReadToken;
  clearGameLogResults();
  if (!file) {
    setGameLogView({ status: null });
    return;
  }
  setGameLogView({ found: null, reason: "", status: { text: "Reading the log…" } });
  // Read in this browser only (readGameLogFile never throws; its status says which problem it was); nothing is
  // uploaded or stored. A failure after a good read (id map, listing) is the planner's, not the file's.
  const idMapPromise = loadGameIdMap();
  idMapPromise.catch(() => {});
  const read = await readGameLogFile(file);
  if (token !== gameLogReadToken) return;
  if (read.status !== "ok") {
    setGameLogView({ status: gameLogFileStatus(read, file.name) });
    return;
  }
  try {
    const idMap = await idMapPromise,
      scan = read.scan;
    if (token !== gameLogReadToken) return;
    gameLogSources = new Map(scan.dumps.map((dump) => [dump.id, { scan, dumpId: dump.id }]));
    gameLogRows = listSnapshots(scan, idMap).sort((a, b) => (a.stamp < b.stamp ? 1 : -1));
    setGameLogView({ status: gameLogFileStatus(read, file.name) });
  } catch (error) {
    if (token === gameLogReadToken) {
      clearGameLogResults();
      setGameLogView({ status: gameLogListFailedStatus(error, file.name) });
    }
  }
}
function importGameLogBuild() {
  if (!gameLogImport) return;
  persistPlannerState();
  const { state, report } = gameLogImport;
  const imported = createBuild({
    name: gameLogBuildName(heroById(state.hero.selectedHeroId)?.name, report.source?.stamp),
    notes: importReportText(report),
    state,
    activate: true,
  });
  applyPlannerState(loadPlannerState());
  renderCandidateViews();
  $("#import-game-log-dialog").close();
  activateWorkspaceView("builds", { scroll: false });
  showToast(`${imported.name} imported and active`);
}
let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2200);
}

// The first calculation runs here, where a build that cannot be calculated shows the recovery banner instead of stopping
// the planner from loading.
if (!calculationsPaused) runGuardedRender(currentPlanner);

function currentTalentPanel() {
  return allTalentPanelsSs13.find((panel) => panel.name === activeTalentPanel);
}

function setTalentSlateMode(enabled) {
  talentSlateMode = enabled;
  const talentView = $("#talents-view"),
    talentLayout = talentView.querySelector(":scope > .talent-layout");
  const slateLayout = document.querySelector(".slate-layout");
  const treePanel = talentLayout.querySelector(".talent-tree-panel");
  if (enabled && !talentView.classList.contains("showing-slates")) {
    const height = Math.max(650, Math.ceil(talentLayout.getBoundingClientRect().height));
    talentLayout.style.setProperty("--slate-panel-height", `${height}px`);
  }
  talentView.classList.toggle("showing-slates", enabled);
  if (enabled) {
    treePanel.hidden = true;
    if (slateLayout.parentElement !== talentLayout) talentLayout.append(slateLayout);
  } else {
    talentLayout.style.removeProperty("--slate-panel-height");
    treePanel.hidden = false;
    const slateView = $("#slates-view");
    if (slateLayout.parentElement !== slateView) slateView.append(slateLayout);
  }
}

function activeTalentLayouts() {
  const layouts = { ...professionTreeLayoutsAllSs13 };
  for (const [name, id] of Object.entries(plannerState.talents.installedPrisms || {})) {
    const graph = layouts[name],
      coordinate = plannerState.talents.installedPrismNodes?.[name];
    const prism = (plannerState.talents.prismInventory || []).find((item) => item.id === id);
    if (!graph || !coordinate || prism?.type !== "inverse") continue;
    layouts[name] = { ...graph, nodes: inverseImageTalentNodes(graph.nodes, prism, coordinate) };
  }
  return layouts;
}

function talentDisplayNodes(panel = currentTalentPanel()) {
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
  );
  return talentNodesOnBoard(
    panel,
    professionTreeLayoutsAllSs13[panel.name],
    prism,
    plannerState.talents.installedPrismNodes?.[panel.name],
  );
}

// The talent trees are React (apps/web/src/features/talents): they re-read their source. The hero panel beside them and
// the tree picker dialog are still drawn here.
function renderTalents() {
  renderHeroTraitTree();
  renderHeroPanel();
  viewSourceChanged("talentPicker");
  viewSourceChanged("talents");
  setTalentSlateMode(talentSlateMode);
}
// The talent trees' data (src/app/bridge/talents-view-model.ts).
function talentsSource() {
  return talentsView({
    panel: currentTalentPanel(),
    baseLayouts: professionTreeLayoutsAllSs13,
    layouts: activeTalentLayouts(),
    ranks: Object.fromEntries(talentRanks),
    talents: plannerState.talents,
    activeSlot: activeTalentSlot,
    slateMode: talentSlateMode,
    pendingPrism: pendingPrismPlacement,
  });
}
// The talent tree picker's data (apps/web/src/shell/dialogs/TalentPanelPickerDialog.tsx): the trees the open slot takes.
function talentPickerSource() {
  const selectedTrees = plannerState.talents.selectedTrees;
  const pointTotals = talentPointTotals(activeTalentLayouts(), Object.fromEntries(talentRanks));
  return {
    title:
      activeTalentSlot === 0
        ? "Select a God tree"
        : activeTalentSlot === 1
          ? `Select a ${selectedTrees[0] || "God"} class tree`
          : `Select talent tree ${activeTalentSlot + 1}`,
    god: activeTalentSlot === 0,
    cards: talentOptionsForSlot(activeTalentSlot, selectedTrees).map((name) => ({
      name,
      familyClass: talentFamilyClass(name),
      art: tliArt.talentPanels[name] || allProfessionTalentCatalogueSs13[name].emblem,
      selected: selectedTrees[activeTalentSlot] === name,
      points: pointTotals.panels[name],
    })),
  };
}
// The tree picker's pick: the open slot takes that tree (a new God tree empties a class tree it does not lead to).
function selectTalentTree(name) {
  const previous = plannerState.talents.selectedTrees[activeTalentSlot];
  if (previous !== name) {
    clearTalentTreeState(previous);
    delete plannerState.talents.installedPrisms[previous];
    delete plannerState.talents.installedPrismNodes[previous];
  }
  plannerState.talents.selectedTrees[activeTalentSlot] = name;
  if (activeTalentSlot === 0 && !talentFamiliesSs13[name].includes(plannerState.talents.selectedTrees[1])) {
    const removed = plannerState.talents.selectedTrees[1];
    clearTalentTreeState(removed);
    delete plannerState.talents.installedPrisms[removed];
    delete plannerState.talents.installedPrismNodes[removed];
    plannerState.talents.selectedTrees[1] = "";
  }
  activeWorkspaceView = "talents";
  activeTalentPanel = name;
  persistPlannerState();
  $("#talent-panel-picker").close();
  renderTalents();
  saveWorkspaceLocation();
}

function prismAffixSections(item, showCoverage = false) {
  const badge = (kind) =>
    showCoverage ? coverageBadge(prismAffixCoverage(item, kind), prismAffixCoverageReason(item, kind)) : "";
  if (item.type === "inverse")
    return `<section class="prism-affix-section base"><h4>Prism Exclusive Effect</h4><p>${escapeHtml(prismBaseEffect(item.type, item.base))} ${badge("base")}</p></section><section class="prism-affix-section inverse-fixed"><h4>Fixed Affixes</h4>${Object.entries(
      inverseImageRolls,
    )
      .map(([kind, range]) => {
        const value = inverseImageRoll(item, kind);
        return `<p>${escapeHtml(range.label)}: <strong class="${inverseRollSign(value)}">${value}</strong> ${badge(kind)}</p>`;
      })
      .join("")}</section>`;
  return `<section class="prism-affix-section base"><h4>Base Affix</h4><p>${escapeHtml(prismBaseEffect(item.type, item.base, item.legendaryAffix))} ${badge("base")}</p></section>${[
    ["radiusAffix", "Radius Affix"],
    ["rareAffix", "Rare Affix"],
    ["legendaryAffix", "Legendary Affix"],
  ]
    .filter(([key]) => item[key] && (key !== "legendaryAffix" || prismSupportsLegendaryAffix(item)))
    .map(
      ([key, label]) =>
        `<section class="prism-affix-section ${key}"><h4>${label}</h4><p>${escapeHtml(item[key])} ${badge(key)}</p></section>`,
    )
    .join("")}`;
}
function prismTooltipHtml(item) {
  const icon = prismIcon(item);
  return `<div class="prism-tooltip-head">${icon ? `<img src="${icon}" alt="">` : ""}<strong>${escapeHtml(prismName(item))}</strong><small>${item.type === "inverse" ? "Inverse Image" : "Ethereal Prism"}</small></div><div class="prism-tooltip-body"><p class="prism-effect-area">Effect Area: <strong>${prismArea(item)}</strong> ${coverageBadge("Planner only")}</p>${prismAffixSections(item, true)}</div><footer>Click to change · Right-click to remove</footer>`;
}
// The prism inventory's data (apps/web/src/shell/dialogs/PrismInventoryDialog.tsx) for the tree slot it is open for.
function prismInventorySource() {
  const panel = plannerState.talents.selectedTrees[activePrismTreeSlot],
    installed = plannerState.talents.installedPrisms || {};
  return displayTexts({
    slot: activePrismTreeSlot + 1,
    items: (plannerState.talents.prismInventory || []).map((item) => {
      const usedAt = Object.entries(installed).find(([, id]) => id === item.id)?.[0] || "";
      return {
        id: item.id,
        name: prismName(item),
        icon: prismIcon(item) || "",
        detail: `${item.type === "inverse" ? "Inverse Image" : "Ethereal Prism"} · ${prismArea(item)} area${usedAt ? ` · Installed in ${usedAt}` : ""}`,
        equipped: usedAt === panel,
        installedElsewhere: Boolean(usedAt) && usedAt !== panel,
      };
    }),
    installedHere: Boolean(installed[panel]),
  });
}
// Prism inventory commands (apps/web/src/shell/dialogs/PrismInventoryDialog.tsx).
function editCraftedPrism(id) {
  const item = plannerState.talents.prismInventory.find((entry) => entry.id === id);
  if (item) openPrismCrafter(item);
}
// Deleting a prism takes it off every tree it is installed in.
function deleteCraftedPrism(id) {
  for (const [name, itemId] of Object.entries(plannerState.talents.installedPrisms || {}))
    if (itemId === id) {
      const item = plannerState.talents.prismInventory.find((entry) => entry.id === id);
      clearInverseReflectedRanks(name, item, plannerState.talents.installedPrismNodes[name]);
      delete plannerState.talents.installedPrisms[name];
      delete plannerState.talents.installedPrismNodes[name];
      if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(name);
    }
  plannerState.talents.prismInventory = plannerState.talents.prismInventory.filter((item) => item.id !== id);
  persistPlannerState();
  renderCandidateViews();
  viewSourceChanged("prismInventory");
}
// Unequip current Prism: the tree the inventory is open for loses its prism.
function unequipPrism() {
  const name = plannerState.talents.selectedTrees[activePrismTreeSlot],
    item = plannerState.talents.prismInventory.find((entry) => entry.id === plannerState.talents.installedPrisms[name]);
  clearInverseReflectedRanks(name, item, plannerState.talents.installedPrismNodes[name]);
  delete plannerState.talents.installedPrisms[name];
  delete plannerState.talents.installedPrismNodes[name];
  if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(name);
  persistPlannerState();
  renderCandidateViews();
  viewSourceChanged("prismInventory");
}
function openPrismInventory() {
  activePrismTreeSlot = plannerState.talents.selectedTrees.indexOf(activeTalentPanel);
  if (activePrismTreeSlot <= 0) return;
  viewSourceChanged("prismInventory");
  $("#prism-inventory-dialog").showModal();
}
function prismAffixSelect(kind, label) {
  const value = prismDraft[`${kind}Affix`] || "",
    options =
      kind === "rare"
        ? prismRareAffixesForBase(prismDraft.base)
        : kind === "legendary"
          ? prismLegendaryAffixesForBase(prismDraft.base)
          : prismAffixes[kind];
  const optionLabel = (affix) =>
    kind === "legendary" && affix.includes("Gains a stack of Fortitude")
      ? `Fortitude — ${affix.match(/Owns (\d+) additional/)?.[1] || "?"} additional stack(s) — ${affix}`
      : affix;
  return `<label class="prism-affix-select"><span><b class="${kind}">${label}</b><small>Only ${label} mods</small></span><select data-prism-affix="${kind}" aria-label="${label} Prism affix"${fullTextTitle(options.includes(value) ? optionLabel(value) : "")}><option value="">-- Select ${label} Slot --</option>${options.map((affix) => `<option value="${escapeHtml(affix)}" ${affix === value ? "selected" : ""}${fullTextTitle(optionLabel(affix))}>${escapeHtml(optionLabel(affix))}</option>`).join("")}</select></label>`;
}
function inverseRollSign(value) {
  return value < 0 ? "negative" : value > 0 ? "positive" : "zero";
}
function inverseRollStyle(range, value) {
  const width = range.max - range.min;
  const zero = (100 * (0 - range.min)) / width;
  const current = (100 * (value - range.min)) / width;
  return `--inverse-start:${Math.min(zero, current)}%;--inverse-end:${Math.max(zero, current)}%`;
}
function inverseImageControl(kind, range) {
  const value = inverseImageRoll(prismDraft, kind);
  return `<div class="inverse-roll ${inverseRollSign(value)}" style="${inverseRollStyle(range, value)}"><label for="inverse-${kind}">${escapeHtml(range.label)}</label><input id="inverse-${kind}" type="number" min="${range.min}" max="${range.max}" step="1" value="${value}" data-inverse-roll="${kind}" data-inverse-input aria-label="${escapeHtml(range.label)}"><input type="range" min="${range.min}" max="${range.max}" step="1" value="${value}" data-inverse-roll="${kind}" data-inverse-slider aria-label="${escapeHtml(range.label)} slider"><small><span>${range.min}</span><span>${range.max}</span></small></div>`;
}
function renderPrismCrafterPreview() {
  const draft = prismDraft,
    name = draft.base ? prismName(draft) : "",
    icon = prismIcon(draft);
  $("#prism-crafter-preview").innerHTML = draft.base
    ? `<div class="prism-preview-card ${draft.type === "inverse" ? "inverse-preview" : ""}"><span class="prism-preview-icon">${icon ? `<img src="${icon}" alt="">` : "✦"}</span><h3>${escapeHtml(name)}</h3><small>${draft.type === "inverse" ? "INVERSE IMAGE" : "ETHEREAL PRISM"}</small><div><p class="prism-effect-area">Effect Area: <strong>${prismArea(draft)}</strong></p>${prismAffixSections(draft)}</div></div>`
    : '<div class="prism-preview-empty">Select options to preview item</div>';
}
function renderPrismCrafter() {
  const draft = prismDraft,
    hasLegendary = prismSupportsLegendaryAffix(draft),
    affixes = [draft.radiusAffix, draft.rareAffix, hasLegendary && draft.legendaryAffix].filter(Boolean);
  $("#prism-crafter-title").textContent =
    `${prismEditingId ? "Edit" : "Craft"} ${draft.type === "inverse" ? "Inverse Image" : "Prism"}`;
  const tabs = `<div class="prism-type-tabs"><button type="button" data-prism-type="ethereal" class="${draft.type === "ethereal" ? "active" : ""}" ${prismEditingId ? "disabled" : ""}>Ethereal Prism</button><button type="button" data-prism-type="inverse" class="${draft.type === "inverse" ? "active" : ""}" ${prismEditingId ? "disabled" : ""}>Inverse Image</button></div>`;
  if (draft.type === "inverse") {
    $("#prism-crafter-form").innerHTML =
      tabs +
      `<div class="inverse-image-heading"><img src="${prismIcon(draft)}" alt=""><div><strong>Inverse Image</strong><small>Ultimate</small></div></div><p class="inverse-image-description">${escapeHtml(prismBaseEffect(draft.type, draft.base))}</p><p class="inverse-radius">Radius: <strong>3x3</strong></p><h3>Mod Values</h3><div class="inverse-rolls">${Object.entries(
        inverseImageRolls,
      )
        .map(([kind, range]) => inverseImageControl(kind, range))
        .join("")}</div>`;
  } else {
    $("#prism-crafter-form").innerHTML =
      tabs +
      `<label class="prism-base-field">Base Item *<select data-prism-base aria-label="Base Prism"${fullTextTitle(draft.base ? `Ethereal Prism: ${draft.base}` : "")}><option value="">Select Base Prism</option>${etherealPrismBases.map((base) => `<option value="${escapeHtml(base)}" ${base === draft.base ? "selected" : ""}${fullTextTitle(`Ethereal Prism: ${base}`)}>Ethereal Prism: ${escapeHtml(base)}</option>`).join("")}</select></label>${draft.base ? `<div class="prism-fixed"><label>${prismReplacesCore(draft) ? "Core Talent" : "Prism Effect"} *<input value="${escapeHtml(draft.base)}" readonly></label><small>${prismReplacesCore(draft) ? "This prism replaces the panel core talent" : "This prism does not replace the panel core talent"}</small><p>${escapeHtml(prismBaseEffect(draft.type, draft.base, draft.legendaryAffix))}</p></div><h3>Random Affixes (${affixes.length}/${hasLegendary ? 3 : 2})</h3>${prismAffixSelect("radius", "Radius")}${prismAffixSelect("rare", "Rare")}${hasLegendary ? prismAffixSelect("legendary", "Legendary") : ""}` : ""}`;
  }
  renderPrismCrafterPreview();
  $("[data-confirm-prism-craft]").disabled = !draft.base;
  $("[data-confirm-prism-craft]").textContent = prismEditingId ? "Save Changes" : "Craft";
}
function openPrismCrafter(item = null) {
  if ($("#prism-inventory-dialog").open) $("#prism-inventory-dialog").close();
  prismEditingId = item?.id || null;
  prismDraft = item
    ? { ...item, ...(item.inverseRolls ? { inverseRolls: { ...item.inverseRolls } } : {}) }
    : { type: "ethereal", base: "", radiusAffix: "", rareAffix: "", legendaryAffix: "" };
  renderPrismCrafter();
  $("#prism-crafter-dialog").showModal();
}
function clearInverseReflectedRanks(panel, item, coordinate) {
  for (const target of inverseImageReflectionMap(
    professionTreeLayoutsAllSs13[panel]?.nodes || [],
    item,
    coordinate,
  ).keys())
    talentRanks.set(`${panel}:${target}`, 0);
}
function reconcileTalentRanksAfterPrismChange(panel) {
  const layouts = activeTalentLayouts(),
    graph = layouts[panel];
  if (!graph) return;
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel],
  );
  const prismCoordinate = plannerState.talents.installedPrismNodes?.[panel];
  const result = pruneInvalidTalentRanks({
    panel,
    graph,
    layouts,
    ranks: Object.fromEntries(talentRanks),
    prismCoordinate,
    prerequisiteFreeCoordinates: inverseImageReflectedCoordinates(prism, prismCoordinate),
  });
  for (const key of result.removed) talentRanks.set(key, 0);
}
function installCraftedPrism(id) {
  const item = (plannerState.talents.prismInventory || []).find((entry) => entry.id === id),
    panel = plannerState.talents.selectedTrees[activePrismTreeSlot];
  if (!item || !panel) return;
  const other = Object.entries(plannerState.talents.installedPrisms || {}).find(
    ([name, installedId]) =>
      name !== panel &&
      (plannerState.talents.prismInventory || []).find((entry) => entry.id === installedId)?.type === item.type,
  );
  if (other) {
    showToast(`${item.type === "inverse" ? "Inverse Image" : "Ethereal Prism"} is already installed in ${other[0]}`);
    return;
  }
  pendingPrismPlacement = { id, panel };
  if ($("#prism-inventory-dialog").open) $("#prism-inventory-dialog").close();
  renderTalents();
}
function placeCraftedPrism(coordinate) {
  if (!pendingPrismPlacement) return;
  const { id, panel } = pendingPrismPlacement,
    item = (plannerState.talents.prismInventory || []).find((entry) => entry.id === id);
  if (!item || activeTalentPanel !== panel) return;
  if (!professionTreeLayoutsAllSs13[panel]?.nodes.some((node) => node.coordinate.join(",") === coordinate)) return;
  const previous = (plannerState.talents.prismInventory || []).find(
    (entry) => entry.id === plannerState.talents.installedPrisms?.[panel],
  );
  clearInverseReflectedRanks(panel, previous, plannerState.talents.installedPrismNodes?.[panel]);
  clearInverseReflectedRanks(panel, item, coordinate);
  plannerState.talents.installedPrisms = { ...(plannerState.talents.installedPrisms || {}), [panel]: id };
  plannerState.talents.installedPrismNodes = {
    ...(plannerState.talents.installedPrismNodes || {}),
    [panel]: coordinate,
  };
  talentRanks.set(`${panel}:${coordinate}`, 0);
  if (previous?.type === "inverse" || item.type === "inverse") reconcileTalentRanksAfterPrismChange(panel);
  pendingPrismPlacement = null;
  persistPlannerState();
  renderCandidateViews();
  showToast(`${prismName(item)} installed on node ${coordinate}`);
}

document.addEventListener("change", (event) => {
  if (!prismDraft) return;
  if (event.target.matches("[data-prism-base]")) {
    prismDraft.base = event.target.value;
    if (!prismRareAffixesForBase(prismDraft.base).includes(prismDraft.rareAffix)) prismDraft.rareAffix = "";
    if (!prismLegendaryAffixesForBase(prismDraft.base).includes(prismDraft.legendaryAffix))
      prismDraft.legendaryAffix = "";
    renderPrismCrafter();
  }
  if (event.target.matches("[data-prism-affix]")) {
    prismDraft[`${event.target.dataset.prismAffix}Affix`] = event.target.value;
    renderPrismCrafter();
  }
  if (event.target.matches("[data-inverse-roll]")) {
    const kind = event.target.dataset.inverseRoll;
    event.target.value = inverseImageRoll(prismDraft, kind);
  }
});
document.addEventListener("input", (event) => {
  if (!prismDraft || prismDraft.type !== "inverse" || !event.target.matches("[data-inverse-roll]")) return;
  const kind = event.target.dataset.inverseRoll,
    raw = event.target.value;
  if (raw === "" || !Number.isFinite(Number(raw))) return;
  const range = inverseImageRolls[kind],
    value = Math.max(range.min, Math.min(range.max, Math.round(Number(raw))));
  prismDraft.inverseRolls = { ...prismDraft.inverseRolls, [kind]: value };
  const partner = event.target
    .closest(".inverse-roll")
    .querySelector(event.target.matches("[data-inverse-slider]") ? "[data-inverse-input]" : "[data-inverse-slider]");
  partner.value = value;
  const control = event.target.closest(".inverse-roll");
  control.classList.remove("negative", "positive", "zero");
  control.classList.add(inverseRollSign(value));
  control.style.cssText = inverseRollStyle(range, value);
  renderPrismCrafterPreview();
});

// The core talent picker's data (apps/web/src/shell/dialogs/CoreTalentPickerDialog.tsx): the open tree's choices for a slot.
function corePickerSource() {
  const threshold = activeCoreThreshold,
    panel = currentTalentPanel();
  const points = talentPointTotals(activeTalentLayouts(), Object.fromEntries(talentRanks)).panels[panel.name];
  const locked = points < threshold;
  return {
    title: `Select ${threshold}-point core talent`,
    status: locked
      ? `${points}/${threshold} points in ${panel.name}. These choices unlock at ${threshold} points.`
      : `Choose one core talent for ${panel.name}.`,
    locked,
    options: panel.coreTalents
      .filter((core) => core.unlockPoints === threshold)
      .map((core) => ({
        name: core.name,
        description: core.description,
        art: tliArt.coreTalents[core.name] || core.icon,
        selected: plannerState.talents.coreSelections[`${panel.name}:${threshold}`] === core.name,
      })),
  };
}

const carinoProjectileSupportOptions = () => {
  const installed = currentEditedSetups()
    .flatMap((setup) => setup.supports || [])
    .map((support) => support.name);
  const wellPrepared = plannerState.hero.selectedTraits["carino-ranger-of-glory:level75"] === "Well Prepared";
  return carinoSpecialAmmoOptions(tlidbSupportCatalogSs13, tlidbSkillCatalogSs13, installed, wellPrepared);
};

function heroTraitSupportOptions() {
  return tlidbSupportCatalogSs13.filter(
    (support) => !support.passiveOnly && ["regular", "magnificent", "noble", "activation"].includes(support.category),
  );
}

// Trait level the tooltip shows, the rule src/engine/character-stats.js heroTraitStatLines and the planner apply (user-stated rule
// 2026-10-13; src/engine/heroes/hero-memory-rules.js): a memory gives 1 (any), 2 (enhancement 30+), 3 (Ultimate 50), plus its own "+N to
// Hero Trait Level". Base trait: that of the base-slot memory (1 without one, open). A 45/60/75 trait: 0 (inactive) with no
// memory in its slot, else that of its slot memory + the planner's non-memory "+N" lines; max 5.
function heroTraitTooltipLevel(levelKey = "base") {
  const bonus = heroTraitLevelBonus((currentPlanner().modifierTexts || []).filter((line) => line.origin !== "trait"));
  if (levelKey === "base")
    return Math.max(1, Math.min(5, baseTraitLevelForMemory(baseTraitReduction() === null ? null : baseTraitMemory())));
  if (String(levelKey).endsWith(":extra")) return EXTRA_PICK_LEVEL; // Youga's fourth tree row: max level (src/engine/heroes/hero-trait-tree.js)
  const tier = String(levelKey).match(/level\d+/)?.[0];
  return slotTraitLevel(
    plannerState.hero,
    [levelKey, tier],
    (bonus.all || 0) + (bonus.nonBase || 0),
    nonBaseTraitLevelExtras(plannerState.hero.selectedHeroId, artificialMoonGate(plannerState.hero).active),
  ); // Bing's sixth rank (Q-H2)
}

// Stores a trait tree's rows and re-renders like the other trait changes (pick, remove and drag-move all land here).
function commitTreeTraits(heroId, rows) {
  plannerState.hero.treeTraits = { ...(plannerState.hero.treeTraits || {}), [heroId]: rows };
  persistPlannerState();
  renderHeroTraitTree();
  renderConfiguration();
}

// The HERO tab is React (apps/web/src/features/hero): it re-reads its source. The open tab falls back to Hero Trait when
// the hero has no such tab (Sage's Scent Bottle, a tree hero's Trait Path).
function renderHeroTraitTree() {
  const heroId = plannerState.hero.selectedHeroId,
    sage = heroId === "sage-licorice-note",
    treeHero = Boolean(heroTraitTree(heroId));
  if (heroById(heroId) && !(sage && activeHeroDetailTab === "scent") && !(treeHero && activeHeroDetailTab === "path"))
    activeHeroDetailTab = "traits";
  viewSourceChanged("heroTraits");
}
// HERO tab commands (apps/web/src/features/hero). The hero, memory, scent, ammo and support dialogs stay here.
function openHeroSelector() {
  heroSelectorSession++;
  viewSourceChanged("heroSelector");
  $("#hero-selector").showModal();
}
// A hero picked in the hero selector: its loadout replaces the open hero's.
function selectHero(id) {
  const hero = heroById(id);
  if (!hero) return;
  plannerState.hero = switchHeroLoadout(plannerState.hero, hero.id);
  persistPlannerState();
  $("#hero-selector").close();
  renderCandidateViews();
  showToast(`${escapeHtml(hero.name)} · ${escapeHtml(hero.trait)} selected`);
}
function openMemorySocket(tier) {
  activeHeroMemoryTier = tier;
  renderHeroMemoryInventory();
  $("#hero-memory-selector").showModal();
}
// Right-click on a memory socket: takes its memory off; false when it holds none.
function removeMemory(tier) {
  if (tier === "base") {
    if (!plannerState.hero.baseTraitMemoryId) return false;
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
    persistPlannerState();
    renderHeroTraitTree();
    return true;
  }
  if (!plannerState.hero.equippedMemoryIds?.[tier]) return false;
  unequipHeroMemory(tier);
  return true;
}
function pickHeroTrait(selectionKey, name) {
  plannerState.hero.selectedTraits[selectionKey] = name;
  persistPlannerState();
  renderHeroTraitTree();
  renderConfiguration();
  showToast(`${escapeHtml(name)} selected`);
}
// Trait Path: picks a trait under the next free row, or takes the path back from a picked one.
function toggleTraitPathNode(name) {
  const heroId = plannerState.hero.selectedHeroId;
  if (name === heroTraitTree(heroId)?.base) return;
  const rules = heroTreeRules(plannerState.hero, heroId),
    before = heroTreeSelections(plannerState.hero, heroId),
    result = rules.toggle(before, name);
  if (result.error) {
    showToast(result.error);
    return;
  }
  commitTreeTraits(heroId, result.rows);
  showToast(
    before.includes(name)
      ? "Trait path shortened"
      : `${name} selected under ${rules.rowName(result.rows.indexOf(name))}`,
  );
}
// The end of a drag of a tree hero's pick: onto another row it moves there (swapping with that row's pick); off the rows
// (to null) it stays.
function moveTraitPick(from, to) {
  if (to === null) {
    showToast("Invalid drop · trait returned to its row");
    return;
  }
  if (to === from) return;
  const heroId = plannerState.hero.selectedHeroId,
    rules = heroTreeRules(plannerState.hero, heroId),
    before = heroTreeSelections(plannerState.hero, heroId),
    result = rules.move(before, from, to);
  if (result.error) {
    showToast(result.error);
    return;
  }
  const name = before[from],
    other = before[to];
  commitTreeTraits(heroId, result.rows);
  showToast(`Moved ${name} under ${rules.rowName(to)}${other ? ` · ${other} moved under ${rules.rowName(from)}` : ""}`);
}
function openScentSlot(kind) {
  sageScentSelectorKind = kind;
  sageScentSelectorSession++;
  viewSourceChanged("sageScentSelector");
  $("#sage-scent-selector").showModal();
  $("#sage-scent-search").focus();
}
// Sage's scent selector commands: a pick fills the slot it was opened for, Clear Slot empties it.
function setSageScent(name, toast) {
  plannerState.hero.sageScent[sageScentSelectorKind] = name;
  persistPlannerState();
  $("#sage-scent-selector").close();
  renderHeroTraitTree();
  showToast(toast);
}
function openCarinoAmmo(index) {
  activeHeroTraitSupportId = "";
  activeCarinoAmmoSlot = index;
  carinoAmmoSelectorSession++;
  viewSourceChanged("carinoAmmoSelector");
  $("#carino-ammo-selector").showModal();
  $("#carino-ammo-search").focus();
}
// Special Ammo selector commands: a pick (one the slot can take) fills the slot it was opened for, Clear Slot empties it.
function setCarinoAmmo(name, toast) {
  plannerState.hero.carinoSpecialAmmoSupports[activeCarinoAmmoSlot] = name;
  persistPlannerState();
  $("#carino-ammo-selector").close();
  renderHeroTraitTree();
  showToast(toast);
}
function removeCarinoAmmo(index) {
  const name = plannerState.hero.carinoSpecialAmmoSupports?.[index];
  plannerState.hero.carinoSpecialAmmoSupports[index] = "";
  persistPlannerState();
  renderHeroTraitTree();
  showToast(`${escapeHtml(name || "Special Ammo support")} removed`);
}
function openHeroTraitSupport(heroId) {
  activeHeroTraitSupportId = heroId;
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
  $("#skill-selector").showModal();
  $("#skill-selector-search").focus();
}
function removeHeroTraitSupport(heroId) {
  const name = plannerState.hero.heroTraitSupports?.[heroId];
  delete plannerState.hero.heroTraitSupports[heroId];
  delete plannerState.hero.heroTraitSupportLevels[heroId];
  delete plannerState.hero.heroTraitSupportConfigs[heroId];
  persistPlannerState();
  renderHeroTraitTree();
  showToast(`${escapeHtml(name || "Trait support")} removed`);
}

// Hero panel HERO | FOLLOWER tabs (src/app/follower-panel.js; 2026-10-15): the tab is remembered per build view (localStorage, UI
// only); the header "?" shows the open tab's controls. The FOLLOWER tab renders the follower card and its skill slots.
function activeBuildViewId() {
  try {
    return loadBuildLibrary().activeBuildId || "";
  } catch {
    return "";
  }
}
function renderHeroPanel() {
  const follower = readHeroPanelTab(activeBuildViewId()) === "follower";
  document.querySelectorAll("[data-hero-panel-tab]").forEach((button) => {
    const active = (button.dataset.heroPanelTab === "follower") === follower;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  $("#hero-panel-hero").hidden = follower;
  $("#follower-panel").hidden = !follower;
  const help = document.querySelector(".hero-panel-tabs [data-qol-help]");
  if (help) {
    help.dataset.qolHelp = follower ? "follower" : "hero";
    help.setAttribute("aria-label", follower ? "Follower controls" : "Hero controls");
  }
  // The FOLLOWER tab is React (apps/web/src/features/follower): it re-reads its source while the tab is open.
  if (follower) viewSourceChanged("follower");
}
// A follower skill slot opens the skill board's picker (#skill-selector) as selectorKind "follower-skill" (src/app/follower-panel.js followerSkillSelectorView; 2026-10-15 user request).
let followerSelectorSlot = 0;
// The picker's editor draft { name, tier, affixes } of the highlighted skill (src/app/follower-panel.js followerSkillDraft): it opens on the
// slot's own skill, tier and affixes and resets to a newly highlighted skill's (the slot's values when it is the slot's skill).
let followerSelectorDraft = null;
function openFollowerSkillSelector(slot) {
  selectorKind = "follower-skill";
  followerSelectorSlot = slot;
  followerSelectorDraft = null;
  selectorTargetSetupName = null;
  selectorTargetSupportSlot = null;
  selectorChoiceIndex = followerSelectorInitialIndex(plannerState, slot);
  skillSelectorSession++;
  renderSkillSelector();
  $("#skill-selector").showModal();
  $("#skill-selector-search").focus();
}
function commitFollower(next, message) {
  plannerState.followers = next;
  persistPlannerState();
  renderHeroPanel();
  renderConfiguration();
  if (message) showToast(message);
}

function heroMemoryTypeForTier(tier) {
  return memoryTypesByTier[
    String(tier || "")
      .split(":")
      .pop()
  ];
}
function heroMemoryTierForType(type) {
  const levelTier = Object.keys(memoryTypesByTier).find((tier) => memoryTypesByTier[tier] === type);
  if (!levelTier) return null;
  const heroId = plannerState.hero.selectedHeroId;
  return heroId && heroId !== "selena-sing-with-the-tide" ? `${heroId}:${levelTier}` : levelTier;
}
function baseTraitMemory() {
  return plannerState.hero.memoryInventory?.find((memory) => memory.id === plannerState.hero.baseTraitMemoryId) || null;
}
function canEquipBaseTraitMemory(memory) {
  return (
    memoryFitsBaseTraitSlot(
      memory,
      equippedBaseTraitSlot(plannerState.hero),
      Object.values(plannerState.hero.equippedMemoryIds || {}),
    ) && !heroMemoryIsRevived(memory)
  );
}
function baseTraitReduction() {
  const slot = equippedBaseTraitSlot(plannerState.hero),
    target = baseTraitMemory();
  if (
    !target ||
    !memoryFitsBaseTraitSlot(target, slot, Object.values(plannerState.hero.equippedMemoryIds || {})) ||
    heroMemoryIsRevived(target)
  )
    return null;
  const range = slot.reductionRange;
  return Math.max(range.min, Math.min(range.max, plannerState.hero.baseTraitMemoryRoll ?? range.max));
}
function clearInvalidBaseTraitMemory() {
  if (plannerState.hero.baseTraitMemoryId && baseTraitReduction() === null) {
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
  }
}
function memoryRevivalBadge(memory) {
  return heroMemoryIsRevived(memory)
    ? '<span class="memory-revival-badge"><span aria-hidden="true">☾</span> Revived</span>'
    : "";
}
function memoryRevivedDetailsMarkup(details) {
  const lines = details
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const effects = lines.filter((line) => !/^Hero Trait Exclusive:/i.test(line));
  const exclusive = lines.find((line) => /^Hero Trait Exclusive:/i.test(line));
  const trait = exclusive?.replace(/^Hero Trait Exclusive:\s*/i, "").split(/\s*\|\s*/);
  return `<div class="memory-revived-detail"><ul>${effects.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>${trait ? `<div class="memory-revived-exclusive"><small>Hero trait exclusive</small><span>${escapeHtml(trait.filter(Boolean).join(" · "))}</span></div>` : ""}</div>`;
}
function memoryRevivedAffixMarkup(memory) {
  const name = normalizeRevivedAffix(memory.revivedAffix),
    special = lunarPhaseRevivedAffixesSs13.includes(name);
  const effect = revivedAffixForMemoryType(memory.revivedAffix, memory.type, memory.revivedTier, memory.revivedRoll);
  const tier = revivedAffixTiers(name).length ? memory.revivedTier : null;
  const rawDetails = lunarPhaseRevivedAffixDetailsSs13[name];
  const details = name?.startsWith("Artificial Moon:")
    ? rawDetails?.replace(
        /\s*Reduces the Base Stats and Random Affixes of Memories installed in this slot by \d+%/i,
        "",
      )
    : rawDetails;
  return `<div class="memory-revived-effect ${special ? "special" : ""}">${Number.isInteger(tier) ? affixTierBadge(`T${tier}`) : ""}<span class="memory-revived-name">${escapeHtml(effect)}</span>${details ? `<small class="memory-revived-hint">Hold Alt for details</small>${memoryRevivedDetailsMarkup(details)}` : ""}</div>`;
}
function otherEquippedRevivedMemory(memory) {
  const equippedIds = [
    ...Object.values(plannerState.hero.equippedMemoryIds || {}),
    plannerState.hero.baseTraitMemoryId,
  ];
  return (
    heroMemoryIsRevived(memory) &&
    equippedIds.some(
      (id) =>
        id &&
        id !== memory.id &&
        heroMemoryIsRevived(plannerState.hero.memoryInventory?.find((item) => item.id === id)),
    )
  );
}
function unequipHeroMemory(tier) {
  if (!tier || !plannerState.hero.equippedMemoryIds?.[tier]) return;
  hidePlannerTooltip();
  plannerState.hero.memories[tier] = "";
  plannerState.hero.memoryTraitLevels[tier] = 0;
  delete plannerState.hero.equippedMemoryIds[tier];
  clearInvalidBaseTraitMemory();
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast("Hero memory unequipped");
}
function equipHeroMemory(memory) {
  const tier = heroMemoryTierForType(memory?.type);
  if (!tier) return;
  if (otherEquippedRevivedMemory(memory)) {
    showToast("Only one revived memory can be equipped");
    return;
  }
  hidePlannerTooltip();
  plannerState.hero.equippedMemoryIds ||= {};
  // The game-log import keys a memory by its level alone ("level45"), the planner by hero ("<hero>:level45"), and the
  // calculation counts every key: the level's other key goes, so one memory sits at a level.
  const level = tier.replace(/^.*:/, "");
  for (const key of [level, `${plannerState.hero.selectedHeroId}:${level}`])
    if (key !== tier && plannerState.hero.equippedMemoryIds[key]) {
      delete plannerState.hero.equippedMemoryIds[key];
      plannerState.hero.memories[key] = "";
      plannerState.hero.memoryTraitLevels[key] = 0;
    }
  plannerState.hero.equippedMemoryIds[tier] = memory.id;
  plannerState.hero.memories[tier] = memory.name;
  plannerState.hero.memoryTraitLevels[tier] = traitLevelBonusForEnhancement(memory.enhancementLevel);
  clearInvalidBaseTraitMemory();
  persistPlannerState();
  renderHeroTraitTree();
  renderHeroMemoryInventory();
  showToast(`${escapeHtml(memory.name)} equipped`);
}
function openHeroMemorySlot(memory, preferBase = false) {
  const baseOpen = !plannerState.hero.baseTraitMemoryId && canEquipBaseTraitMemory(memory);
  const tier = heroMemoryTierForType(memory?.type);
  const regularOpen = Boolean(
    tier &&
    !plannerState.hero.equippedMemoryIds?.[tier] &&
    !plannerState.hero.memories?.[tier] &&
    !otherEquippedRevivedMemory(memory),
  );
  if (preferBase && baseOpen) return "base";
  if (regularOpen) return tier;
  return baseOpen ? "base" : null;
}
function renderHeroMemoryInventory() {
  const inventory = plannerState.hero.memoryInventory || [];
  const equipped = plannerState.hero.equippedMemoryIds || {};
  const baseMode = activeHeroMemoryTier === "base",
    requiredType = equippedBaseTraitSlot(plannerState.hero)?.memoryType?.replace(/^Memory of /, "") || "";
  $("#hero-memory-title").textContent = baseMode ? "Hero Memories · Base Trait Slot" : "Hero Memories";
  $("#hero-memory-content").innerHTML =
    `<div class="hero-memory-inventory"><div class="hero-memory-list">${baseMode ? `<p class="hero-memory-slot-hint">This slot accepts Memory of ${escapeHtml(requiredType)}. Right-click any memory to equip it in an open compatible slot.</p>` : ""}${
      inventory.length
        ? inventory
            .map((memory) => {
              const tier = Object.keys(equipped).find((key) => equipped[key] === memory.id),
                baseEquipped = plannerState.hero.baseTraitMemoryId === memory.id,
                compatible = canEquipBaseTraitMemory(memory),
                disabled = baseMode ? !compatible && !baseEquipped : !tier && otherEquippedRevivedMemory(memory),
                available = tier || baseEquipped || openHeroMemorySlot(memory, baseMode);
              return `<article class="hero-memory-item memory-rarity-${escapeHtml(memory.rarity)} ${available ? "" : "incompatible"}" data-memory-inventory-id="${escapeHtml(memory.id)}"><img src="${heroMemoryIcon(memory.type)}" alt=""><div><strong>${escapeHtml(memory.name)}</strong><small>${escapeHtml(memory.type)} · ${escapeHtml(memory.rarity)}${tier ? ` · Equipped at Lv.${tier.match(/level(\d+)$/)?.[1]}` : ""}${baseEquipped ? " · Base trait slot" : ""}</small></div><button type="button" ${baseMode ? `data-equip-base-memory="${escapeHtml(memory.id)}" ${disabled ? 'disabled title="Only a matching, unequipped memory fits this base trait slot"' : ""}` : `data-equip-crafted-memory="${escapeHtml(memory.id)}" ${disabled ? 'disabled title="Only one revived memory can be equipped"' : ""}`}>${baseMode ? (baseEquipped ? "Unequip" : compatible ? "Equip" : "Unavailable") : tier ? "Unequip" : "Equip"}</button><button type="button" data-copy-crafted-memory="${escapeHtml(memory.id)}" aria-label="Copy ${escapeHtml(memory.name)}">Copy</button><button type="button" data-edit-crafted-memory="${escapeHtml(memory.id)}" aria-label="Edit ${escapeHtml(memory.name)}">✎</button><button type="button" data-delete-crafted-memory="${escapeHtml(memory.id)}" aria-label="Delete ${escapeHtml(memory.name)}">×</button></article>`;
            })
            .join("")
        : '<div class="hero-memory-empty">No memories crafted yet<br><button type="button" class="button" data-craft-hero-memory>Craft your first Memory</button></div>'
    }</div><div class="hero-memory-inventory-footer">${baseMode ? (plannerState.hero.baseTraitMemoryId ? '<button type="button" class="button button-secondary" data-clear-base-memory>Unequip slot</button>' : "") : plannerState.hero.memories?.[activeHeroMemoryTier] ? '<button type="button" class="button button-secondary" data-clear-hero-memory>Unequip slot</button>' : ""}<button type="button" class="button" data-craft-hero-memory>Craft Memory</button></div></div>`;
}
function startHeroMemoryCraft(memory = null) {
  editingMemoryId = memory?.id || null;
  memoryDraft = memory
    ? structuredClone(memory)
    : {
        id: "",
        name: "",
        type:
          activeHeroMemoryTier === "base"
            ? equippedBaseTraitSlot(plannerState.hero)?.memoryType || "Memory of Origin"
            : heroMemoryTypeForTier(activeHeroMemoryTier),
        rarity: "",
        baseStat: "",
        enhancementLevel: 1,
        waxAndWane: false,
        risingMoon: false,
        revivedAffix: "",
        revivedTier: 1,
        revivedRoll: null,
        fixedAffixes: ["", ""],
        randomAffixes: ["", ""],
        fixedTiers: [1, 1],
        randomTiers: [0, 0],
        fixedRolls: [null, null],
        randomRolls: [null, null],
        traitLevelBonus: 1,
      };
  memoryDraft.name = memoryDraft.type;
  const oldRevivedEntry = regularRevivedAffixesSs13.find((entry) => entry.effect === memoryDraft.revivedAffix);
  memoryDraft.revivedTier = memoryDraft.revivedTier ?? oldRevivedEntry?.tier ?? 1;
  memoryDraft.revivedRoll =
    memoryDraft.revivedRoll ?? (oldRevivedEntry ? revivedAffixRollRange(oldRevivedEntry.effect)?.max : null) ?? null;
  memoryDraft.revivedAffix =
    memoryDraft.revivedAffix === "Artificial Moon"
      ? `Artificial Moon: ${memoryDraft.type.replace(/^Memory of /, "")}`
      : normalizeRevivedAffix(memoryDraft.revivedAffix);
  if (memoryDraft.revivedAffix.startsWith("Artificial Moon:")) memoryDraft.revivedRoll = null;
  delete memoryDraft.revivalMethod;
  memoryDraft.risingMoon = Boolean(memoryDraft.risingMoon || memoryDraft.fixedTiers?.includes(0));
  memoryDraft.enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity);
  memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
  memoryDraft.fixedTiers ||= [1, 1];
  memoryDraft.randomTiers ||= [0, 0];
  memoryDraft.fixedRolls ||= [null, null];
  memoryDraft.randomRolls ||= [null, null];
  renderHeroMemoryCraft();
}
function memoryRollRange(effect) {
  const match = effect.match(/\((-?\d+)[–-](-?\d+)\)/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}
function rolledMemoryAffix(effect, roll) {
  const range = memoryRollRange(effect);
  return range && Number.isFinite(roll) ? effect.replace(/\(-?\d+[–-]-?\d+\)/, String(roll)) : effect;
}
const memoryAffixKey = (effect) =>
  effect
    .replace(/[-+%()–\d.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
function memoryTierOptions(group, effect) {
  if (!effect) return [];
  const kind = group === "fixedAffixes" ? "Fixed Affix" : "Random Affix",
    key = memoryAffixKey(effect);
  const tiers = heroMemoryTierAffixesSs13.filter(
    (entry) => entry.type === memoryDraft.type && entry.kind === kind && memoryAffixKey(entry.effect) === key,
  );
  if (group === "fixedAffixes" && memoryDraft.risingMoon)
    tiers.push(
      ...heroMemoryFixedT0AffixesSs13.filter(
        (entry) => entry.type === memoryDraft.type && memoryAffixKey(entry.baseEffect) === key,
      ),
    );
  return tiers.sort((a, b) => b.tier - a.tier);
}
function memoryResolvedAffix(group, index) {
  const effect = memoryDraft[group][index];
  if (!effect) return "";
  const tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
    rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls";
  const selectedTier = memoryDraft[tierGroup][index];
  const tierEffect = memoryTierOptions(group, effect).find((entry) => entry.tier === selectedTier)?.effect || effect;
  const range = memoryRollRange(tierEffect),
    roll = memoryDraft[rollGroup][index];
  return rolledMemoryAffix(
    tierEffect,
    range && Number.isFinite(roll) ? Math.max(range.min, Math.min(range.max, roll)) : roll,
  );
}
function memoryAffixControl(group, index, value, entries, label) {
  const tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
    rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls",
    tiers = memoryTierOptions(group, value),
    activeTier = memoryDraft[tierGroup][index],
    activeEffect = tiers.find((entry) => entry.tier === activeTier)?.effect || value,
    range = memoryRollRange(activeEffect),
    roll = memoryDraft[rollGroup]?.[index] ?? range?.max;
  const numericTiers =
    !range &&
    tiers.length > 1 &&
    tiers.every((entry) => memoryTierNumericValue(entry.effect) !== null) &&
    new Set(tiers.map((entry) => memoryTierNumericValue(entry.effect))).size === tiers.length;
  const tierValues = numericTiers ? tiers.map((entry) => memoryTierNumericValue(entry.effect)) : [];
  const tierIndex = Math.max(
    0,
    tiers.findIndex((entry) => entry.tier === activeTier),
  );
  const controls = range
    ? `<div class="memory-roll-controls"><input type="range" min="${range.min}" max="${range.max}" value="${roll}" data-memory-field="${rollGroup}.${index}" aria-label="${label} roll slider"><input type="number" min="${range.min}" max="${range.max}" step="1" value="${roll}" data-memory-field="${rollGroup}.${index}" aria-label="${label} roll value"></div>`
    : numericTiers
      ? `<div class="memory-roll-controls"><input type="range" min="0" max="${tiers.length - 1}" step="1" value="${tierIndex}" data-memory-tier-slider="${group}.${index}" aria-label="${label} tier value slider"><input type="number" min="${Math.min(...tierValues)}" max="${Math.max(...tierValues)}" step="any" value="${tierValues[tierIndex]}" data-memory-tier-value="${group}.${index}" aria-label="${label} tier value"></div>`
      : "";
  return `<label>${label}<select data-memory-field="${group}.${index}" aria-label="${label}"><option value="">None</option>${entries.map((entry) => `<option value="${escapeHtml(entry.effect)}" ${value === entry.effect ? "selected" : ""}>${escapeHtml(entry.effect)}</option>`).join("")}</select>${tiers.length > 1 ? `<span class="memory-tier-row">${tiers.map((entry) => `<button type="button" class="${entry.tier === activeTier ? "active" : ""}" data-memory-tier-choice="${group}.${index}.${entry.tier}">T${entry.tier}</button>`).join("")}</span>` : ""}${controls}</label>`;
}
function focusMemoryRollValue(field) {
  const input = Array.from(document.querySelectorAll('#hero-memory-content input[type="number"]')).find(
    (element) => element.dataset.memoryField === field || element.dataset.memoryTierValue === field,
  );
  if (input) {
    input.focus();
    input.select();
  }
}
function memoryRevivalControls(draft) {
  const regular = regularRevivedAffixNamesSs13
    .map(
      (name) =>
        `<option value="${escapeHtml(name)}" data-revived-description="${escapeHtml(revivedAffixTiers(name)[0].effect)}" ${draft.revivedAffix === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
    )
    .join("");
  const lunar = lunarPhaseRevivedAffixesSs13
    .map(
      (name) =>
        `<option value="${escapeHtml(name)}" ${draft.revivedAffix === name ? "selected" : ""}>${escapeHtml(name)}</option>`,
    )
    .join("");
  const known =
    regularRevivedAffixNamesSs13.includes(draft.revivedAffix) ||
    lunarPhaseRevivedAffixesSs13.includes(draft.revivedAffix);
  const saved =
    draft.revivedAffix && !known
      ? `<option value="${escapeHtml(draft.revivedAffix)}" selected>Saved effect</option>`
      : "";
  const tiers = revivedAffixTiers(draft.revivedAffix),
    active = tiers.find((entry) => entry.tier === draft.revivedTier) || tiers[0],
    range = revivedAffixRollRange(active?.effect),
    roll = range ? Math.max(range.min, Math.min(range.max, draft.revivedRoll ?? range.max)) : null;
  return `<h3>Memory Revival</h3><label class="memory-wax"><span>Wax and Wane (+30% base stat)</span><input type="checkbox" data-memory-field="waxAndWane" ${draft.waxAndWane ? "checked" : ""}></label><label class="memory-wax"><span>Rising Moon (T0 fixed affixes)</span><input type="checkbox" data-memory-field="risingMoon" ${draft.risingMoon ? "checked" : ""}></label><label>Revived Affix<select data-memory-field="revivedAffix" aria-label="Revived affix"><option value="">None</option><optgroup label="Regular Revived Affixes">${regular}</optgroup><optgroup label="Lunar Phase">${lunar}</optgroup>${saved}</select></label>${active ? `<div class="memory-revived-controls"><span class="memory-tier-row">${tiers.map((entry) => `<button type="button" class="${entry.tier === active.tier ? "active" : ""}" data-revived-tier="${entry.tier}">T${entry.tier}</button>`).join("")}</span>${range ? `<div class="memory-roll-controls"><input type="range" min="${range.min}" max="${range.max}" value="${roll}" data-memory-field="revivedRoll" aria-label="Revived affix roll slider"><input type="number" min="${range.min}" max="${range.max}" step="1" value="${roll}" data-memory-field="revivedRoll" aria-label="Revived affix roll value"></div>` : ""}</div>` : ""}`;
}
function renderHeroMemoryCraft() {
  const draft = memoryDraft,
    maxEnhancement = memoryMaxEnhancementForRarity(draft.rarity),
    pool = (kind) => {
      const base = heroMemoryAffixesSs13.filter((entry) => entry.type === draft.type && entry.kind === kind);
      return kind === "Fixed Affix" && draft.risingMoon
        ? [
            ...base,
            ...heroMemoryFixedT0AffixesSs13
              .filter(
                (entry) =>
                  entry.type === draft.type &&
                  !base.some((item) => memoryAffixKey(item.effect) === memoryAffixKey(entry.baseEffect)),
              )
              .map((entry) => ({ ...entry, effect: entry.baseEffect })),
          ]
        : base;
    },
    select = (field, value, entries, label) =>
      `<select data-memory-field="${field}" aria-label="${label}"><option value="">None</option>${entries.map((entry) => `<option value="${escapeHtml(entry.effect)}" ${value === entry.effect ? "selected" : ""}>${escapeHtml(entry.label || entry.effect)}</option>`).join("")}</select>`;
  $("#hero-memory-title").textContent = editingMemoryId ? "Edit Memory" : "Craft Memory";
  $("#hero-memory-content").innerHTML =
    `<div class="hero-memory-craft"><section class="hero-memory-form"><label>Memory Type</label><div class="hero-memory-choice-row memory-types">${Object.values(
      memoryTypesByTier,
    )
      .map(
        (type) =>
          `<button type="button" class="${draft.type === type ? "active" : ""}" data-memory-type="${type}"><img src="${heroMemoryIcon(type)}" alt="">${type}</button>`,
      )
      .join(
        "",
      )}</div><label>Crafting Rarity *</label><div class="hero-memory-choice-row rarities">${["Normal", "Magic", "Epic", "Legendary", "Ultimate"].map((rarity) => `<button type="button" class="memory-rarity-${rarity.toLowerCase()} ${draft.rarity === rarity.toLowerCase() ? "active" : ""}" data-memory-rarity="${rarity.toLowerCase()}">${rarity}</button>`).join("")}</div><label>Base Stat *${select(
      "baseStat",
      draft.baseStat,
      pool("Base Stats").map((entry) => ({ ...entry, label: memoryBaseStatLabel(entry.effect) })),
      "Base stat",
    )}</label><label>Enhancement Level <strong>Lv.${draft.enhancementLevel}</strong><span class="memory-roll-controls memory-enhancement-controls"><input type="range" min="1" max="${maxEnhancement}" value="${draft.enhancementLevel}" data-memory-field="enhancementLevel" aria-label="Enhancement level slider"><input type="number" min="1" max="${maxEnhancement}" step="1" value="${draft.enhancementLevel}" data-memory-field="enhancementLevel" aria-label="Enhancement level value"></span></label>${memoryRevivalControls(draft)}<h3>Fixed Affixes (${draft.fixedAffixes.filter(Boolean).length}/2)</h3>${draft.fixedAffixes.map((value, index) => memoryAffixControl("fixedAffixes", index, value, pool("Fixed Affix"), `Fixed ${index + 1}`)).join("")}<h3>Random Affixes (${draft.randomAffixes.filter(Boolean).length}/2)</h3>${draft.randomAffixes.map((value, index) => memoryAffixControl("randomAffixes", index, value, pool("Random Affix"), `Random ${index + 1}`)).join("")}</section><aside><span>Preview</span><div class="hero-memory-preview memory-rarity-${escapeHtml(draft.rarity || "normal")}">${draft.baseStat ? `<header><img src="${heroMemoryIcon(draft.type)}" alt=""><div><strong>${escapeHtml(draft.type)}</strong><small>${escapeHtml(draft.rarity || "normal")} · HERO MEMORY</small></div></header>${memoryRevivalBadge(draft)}<p><span data-memory-enhancement-preview>Enhancement Level ${draft.enhancementLevel}/${maxEnhancement}</span><br><span data-memory-trait-preview>Trait Level +${traitLevelBonusForEnhancement(draft.enhancementLevel)}</span></p><h4>Implicit</h4><div class="memory-implicit ${draft.waxAndWane ? "wax-applied" : ""}">${escapeHtml(memoryScaledBaseStat(draft.baseStat, draft.type, draft.enhancementLevel, draft.waxAndWane, draft.rarity))}</div>${draft.waxAndWane ? `<h4>Memory Revival</h4><div>Wax and Wane · +30% base stat</div>` : ""}${draft.revivedAffix ? `<h4>Revived Affix${lunarPhaseRevivedAffixesSs13.includes(draft.revivedAffix) ? " · Lunar Phase" : ""}</h4>${memoryRevivedAffixMarkup(draft)}` : ""}${draft.fixedAffixes.some(Boolean) ? `<h4>Fixed Affixes</h4>${draft.fixedAffixes.map((value, index) => (value ? `<div data-memory-preview-affix="fixedAffixes.${index}">${escapeHtml(memoryResolvedAffix("fixedAffixes", index))}</div>` : "")).join("")}` : ""}${draft.randomAffixes.some(Boolean) ? `<h4>Random Affixes</h4>${draft.randomAffixes.map((value, index) => (value ? `<div data-memory-preview-affix="randomAffixes.${index}">${escapeHtml(memoryResolvedAffix("randomAffixes", index))}</div>` : "")).join("")}` : ""}` : '<p class="hero-memory-preview-empty">Select a base stat to preview memory</p>'}</div><div class="hero-memory-craft-actions"><button type="button" class="button button-secondary" data-back-hero-memory>Cancel</button><button type="button" class="button" data-save-crafted-memory ${draft.rarity && draft.baseStat ? "" : "disabled"}>${editingMemoryId ? "Save Changes" : "Craft"}</button></div></aside></div>`;
  const traitPreview = $("#hero-memory-content [data-memory-trait-preview]");
  if (traitPreview)
    traitPreview.innerHTML = `Trait Level <b class="memory-trait-bonus">+${memoryDraft.traitLevelBonus}</b>`;
  $("#hero-memory-content")
    .querySelectorAll("[data-memory-preview-affix]")
    .forEach((preview) => {
      const [group, indexText] = preview.dataset.memoryPreviewAffix.split("."),
        index = Number(indexText);
      preview.classList.add("memory-affix-row");
      preview.innerHTML = memoryAffixRowContent(
        memoryResolvedAffix(group, index),
        memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index],
      );
    });
}
function updateMemoryDraftField(input) {
  if (!memoryDraft) return;
  const field = input.dataset.memoryField;
  const value =
    input.type === "checkbox"
      ? input.checked
      : input.type === "range" || input.type === "number"
        ? Number(input.value)
        : input.value;
  if (/^(fixedAffixes|randomAffixes|fixedRolls|randomRolls)\./.test(field || "")) {
    const [group, indexText] = field.split("."),
      index = Number(indexText);
    if (group === "fixedRolls" || group === "randomRolls") {
      const affixGroup = group === "fixedRolls" ? "fixedAffixes" : "randomAffixes",
        tierGroup = group === "fixedRolls" ? "fixedTiers" : "randomTiers",
        tiers = memoryTierOptions(affixGroup, memoryDraft[affixGroup][index]);
      const effect =
          tiers.find((entry) => entry.tier === memoryDraft[tierGroup][index])?.effect || memoryDraft[affixGroup][index],
        range = memoryRollRange(effect);
      memoryDraft[group][index] = range ? Math.max(range.min, Math.min(range.max, value)) : value;
    } else {
      memoryDraft[group][index] = value;
      const rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls",
        tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers";
      memoryDraft[tierGroup][index] =
        group === "fixedAffixes" && memoryTierOptions(group, value).some((entry) => entry.tier === 1) ? 1 : 0;
      memoryDraft[rollGroup][index] = memoryRollRange(value)?.max ?? null;
    }
  } else if (field === "revivedAffix") {
    memoryDraft.revivedAffix = value;
    memoryDraft.revivedTier = 1;
    memoryDraft.revivedRoll = revivedAffixRollRange(revivedAffixTiers(value)[0]?.effect)?.max ?? null;
  } else if (field === "revivedRoll") {
    const effect = revivedAffixTiers(memoryDraft.revivedAffix).find(
      (entry) => entry.tier === memoryDraft.revivedTier,
    )?.effect;
    const range = revivedAffixRollRange(effect);
    memoryDraft.revivedRoll = range ? Math.max(range.min, Math.min(range.max, value)) : null;
  } else memoryDraft[field] = field === "enhancementLevel" ? clampMemoryEnhancement(value, memoryDraft.rarity) : value;
  if (field === "risingMoon" && !value) {
    memoryDraft.fixedAffixes = memoryDraft.fixedAffixes.map((effect) =>
      effect &&
      !heroMemoryTierAffixesSs13.some(
        (entry) =>
          entry.type === memoryDraft.type &&
          entry.kind === "Fixed Affix" &&
          memoryAffixKey(entry.effect) === memoryAffixKey(effect),
      )
        ? ""
        : effect,
    );
    memoryDraft.fixedTiers = memoryDraft.fixedTiers.map((tier) => (tier === 0 ? 1 : tier));
  }
  if (field === "enhancementLevel")
    memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
}
function updateMemoryAffixPreview(group, index) {
  const preview = $("#hero-memory-content .hero-memory-preview")?.querySelector(
    `[data-memory-preview-affix="${group}.${index}"]`,
  );
  if (preview)
    preview.innerHTML = memoryAffixRowContent(
      memoryResolvedAffix(group, index),
      memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index],
    );
}
document.addEventListener("input", (event) => {
  const tierSlider = event.target.closest("#hero-memory-content [data-memory-tier-slider]");
  if (tierSlider) {
    const [group, indexText] = tierSlider.dataset.memoryTierSlider.split("."),
      index = Number(indexText),
      tiers = memoryTierOptions(group, memoryDraft[group][index]),
      entry = tiers[Number(tierSlider.value)];
    if (entry) {
      memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index] = entry.tier;
      memoryDraft[group === "fixedAffixes" ? "fixedRolls" : "randomRolls"][index] = null;
      const number = tierSlider.parentElement.querySelector("[data-memory-tier-value]");
      if (number) number.value = memoryTierNumericValue(entry.effect);
      tierSlider
        .closest("label")
        .querySelectorAll("[data-memory-tier-choice]")
        .forEach((button) =>
          button.classList.toggle("active", Number(button.dataset.memoryTierChoice.split(".")[2]) === entry.tier),
        );
      updateMemoryAffixPreview(group, index);
    }
    return;
  }
  if (!event.target.matches("#hero-memory-content [data-memory-field]")) return;
  if (event.target.type === "number" && event.target.value === "") return;
  updateMemoryDraftField(event.target);
  const roll = event.target.dataset.memoryField?.match(/^(fixedRolls|randomRolls)\.(\d+)$/);
  if (roll) {
    event.target
      .closest(".memory-roll-controls")
      ?.querySelectorAll(`[data-memory-field="${roll[1]}.${roll[2]}"]`)
      .forEach((control) => {
        if (control !== event.target) control.value = memoryDraft[roll[1]][Number(roll[2])];
      });
    updateMemoryAffixPreview(roll[1] === "fixedRolls" ? "fixedAffixes" : "randomAffixes", Number(roll[2]));
  }
  if (event.target.dataset.memoryField === "revivedRoll") {
    event.target
      .closest(".memory-roll-controls")
      ?.querySelectorAll('[data-memory-field="revivedRoll"]')
      .forEach((control) => {
        if (control !== event.target) control.value = memoryDraft.revivedRoll;
      });
    const preview = $("#hero-memory-content .memory-revived-effect .memory-revived-name");
    if (preview)
      preview.textContent = revivedAffixForMemoryType(
        memoryDraft.revivedAffix,
        memoryDraft.type,
        memoryDraft.revivedTier,
        memoryDraft.revivedRoll,
      );
  }
  if (event.target.dataset.memoryField === "enhancementLevel") {
    event.target
      .closest(".memory-enhancement-controls")
      ?.querySelectorAll('[data-memory-field="enhancementLevel"]')
      .forEach((control) => {
        if (control !== event.target) control.value = memoryDraft.enhancementLevel;
      });
    const label = event.target.closest("label")?.querySelector("strong");
    if (label) label.textContent = `Lv.${memoryDraft.enhancementLevel}`;
    const level = $("#hero-memory-content [data-memory-enhancement-preview]"),
      trait = $("#hero-memory-content [data-memory-trait-preview]");
    if (level)
      level.textContent = `Enhancement Level ${memoryDraft.enhancementLevel}/${memoryMaxEnhancementForRarity(memoryDraft.rarity)}`;
    if (trait) trait.innerHTML = `Trait Level <b class="memory-trait-bonus">+${memoryDraft.traitLevelBonus}</b>`;
    const implicit = $("#hero-memory-content .memory-implicit");
    if (implicit)
      implicit.textContent = memoryScaledBaseStat(
        memoryDraft.baseStat,
        memoryDraft.type,
        memoryDraft.enhancementLevel,
        memoryDraft.waxAndWane,
        memoryDraft.rarity,
      );
  }
});
document.addEventListener("change", (event) => {
  const tierControl = event.target.closest(
    "#hero-memory-content [data-memory-tier-slider],#hero-memory-content [data-memory-tier-value]",
  );
  if (tierControl) {
    const id = tierControl.dataset.memoryTierSlider || tierControl.dataset.memoryTierValue,
      [group, indexText] = id.split("."),
      index = Number(indexText),
      tiers = memoryTierOptions(group, memoryDraft[group][index]);
    const entry =
      tierControl.dataset.memoryTierValue !== undefined
        ? closestMemoryTier(tiers, tierControl.value)
        : tiers[Number(tierControl.value)];
    if (entry) memoryDraft[group === "fixedAffixes" ? "fixedTiers" : "randomTiers"][index] = entry.tier;
    const scroll = $("#hero-memory-content .hero-memory-form")?.scrollTop || 0;
    renderHeroMemoryCraft();
    $("#hero-memory-content .hero-memory-form").scrollTop = scroll;
    return;
  }
  if (!event.target.matches("#hero-memory-content [data-memory-field]")) return;
  updateMemoryDraftField(event.target);
  const scroll = $("#hero-memory-content .hero-memory-form")?.scrollTop || 0;
  renderHeroMemoryCraft();
  $("#hero-memory-content .hero-memory-form").scrollTop = scroll;
});

const titleCase = (value) => value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

// The Gear section is React (apps/web/src/features/gear): it re-reads its source.
function renderEquipment() {
  viewSourceChanged("equipment");
}
// The Gear section's data (src/app/bridge/equipment-view-model.ts).
function equipmentSource() {
  return equipmentView({
    slots: equipmentSlots,
    items: currentEquipmentImpact().allItems,
    disabled: disabledEquipmentSlots,
    selectedSlot: selectedEquipmentSlot,
    inventory: inventoryItems(),
    look: (item) => ({
      rarityClass: `rarity-${itemCardRarity(itemDisplayRarity(item), item)}${sixAffixClass(item)}${pricelessClass(item)}${itemLevel100Class(item)}`,
      icon: gearIcon(item),
    }),
    curseOffReason: curseItemOffReason,
    isEquipped: isItemEquipped,
    slotDragItem: equippedSlotInventoryItem,
  });
}
// The Inventory entry an equipped slot holds: its source, or an entry of the same name that fits the slot (a drag of
// the slot carries it).
function equippedSlotInventoryItem(slot, equipped) {
  const sourceId = plannerState.equipmentOverrides?.[slot]?.sourceInventoryId;
  return (
    inventoryItems().find((entry) => entry.id === sourceId) ||
    inventoryItems().find(
      (entry) => entry.name === equipped.name && (entry.slot === slot || canDropGearInSlot(entry, slot)),
    ) ||
    null
  );
}

function compatibleEquipmentSlot(item) {
  if (item.slot === "leftRing") {
    const equipped = currentEquipmentImpact().allItems.filter((entry) => !disabledEquipmentSlots.has(entry.slot)),
      occupied = (slot) => equipped.some((entry) => entry.slot === slot);
    if (selectedEquipmentSlot === "rightRing") return "rightRing";
    if (selectedEquipmentSlot === "leftRing" && !occupied("leftRing")) return "leftRing";
    if (occupied("leftRing") && !occupied("rightRing")) return "rightRing";
    if (!occupied("leftRing")) return "leftRing";
    return selectedEquipmentSlot === "rightRing" ? "rightRing" : "leftRing";
  }
  if (item.slot === "mainHand") {
    if (selectedEquipmentSlot === "secondaryHand") return "secondaryHand";
    if (!disabledEquipmentSlots.has("mainHand") && disabledEquipmentSlots.has("secondaryHand")) return "secondaryHand";
    return "mainHand";
  }
  return item.slot;
}
function equipmentEnergyAllowed(slot) {
  return !["necklace", "belt", "leftRing", "rightRing"].includes(slot);
}
function maxEquipmentEnergy(itemLevel, slot, base = "") {
  if (!equipmentEnergyAllowed(slot)) return 0;
  const level = Number(itemLevel);
  const singleHandCaps = [0, 9, 12, 15, 18, 21, 34, 48, 61];
  const band = Number.isFinite(level) && level >= 45 ? Math.min(8, Math.floor((level - 45) / 5) + 1) : 0;
  const twoHanded =
    slot === "chest" ||
    [
      "Two-Handed Sword",
      "Two-Handed Hammer",
      "Two-Handed Axe",
      "Tin Staff",
      "Cudgel",
      "Bow",
      "Crossbow",
      "Musket",
      "Fire Cannon",
    ].includes(base);
  return singleHandCaps[band] * (twoHanded ? 2 : 1);
}
function selectedBeltBlend(root, selector = "[data-craft-belt-blend]") {
  return beltBlendById(root?.querySelector(selector)?.value);
}
function towerSequencesForType(type) {
  return towerSequencesSs13.filter((entry) => entry.weaponType === type);
}
function towerSequenceById(id) {
  return towerSequencesSs13.find((entry) => entry.id === id);
}
function towerSequenceOptions(type, selectedId = "") {
  return towerSequenceOptionMarkup(towerSequencesForType(type), selectedId);
}
function itemWeaponType(item) {
  return (
    rareBaseItemsSs13.find((entry) => entry.id === item?.baseId)?.type ||
    craftItemTypes.find(([type]) => type === item?.base)?.[0] ||
    item?.base ||
    ""
  );
}
function modifiersWithoutSpecials(item) {
  const blend = beltBlendById(item?.beltBlendId),
    sequence = towerSequenceById(item?.towerSequenceId);
  let modifiers = [...(item?.modifiers || [])];
  for (const special of [
    ...(item?.beltBlendModifiers || []),
    blend?.modifier,
    sequence?.modifier,
    ...(item?.rarity === "legendary" ? item.implicitModifiers || [] : []),
  ]) {
    const index = modifiers.lastIndexOf(special);
    if (index >= 0) modifiers.splice(index, 1);
  }
  return modifiers;
}
function applyEditedModifierStructure(item, values) {
  if (
    ![
      item.implicitModifiers,
      item.baseAffixModifiers,
      item.prefixModifiers,
      item.suffixModifiers,
      item.legendaryModifiers,
    ].some(Array.isArray)
  )
    return;
  // A legendary item's base implicit is not edited (modifiersWithoutSpecials leaves it out); it keeps its lines.
  let offset = 0;
  for (const key of [
    "implicitModifiers",
    "baseAffixModifiers",
    "prefixModifiers",
    "suffixModifiers",
    "legendaryModifiers",
  ].filter((key) => !(item.rarity === "legendary" && key === "implicitModifiers"))) {
    const count = item[key]?.length || 0;
    item[key] = values.slice(offset, offset + count);
    offset += count;
  }
}
function equippedInventorySource(item) {
  const sourceId = plannerState?.equipmentOverrides?.[item?.slot]?.sourceInventoryId;
  return sourceId ? (plannerState.equipmentInventory || []).find((entry) => entry.id === sourceId) : null;
}
function itemDisplayRarity(item) {
  const displayItem = item?.rarity ? item : equippedInventorySource(item) || item;
  if (
    displayItem?.rarity === "vorax" ||
    /^Vorax Limb:/i.test(displayItem?.name || item?.name || "") ||
    /^Vorax(?: Gear| Limb:)/i.test(displayItem?.base || item?.base || "")
  )
    return "vorax";
  const normalized = (item?.name || "").replace(/ - Priceless$/i, "").toLowerCase();
  if (displayItem?.rarity === "legendary" || legendaryGearSs13.some((entry) => entry.name.toLowerCase() === normalized))
    return "legendary";
  const base = rareBaseForItem(item, [normalized, item?.base]);
  const implicitCount = base?.modifiers?.length || 0;
  const affixCount = Number.isInteger(item?.affixCount)
    ? item.affixCount
    : Math.max(0, (item?.modifiers?.length || 0) - implicitCount) + (item?.corrosionModifiers?.length || 0);
  return affixCount === 0 ? "common" : affixCount <= 2 ? "magic" : "epic";
}
function hasSixCraftAffixes(item) {
  if (["legendary", "vorax"].includes(itemDisplayRarity(item))) return false;
  const displayItem = item?.prefixModifiers || item?.suffixModifiers ? item : equippedInventorySource(item) || item;
  return (
    (displayItem?.prefixModifiers?.filter(Boolean).length || 0) === 3 &&
    (displayItem?.suffixModifiers?.filter(Boolean).length || 0) === 3
  );
}
function sixAffixClass(item) {
  return hasSixCraftAffixes(item) ? " six-affix" : "";
}
function isPricelessItem(item) {
  const namedPriceless = /(?:^|\s)-?\s*Priceless$/i.test(item?.name || "");
  const rarity = itemDisplayRarity(item);
  const level100Crafted = Number(item?.itemLevel) === 100 && !["legendary", "vorax"].includes(rarity);
  return namedPriceless || level100Crafted;
}
function pricelessClass(item) {
  return isPricelessItem(item) ? " priceless-item" : "";
}
function itemLevel100Class(item) {
  return !["vorax", "legendary"].includes(itemDisplayRarity(item)) &&
    Number(item?.itemLevel ?? equippedInventorySource(item)?.itemLevel) === 100
    ? " item-level-100"
    : "";
}
function inventoryItems() {
  const removed = new Set(plannerState.removedInventoryItemIds || []);
  return [
    ...selenaScorchingBeamGearSs13.items.map((item) => ({ ...item, id: `captured-${item.slot}`, rarity: "captured" })),
    ...(plannerState.equipmentInventory || []),
  ].filter((item) => !removed.has(item.id));
}
function equipInventoryItem(item, targetSlot = null) {
  if (!item) return;
  const slot = targetSlot || compatibleEquipmentSlot(item);
  if (!canDropGearInSlot(item, slot)) return;
  const previousSlot = equippedSlotForInventoryItem(item);
  if (previousSlot && previousSlot !== slot) disabledEquipmentSlots.add(previousSlot);
  const { id, source: sourceUrl, slot: sourceSlot, remoteIcon, ...override } = item;
  for (const [equippedSlot, equipped] of Object.entries(plannerState.equipmentOverrides || {}))
    if (equippedSlot !== slot && equipped.sourceInventoryId === id)
      delete plannerState.equipmentOverrides[equippedSlot];
  plannerState.equipmentOverrides[slot] = { ...structuredClone(override), sourceInventoryId: id };
  disabledEquipmentSlots.delete(slot);
  selectedEquipmentSlot = slot;
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(item.name)} equipped`);
}
// Gear section commands (apps/web/src/features/gear). The item dialog and the crafter stay here.
const inventoryItemById = (id) => inventoryItems().find((item) => item.id === id);
function openInventoryItemDialog(item) {
  hidePlannerTooltip();
  selectedInventoryItemId = item.id;
  inventoryItemEditing = false;
  renderInventoryItemDialog();
  $("#inventory-item-dialog").showModal();
}
function openEquipmentSlot(slot) {
  selectedEquipmentSlot = slot;
  const equippedItem = currentEquipmentImpact().allItems.find((entry) => entry.slot === slot);
  if (!equippedItem || disabledEquipmentSlots.has(slot)) {
    renderEquipment();
    return;
  }
  const sourceId = plannerState.equipmentOverrides?.[slot]?.sourceInventoryId;
  const inventoryItem =
    inventoryItemById(sourceId) ||
    inventoryItems().find((entry) => entry.slot === slot && entry.name === equippedItem.name);
  if (inventoryItem) openInventoryItemDialog(inventoryItem);
}
function unequipEquipmentSlot(slot) {
  if (disabledEquipmentSlots.has(slot)) return false;
  disabledEquipmentSlots.add(slot);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${titleCase(slot)} unequipped`);
  return true;
}
function duplicateInventoryItem(id) {
  const source = inventoryItemById(id);
  if (!source) return false;
  const copy = structuredClone(source);
  copy.id = `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  copy.name = `${copy.name} Copy`;
  plannerState.equipmentInventory.push(copy);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(source.name)} duplicated`);
  return true;
}
function resetEquipment() {
  equipmentSlots.forEach(([slot]) => disabledEquipmentSlots.add(slot));
  plannerState.equipmentOverrides = {};
  persistPlannerState();
  renderCandidateViews();
  showToast("Gear reset to empty");
}
function openEquipmentCrafter(mode) {
  editingCraftItemId = null;
  equipmentCraftMode = mode;
  selectedVoraxBaseName = "";
  selectedLegendaryIndex = -1;
  selectedLegendaryBase = "";
  selectedLegendaryBeltBlendId = "";
  selectedLegendaryTowerSequenceId = "";
  selectedCorrosionIndex = -1;
  selectedLegendaryCorrodedModifiers = new Set();
  selectedLegendaryPlaceholderChoices = new Map();
  selectedLegendaryTierChoices = new Map();
  selectedFolkloreRingOption = "left";
  equipmentSearch = "";
  renderEquipmentCrafter();
  $("#equipment-crafter").showModal();
}
// The end of a gear drag (src/app/bridge/planner-commands.js GearDrop): on another slot the item equips there; dragged
// out of a slot onto the Inventory, the slot is unequipped.
function dropGear({ itemId, fromSlot, toSlot }) {
  const item = inventoryItemById(itemId);
  if (!item) return;
  if (toSlot) {
    if (toSlot !== fromSlot) equipInventoryItem(item, toSlot);
    return;
  }
  if (!fromSlot) return;
  disabledEquipmentSlots.add(fromSlot);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(item.name)} unequipped`);
}
function editingLegendaryModifierTemplate(source, index) {
  const corroded = editingCorrodedModifierIndices.has(index),
    choice = placeholderOption(source.id, index, editingPlaceholderChoices.get(index));
  if (choice) return placeholderOptionTemplate(choice, corroded);
  if (source.id === "Folklore_of_Locking_Fingers" && index === 2)
    return folkloreRingModifier(editingFolkloreRingOption, corroded);
  const tierTemplate = corroded ? null : legendaryTierTemplate(source.id, index, editingTierChoices.get(index));
  if (tierTemplate) return tierTemplate;
  return corroded
    ? legendaryCorrodedModifiersSs13[source.id]?.[index] || source.modifiers[index]
    : source.modifiers[index];
}
// Legendary (and captured legendary) items edit their catalog lines only; base implicits and other non-catalog lines are
// found by text (src/app/legendary-editor-model.js), stay out of the controls and are kept as they are on save.
function legendaryEditorSource(item) {
  if (!item || !["legendary", "captured"].includes(item.rarity)) return null;
  return legendarySourceForItem(item, legendaryGearSs13, legendaryCorrodedModifiersSs13);
}
function inventoryLegendaryModel(item, source = legendaryEditorSource(item)) {
  return source
    ? legendaryEditorModel(item, source, {
        corrodedLines: legendaryCorrodedModifiersSs13[source.id],
        specialTexts: [
          beltBlendById(item?.beltBlendId)?.modifier,
          towerSequenceById(item?.towerSequenceId)?.modifier,
          ...(item?.beltBlendModifiers || []),
        ].filter(Boolean),
      })
    : null;
}
function editingLegendaryLineText(source, index) {
  if (editingLegendaryTexts.has(index)) return editingLegendaryTexts.get(index);
  const template = editingLegendaryModifierTemplate(source, index),
    ranges = modifierRollRanges(template);
  return ranges.length ? resolveModifierRolls(template, ranges.map(preferredModifierRoll)) : template;
}
function inventoryEditingPreview(item) {
  const source = legendaryEditorSource(item);
  if (!source) return item;
  const model = inventoryLegendaryModel(item, source);
  return {
    ...item,
    ...applyLegendaryEditorEdits(item, model, {
      texts: new Map(
        editableLegendarySlots(model, source).map((slot) => [
          slot.catalogIndex,
          editingLegendaryLineText(source, slot.catalogIndex),
        ]),
      ),
      corrodedCatalog: editingCorrodedModifierIndices,
    }),
  };
}
function renderInventoryItemDialog() {
  const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
  if (!item) return;
  $("#inventory-item-title").textContent = item.name;
  if (inventoryItemEditing) {
    $("#inventory-item-dialog").classList.add("gear-editor-dialog");
    const weaponType = itemWeaponType(item),
      sequenceEntries = towerSequencesForType(weaponType);
    $("#inventory-item-body").innerHTML =
      `<div class="gear-edit-layout"><section><div class="gear-edit-selected"><img src="${gearIcon(item)}" alt=""><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.base || titleCase(item.slot))}</small></span><button type="button" data-change-edit-item>Change</button></div><label>Name<input data-inventory-edit-name value="${escapeHtml(item.name)}"></label><div class="gear-edit-pair"><label>Item level<input type="number" min="1" max="100" data-inventory-edit-level value="${item.level || 100}"></label>${equipmentEnergyAllowed(item.slot) ? `<label>Equipment Energy<input type="number" min="0" data-inventory-edit-energy value="${item.energy || 0}"></label>` : ""}</div><label>Base item<input data-inventory-edit-base value="${escapeHtml(item.base || "")}"></label>${item.slot === "belt" ? `<label>Belt Blend<select data-edit-belt-blend>${beltBlendOptions(item.beltBlendId)}</select></label>` : ""}${sequenceEntries.length ? `<label>TOWER Sequence<select data-edit-tower-sequence>${towerSequenceOptions(weaponType, item.towerSequenceId)}</select></label>` : ""}<label>Corrosion Implicit<select data-edit-corrosion><option value="">None</option><option value="${escapeHtml((item.corrosionModifiers || []).join(" | "))}" ${(item.corrosionModifiers || []).length ? "selected" : ""}>${(item.corrosionModifiers || []).length ? escapeHtml(item.corrosionModifiers.join(" · ")) : "Corroded implicit"}</option></select></label><h3>${item.rarity === "legendary" ? "Legendary Mods" : legendaryEditorSource(item) ? "Legendary affixes" : "Prefixes and Suffixes"}</h3><div class="gear-mod-editor">${(legendaryEditorSource(item) ? editableLegendarySlots(inventoryLegendaryModel(item), legendaryEditorSource(item)).map((slot) => modifierEditorControl(item, slot.text, slot.catalogIndex)) : modifiersWithoutSpecials(item).map((modifier, index) => modifierEditorControl(item, modifier, index))).join("") || "<p>No modifiers configured.</p>"}${(item.corrosionModifiers || []).map((modifier) => `<div class="fixed-mod corrosion-affix"><b>Corroded</b><span>${escapeHtml(modifier)}</span></div>`).join("")}</div></section><aside><small>Preview</small>${equipmentPreview(inventoryEditingPreview(item))}</aside></div>`;
    $("#inventory-item-dialog footer").innerHTML =
      '<button class="button button-secondary" type="button" data-close-inventory-item>Cancel</button><button class="button" type="button" data-save-inventory-item>Save Changes</button>';
    $("#inventory-item-dialog footer").hidden = false;
  } else {
    $("#inventory-item-dialog").classList.remove("gear-editor-dialog");
    $("#inventory-item-body").innerHTML =
      `<div class="inventory-quick-actions rarity-${itemCardRarity(itemDisplayRarity(item), item)}${sixAffixClass(item)}${pricelessClass(item)}"><img src="${gearIcon(item)}" alt=""><strong>${escapeHtml(item.name)}</strong><button type="button" data-equip-selected-item>${isItemEquipped(item) ? "Unequip" : "Equip"}</button><button type="button" data-edit-inventory-item>Edit</button><button type="button" data-copy-inventory-item>Copy</button><button type="button" class="danger" data-delete-inventory-item>Delete</button></div>`;
  }
  if (!inventoryItemEditing) $("#inventory-item-dialog footer").hidden = true;
}
function equippedSlotForInventoryItem(item) {
  const overrideSlot = Object.entries(plannerState.equipmentOverrides || {}).find(
    ([slot, override]) => override.sourceInventoryId === item?.id && !disabledEquipmentSlots.has(slot),
  )?.[0];
  if (overrideSlot) return overrideSlot;
  if (item?.id?.startsWith("captured-"))
    return (
      currentEquipmentImpact().allItems.find(
        (entry) => !disabledEquipmentSlots.has(entry.slot) && entry.name === item.name && entry.slot === item.slot,
      )?.slot || null
    );
  return null;
}
function isItemEquipped(item) {
  const overrideSlot = equippedSlotForInventoryItem(item);
  if (overrideSlot) return true;
  if (item?.id && !item.id.startsWith("captured-")) return false;
  return currentEquipmentImpact().allItems.some(
    (entry) => !disabledEquipmentSlots.has(entry.slot) && entry.name === item.name && entry.slot === item.slot,
  );
}
const capturedGearIcons = {
  "Long Night Sorcerer's Robe - Priceless": "./src/assets/tli/gear/base-Long_Night_Sorcerers_Robe.webp",
  "Elder Sage Girdle - Priceless": "./src/assets/tli/gear/base-Elder_Sage_Girdle.webp",
  "Dark Gaze Scepter - Priceless": "./src/assets/tli/gear/base-Dark_Gaze_Scepter.webp",
  "Vorax Limb: Digits": "./src/assets/tli/gear/base-Vorax_Limb_Digits.webp",
};
function gearIcon(item) {
  // A rare item shows its own base's icon (by base id), so a stored icon from an older lookup cannot stick.
  const ownBase = rareBaseById(item.baseId);
  if (ownBase) return ownBase.icon;
  if (item.icon) return item.icon;
  const normalizedName = (item.name || "")
    .replace(/ - Priceless$/i, "")
    .trim()
    .toLowerCase();
  const normalizedBase = (item.base || "").trim().toLowerCase();
  return (
    capturedGearIcons[item.name] ||
    (rareBaseByName(normalizedName) || rareBaseByName(normalizedBase))?.icon ||
    legendaryGearSs13.find((entry) => entry.name.toLowerCase() === normalizedName)?.icon ||
    legendaryGearSs13.find((entry) => entry.slot === compatibleEquipmentSlot(item))?.icon ||
    legendaryGearSs13[0]?.icon ||
    ""
  );
}
function modifierRollRange(text) {
  const match = text.match(/\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}
function resolveModifierRoll(template, value) {
  return template.replace(/\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/, String(value));
}
function modifierRollRanges(text) {
  return [...text.matchAll(/\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/g)].map((match) => ({
    min: Number(match[1]),
    max: Number(match[2]),
    token: match[0],
  }));
}
function modifierRollStep(range) {
  const decimals = Math.max(String(range.min).split(".")[1]?.length || 0, String(range.max).split(".")[1]?.length || 0);
  return decimals ? 1 / 10 ** decimals : 1;
}
function preferredModifierRoll(range) {
  return range.max <= 0 ? range.min : range.max;
}
function negativeRollFill(range, value) {
  return range.max === range.min ? 100 : ((range.max - Number(value)) / (range.max - range.min)) * 100;
}
function updateNegativeRollVisual(range) {
  if (!range?.classList.contains("negative-roll-range")) return;
  const min = Number(range.min),
    max = Number(range.max);
  range.style.setProperty("--roll-fill", `${negativeRollFill({ min, max }, range.value)}%`);
}
function resolveModifierRolls(template, values) {
  let index = 0;
  return template
    .replace(/\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/g, (match, low, high, offset, whole) => {
      const value = String(values[index++]);
      /* a clause-leading range that spans zero ("(-1–1) Main Skill Level") carries no sign of its own: a positive roll is written "+N" so the signed readers see it */ return Number(
        low,
      ) <= 0 &&
        Number(value) > 0 &&
        !/^[+-]/.test(value) &&
        (offset === 0 || /\n\s*$/.test(whole.slice(0, offset)))
        ? `+${value}`
        : value;
    })
    .replace(/(\d)\s+%/g, "$1%");
}
function modifierSignature(text) {
  return legendaryModifierSignature(text);
}
function legendaryKnownModifierSignatures(source) {
  const options =
    source.id === "Folklore_of_Locking_Fingers"
      ? [
          folkloreRingModifier("left"),
          folkloreRingModifier("right"),
          folkloreRingModifier("left", true),
          folkloreRingModifier("right", true),
        ]
      : [];
  return new Set(
    [
      ...source.modifiers,
      ...(legendaryCorrodedModifiersSs13[source.id] || []),
      ...options,
      ...allPlaceholderTemplates(source.id),
    ].map(modifierSignature),
  );
}
function resolvedRollValues(template, resolved) {
  const range = /\((-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\)/g,
    escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
    parts = [];
  let cursor = 0,
    match;
  while ((match = range.exec(template))) {
    parts.push(escape(template.slice(cursor, match.index)), "(-?\\d+(?:\\.\\d+)?)");
    cursor = match.index + match[0].length;
  }
  const result = String(resolved || "").match(new RegExp(`^${parts.join("")}${escape(template.slice(cursor))}$`, "i"));
  return result ? result.slice(1).map(Number) : [];
}
function tierMatchesResolved(tier, resolved) {
  const ranges = modifierRollRanges(tier.template);
  if (!ranges.length)
    return (
      String(tier.template).replace(/\s+/g, " ").trim().toLowerCase() ===
      String(resolved).replace(/\s+/g, " ").trim().toLowerCase()
    );
  const values = resolvedRollValues(tier.template, resolved);
  return (
    modifierSignature(tier.template) === modifierSignature(resolved) &&
    values.length === ranges.length &&
    values.every((value, index) => Number.isFinite(value) && value >= ranges[index].min && value <= ranges[index].max)
  );
}
function legendaryModifierTemplate(item, index, corroded = selectedLegendaryCorrodedModifiers.has(index)) {
  const choice = placeholderOption(item.id, index, selectedLegendaryPlaceholderChoices.get(index));
  if (choice) return placeholderOptionTemplate(choice, corroded);
  if (item.id === "Folklore_of_Locking_Fingers" && index === 2)
    return folkloreRingModifier(selectedFolkloreRingOption, corroded);
  const tierTemplate = corroded ? null : legendaryTierTemplate(item.id, index, selectedLegendaryTierChoices.get(index));
  if (tierTemplate) return tierTemplate;
  return corroded ? legendaryCorrodedModifiersSs13[item.id]?.[index] || item.modifiers[index] : item.modifiers[index];
}
function configuredLegendaryModifiers() {
  const selected = legendaryGearSs13[selectedLegendaryIndex];
  if (!selected) return [];
  return selected.modifiers.map((_, index) => {
    const template = legendaryModifierTemplate(selected, index),
      sliders = [...document.querySelectorAll(`[data-legendary-roll="${index}"]`)];
    return sliders.length
      ? resolveModifierRolls(
          template,
          sliders.map((slider) => slider.value),
        )
      : template;
  });
}
function configuredLegendaryModifiersWithSpecials() {
  const blend = beltBlendById(selectedLegendaryBeltBlendId),
    sequence = towerSequenceById(selectedLegendaryTowerSequenceId);
  return [
    ...configuredLegendaryModifiers(),
    ...(blend ? [blend.modifier] : []),
    ...(sequence ? [sequence.modifier] : []),
  ];
}
function maxRolledLegendaryModifiers(item) {
  return item.modifiers.map((_, index) => {
    const template = legendaryModifierTemplate(item, index),
      ranges = modifierRollRanges(template);
    return ranges.length ? resolveModifierRolls(template, ranges.map(preferredModifierRoll)) : template;
  });
}
function affixRollInputs(range, attributes, current) {
  const value = Number.isFinite(current) ? current : preferredModifierRoll(range),
    negativeOnly = range.max <= 0,
    fill = negativeRollFill(range, value);
  return `<span class="affix-roll-inputs${negativeOnly ? " negative-roll" : ""}"><input type="range" class="${negativeOnly ? "negative-roll-range" : ""}" min="${range.min}" max="${range.max}" step="${modifierRollStep(range)}" value="${value}" style="${negativeOnly ? `--roll-fill:${fill}%` : ""}" ${attributes}><input class="affix-roll-number" type="number" min="${range.min}" max="${range.max}" step="${modifierRollStep(range)}" value="${value}" data-affix-roll-number></span><em>${value}</em>`;
}
// A modifier line as HTML. A keyword roll (Pantheon's Elegy's Dirges) or a named gear affix (Wield My Sword, src/engine/text/named-gear-affixes.js)
// shows its keyword in the revived-memory keyword style; holding Alt (body.revival-alt-held, setRevivalAltDetails) expands it into its effect lines, each with its own badge when `lineStatus` (line -> status) is given, else inline "Keyword: effect". Other lines are plain text.
function modifierTextMarkup(text, lineStatus = null) {
  const clean = String(text ?? "").replace(/(\d)\s+%/g, "$1%"),
    parts = keywordRollParts(clean);
  if (!parts) return escapeHtml(clean);
  const effect = lineStatus
    ? `<span class="keyword-roll-effect keyword-roll-lines">${parts.effect
        .map((line, lineIndex) => {
          const fixed = parts.statuses?.[lineIndex],
            status = fixed?.status || lineStatus(line);
          return `<span class="keyword-roll-line"><span>${escapeHtml(line)}</span><b class="${status === "In calc" ? "calculated" : neutralStatuses.has(status) ? "neutral" : "pending"}"${fullTextTitle(fixed?.reason)}>${escapeHtml(status)}</b></span>`;
        })
        .join("")}</span>`
    : `<span class="keyword-roll-effect">${parts.inline ? ` · ${escapeHtml(parts.keyword)}` : ""}: ${escapeHtml(parts.effect.join("\n"))}</span>`;
  if (parts.inline)
    return `<span class="keyword-roll">${escapeHtml(parts.inline.before)}<span class="keyword-roll-name">${escapeHtml(parts.keyword)}</span>${escapeHtml(parts.inline.after)}${effect}</span>`;
  return `<span class="keyword-roll"><span class="keyword-roll-name">${escapeHtml(parts.keyword)}</span>${effect}</span>${parts.rest.map((line) => `\n${escapeHtml(line)}`).join("")}`;
}
// A dropdown of the rolls a "<Random …>" placeholder line can take; empty when the line is not a resolved placeholder.
// A tier dropdown for a tiered legendary line (src/engine/gear/legendary-affix-tiers.js, e.g. Ice Pulse's Spell Damage); it sets the line's
// roll range. Empty for every other line, and while the line is corroded (the corroded form has its own range).
function legendaryTierControl(sourceId, index, chosen, corroded, attribute) {
  const tiers = legendaryLineTiers(sourceId, index);
  if (!tiers || corroded) return "";
  const current = tiers.some((entry) => entry.tier === Number(chosen)) ? Number(chosen) : tiers[0].tier;
  return `<label class="legendary-ring-choice">Tier<select ${attribute}="${index}">${tiers.map((entry) => `<option value="${entry.tier}" ${entry.tier === current ? "selected" : ""}>T${entry.tier} · ${escapeHtml(entry.text.replace(/(\d|\))\s+%/g, "$1%"))}</option>`).join("")}</select></label>`;
}
function placeholderChoiceControl(sourceId, index, chosen, attribute) {
  const pool = placeholderPool(sourceId, index);
  if (!pool) return "";
  return `<label class="legendary-ring-choice">Random roll<select ${attribute}="${index}"><option value="">Not chosen · ${escapeHtml(pool.placeholder)}</option>${pool.options.map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === chosen ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`;
}
function legendaryModifierControl(item, index) {
  const corroded = selectedLegendaryCorrodedModifiers.has(index),
    template = legendaryModifierTemplate(item, index, corroded),
    ranges = modifierRollRanges(template),
    values = ranges.map(preferredModifierRoll),
    resolved = ranges.length ? resolveModifierRolls(template, values) : template;
  const ringChoice =
    item.id === "Folklore_of_Locking_Fingers" && index === 2
      ? `<label class="legendary-ring-choice">Ring effect<select data-legendary-ring-option><option value="left" ${selectedFolkloreRingOption === "left" ? "selected" : ""}>Left Ring · regain Blur</option><option value="right" ${selectedFolkloreRingOption === "right" ? "selected" : ""}>Right Ring · gain Blur Rating</option></select></label>`
      : "";
  return `<div class="legendary-mod-control ${corroded ? "corrosion-affix" : ""}"><span><button type="button" data-toggle-legendary-corrosion="${index}" ${legendaryCorrodedModifiersSs13[item.id]?.[index] ? "" : "disabled"}>${corroded ? "Corroded" : "Normal"}</button><span data-legendary-mod="${index}">${modifierTextMarkup(resolved)}</span></span>${ringChoice}${placeholderChoiceControl(item.id, index, selectedLegendaryPlaceholderChoices.get(index), "data-legendary-placeholder")}${legendaryTierControl(item.id, index, selectedLegendaryTierChoices.get(index), corroded, "data-legendary-tier")}${ranges.map((range, rangeIndex) => `<label>${affixRollInputs(range, `data-legendary-roll="${index}" data-range-index="${rangeIndex}"`)}</label>`).join("")}</div>`;
}
function interpolateCorrosionRoll(entry, percent = 100) {
  if (entry.min === entry.max) return entry.min;
  const lows = [...entry.min.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0])),
    highs = [...entry.max.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  let i = 0;
  return entry.min.replace(/-?\d+(?:\.\d+)?/g, (raw) => {
    const lo = Number(raw),
      hi = highs[i] ?? lo;
    i += 1;
    const value = lo + (hi - lo) * (Number(percent) / 100);
    return Number.isInteger(lo) && Number.isInteger(hi)
      ? String(Math.round(value))
      : String(Math.round(value * 10) / 10);
  });
}
function configuredCorrosionModifier() {
  const entry = corrosionImplicitsForBase(selectedLegendaryBase)[selectedCorrosionIndex];
  if (!entry) return "";
  return interpolateCorrosionRoll(entry, $("[data-corrosion-roll]")?.value ?? 100);
}
function modifierEditorControl(item, modifier, index) {
  const source =
    legendaryEditorSource(item) ||
    legendaryGearSs13.find(
      (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
    );
  if (legendaryEditorSource(item)) {
    const corroded = editingCorrodedModifierIndices.has(index),
      template = editingLegendaryModifierTemplate(source, index),
      ranges = modifierRollRanges(template),
      resolved = editingLegendaryLineText(source, index),
      values = rollValuesFromText(template, resolved) || ranges.map(preferredModifierRoll),
      ringChoice =
        source.id === "Folklore_of_Locking_Fingers" && index === 2
          ? `<label class="legendary-ring-choice">Ring effect<select data-edit-legendary-ring-option><option value="left" ${editingFolkloreRingOption === "left" ? "selected" : ""}>Left Ring · regain Blur</option><option value="right" ${editingFolkloreRingOption === "right" ? "selected" : ""}>Right Ring · gain Blur Rating</option></select></label>`
          : "";
    return `<div class="legendary-mod-control ${corroded ? "corrosion-affix" : ""}"><span><button type="button" data-toggle-edit-corrosion="${index}" ${legendaryCorrodedModifiersSs13[source.id]?.[index] ? "" : "disabled"}>${corroded ? "Corroded" : "Normal"}</button><span data-edit-modifier-text="${index}">${modifierTextMarkup(resolved)}</span><input type="hidden" data-edit-modifier="${index}" value="${escapeHtml(resolved)}"></span>${ringChoice}${placeholderChoiceControl(source.id, index, editingPlaceholderChoices.get(index), "data-edit-legendary-placeholder")}${legendaryTierControl(source.id, index, editingTierChoices.get(index), corroded, "data-edit-legendary-tier")}${ranges.map((range, rangeIndex) => `<label>${affixRollInputs(range, `data-edit-legendary-roll="${index}" data-range-index="${rangeIndex}"`, values[rangeIndex])}</label>`).join("")}</div>`;
  }
  const range = modifierRollRange(source?.modifiers?.[index] || modifier);
  if (!range)
    return `<div class="fixed-mod"><b>Normal</b><input data-edit-modifier="${index}" value="${escapeHtml(modifier)}"></div>`;
  const value = Math.min(range.max, Math.max(range.min, Number(modifier.match(/-?\d+(?:\.\d+)?/)?.[0]) || range.max));
  return `<label><span><b>Normal</b><input data-edit-modifier="${index}" value="${escapeHtml(modifier)}"></span><span class="affix-roll-inputs"><input type="range" min="${range.min}" max="${range.max}" step="${modifierRollStep(range)}" value="${value}" data-modifier-roll><input class="affix-roll-number" type="number" min="${range.min}" max="${range.max}" step="${modifierRollStep(range)}" value="${value}" data-affix-roll-number></span><em>${range.min}–${range.max}</em></label>`;
}
function itemModifierSections(item) {
  const modifiers = item.modifiers || [],
    used = new Set(),
    entries = (values, tone = "", badges = []) =>
      (values || []).map((text, position) => {
        const index = modifiers.findIndex((value, i) => value === text && !used.has(i));
        if (index >= 0) used.add(index);
        return { text, index, tone, badge: badges[position] || "" };
      });
  const base = rareBaseForItem(item, [item.base]);
  const corrodedBase = (item.corrosionModifiers || []).length > 0,
    normalImplicit = item.implicitModifiers ?? base?.modifiers ?? [],
    implicit = corrodedBase ? [] : normalImplicit;
  if (corrodedBase) entries(normalImplicit);
  const blend = beltBlendById(item.beltBlendId),
    blendModifiers = blend ? [blend.modifier] : item.beltBlendModifiers || [],
    sequence = towerSequenceById(item.towerSequenceId);
  const baseBadges = (item.baseAffixModifiers || [])
    .map(
      (resolved, position) =>
        item.baseAffixTierIds?.[position] ||
        Object.entries(baseAffixTiersSs13[item.base] || {}).find(
          ([template]) => modifierSignature(template) === modifierSignature(resolved),
        )?.[1] ||
        "",
    )
    .map((tier) => (tier ? `T${tier}` : ""));
  const craftedEntries = (values, offset) => {
    let position = 0;
    return [0, 1, 2].flatMap((slot) => {
      const index = offset + slot,
        familyId = item.craftAffixFamilyIds?.[index];
      if (!familyId) return [];
      const text = values?.[position++];
      if (!text) return [];
      const legendary = Boolean(item.craftAffixLegendary?.[index]),
        badge = legendary ? "L" : item.craftAffixTierIds?.[index] ? `T${item.craftAffixTierIds[index]}` : "";
      return entries([text], legendary ? "legendary" : "", [badge]);
    });
  };
  const inferredBadges = (values, side) =>
    (values || []).map((resolved) => {
      for (const family of (item.rarity === "vorax"
        ? voraxCraftingSs13.affixes[item.base]
        : craftAffixesSs13[item.base])?.[side] || []) {
        const tier = family.tiers.find((candidate) => tierMatchesResolved(candidate, resolved));
        if (tier) return `T${tier.tier}`;
      }
      return "";
    });
  const prefixEntries = item.craftAffixFamilyIds?.length
    ? craftedEntries(item.prefixModifiers, 0)
    : entries(item.prefixModifiers, "", inferredBadges(item.prefixModifiers, "prefix"));
  const suffixEntries = item.craftAffixFamilyIds?.length
    ? craftedEntries(item.suffixModifiers, 3)
    : entries(item.suffixModifiers, "", inferredBadges(item.suffixModifiers, "suffix"));
  const sections = [
    {
      label: corrodedBase ? "Implicit · Corroded" : "Implicit",
      detail: base?.name || item.base || titleCase(item.slot),
      entries: [
        ...entries(implicit),
        ...(item.corrosionModifiers || []).map((text) => ({ text, index: -1, tone: "corrosion" })),
      ],
    },
    { label: "Base Affix", entries: entries(item.baseAffixModifiers, "", baseBadges) },
    { label: "Belt Blend", detail: blend?.label || "", entries: entries(blendModifiers) },
    {
      label: "TOWER Sequence",
      detail: sequence ? `${sequence.grade} · ${sequence.sequence}` : "",
      entries: entries(sequence ? [sequence.modifier] : []),
    },
    { label: "Prefix", entries: prefixEntries },
    { label: "Suffix", entries: suffixEntries },
    { label: "Legendary Mod", entries: entries(item.legendaryModifiers) },
  ];
  const legendarySource = legendaryGearSs13.find(
    (entry) => entry.name.toLowerCase() === (item.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
  );
  const structuredLegendarySignatures =
    item.legendaryModifiers?.length && legendarySource ? legendaryKnownModifierSignatures(legendarySource) : new Set();
  const remainder = modifiers
    .map((text, index) => ({ text, index }))
    .filter((entry) => !used.has(entry.index) && !structuredLegendarySignatures.has(modifierSignature(entry.text)));
  if (remainder.length) {
    if (itemDisplayRarity(item) === "legendary") sections.push({ label: "Legendary Mod", entries: remainder });
    else {
      const prefixSection = sections.find((section) => section.label === "Prefix"),
        suffixSection = sections.find((section) => section.label === "Suffix");
      const prefixCount = Math.min(3, Math.ceil(remainder.length / 2));
      prefixSection.entries.push(...remainder.slice(0, prefixCount));
      suffixSection.entries.push(...remainder.slice(prefixCount));
    }
  }
  return sections.filter((section) => section.entries.length);
}
function affixTierBadge(badge) {
  if (!badge) return "";
  const key = badge.toLowerCase().replace("+", "plus");
  return `<i class="affix-tier-badge tier-${escapeHtml(key)}">${escapeHtml(badge)}</i>`;
}
function previewModifierSections(item) {
  const corroded = new Set(item.corrodedModifierIndices || []);
  return itemModifierSections(item)
    .map(
      (section) =>
        `<section class="item-mod-section"><h4>${escapeHtml(section.label)}${section.detail ? `<small>${escapeHtml(section.detail)}</small>` : ""}</h4>${section.entries.length ? `<ul>${section.entries.map((entry) => `<li class="${entry.tone === "legendary" || entry.badge === "L" ? "legendary-affix " : ""}${entry.tone === "corrosion" || corroded.has(entry.index) ? "corrosion-affix" : ""}">${affixTierBadge(entry.badge)}<span>${modifierTextMarkup(entry.text)}</span></li>`).join("")}</ul>` : ""}</section>`,
    )
    .join("");
}
function equipmentPreview(item) {
  const rarity = itemDisplayRarity(item),
    rarityLabel = rarity === "vorax" ? "VORAX GEAR" : rarity.toUpperCase();
  return `<article class="equipment-preview rarity-${itemCardRarity(rarity, item)}${sixAffixClass(item)}${pricelessClass(item)}${itemLevel100Class(item)}"><img src="${gearIcon(item)}" alt=""><p>${rarityLabel}</p><h3>${escapeHtml(item.name)}</h3><small>${escapeHtml(item.base || titleCase(item.slot))} · Require Lv.${item.level || 1}</small><div class="item-mod-sections">${previewModifierSections(item) || "<p>Configure affixes to preview this item.</p>"}</div>${item.source ? `<a href="${item.source}" target="_blank" rel="noreferrer">Open TLIDB source</a>` : ""}</article>`;
}
function voraxModifierLabel(template) {
  return template
    .replace(/\((-?\d+(?:\.\d+)?)\s*–\s*(-?\d+(?:\.\d+)?)\)/g, (_, minimum, maximum) =>
      Number(minimum) < 0 && Number(maximum) < 0 ? "-#" : "#",
    )
    .replace(/(-?)\d+(?:\.\d+)?/g, "$1#");
}
function voraxLegendaryAffixPool(type) {
  return (voraxCraftingSs13.legendaryDonors[type] || []).flatMap((donor) =>
    donor.modifiers.map((template, modifierIndex) => ({
      id: `${donor.id}-mod-${modifierIndex}`,
      label: `[${donor.name}] ${voraxModifierLabel(template)}`,
      library: "Legendary",
      donor: donor.name,
      tiers: [{ tier: "L", level: donor.level || 1, template }],
    })),
  );
}
function isVoraxLegendaryAffix(body, index) {
  return body?.querySelector(`[data-toggle-vorax-legendary="${index}"]`)?.dataset.legendaryActive === "true";
}
function craftAffixPool(type, index, body = $("#equipment-crafter-body")) {
  if (equipmentCraftMode === "vorax" && isVoraxLegendaryAffix(body, index)) return voraxLegendaryAffixPool(type);
  return (
    (equipmentCraftMode === "vorax" ? voraxCraftingSs13.affixes[type] : craftAffixesSs13[type])?.[
      index < 3 ? "prefix" : "suffix"
    ] || []
  );
}
function craftAffixFamilyOptions(type, index) {
  return `<option value="">None</option>${craftAffixPool(type, index)
    .map((family) => `<option value="${escapeHtml(family.id)}">${escapeHtml(family.label)}</option>`)
    .join("")}`;
}
function craftAffixControl(label, index, type) {
  return `<div class="craft-affix-control"><span>${equipmentCraftMode === "vorax" ? `<button type="button" class="vorax-legendary-toggle" data-toggle-vorax-legendary="${index}" data-legendary-active="false" aria-pressed="false" title="Use a Legendary item affix in this slot"><b>L</b><i></i></button>` : ""}<span>${label}</span></span><select data-craft-affix-family="${index}">${craftAffixFamilyOptions(type, index)}</select><div class="craft-affix-config" data-craft-affix-config="${index}"></div></div>`;
}
function craftAffixFamily(body, index) {
  const type = body.querySelector("[data-craft-type]")?.value,
    id = body.querySelector(`[data-craft-affix-family="${index}"]`)?.value;
  return craftAffixPool(type, index).find((family) => family.id === id);
}
function eligibleCraftAffixTiers(body, family) {
  const itemLevel = Number(body.querySelector("[data-craft-level]")?.value) || 100;
  return (family?.tiers || []).filter((tier) => tier.level <= itemLevel);
}
function craftAffixRollControls(index, tier) {
  return modifierRollRanges(tier?.template || "")
    .map(
      (range, rangeIndex) =>
        `<label>${affixRollInputs(range, `data-craft-affix-roll="${index}" data-range-index="${rangeIndex}"`)}</label>`,
    )
    .join("");
}
function updateCraftAffixConfig(index, preferredTier = "") {
  const body = $("#equipment-crafter-body"),
    family = craftAffixFamily(body, index),
    config = body?.querySelector(`[data-craft-affix-config="${index}"]`);
  if (!config) return;
  const tiers = eligibleCraftAffixTiers(body, family);
  if (!family) {
    config.innerHTML = "";
    return;
  }
  if (!tiers.length) {
    config.innerHTML = '<small class="affix-level-warning">No tiers available at this item level.</small>';
    return;
  }
  const selected =
    tiers.find((tier) => tier.tier === preferredTier) || tiers.find((tier) => tier.tier === "1") || tiers[0];
  config.innerHTML = `${isVoraxLegendaryAffix(body, index) ? "" : `<label class="craft-tier-select">Tier<select data-craft-affix-tier="${index}">${tiers.map((tier) => `<option value="${escapeHtml(tier.tier)}" ${tier === selected ? "selected" : ""}>T${escapeHtml(tier.tier)} · Requires Lv.${tier.level}</option>`).join("")}</select></label>`}<div class="craft-tier-rolls" data-craft-affix-rolls="${index}">${craftAffixRollControls(index, selected)}</div>`;
}
function configuredCraftAffixes(body, indices = [0, 1, 2, 3, 4, 5]) {
  return [...body.querySelectorAll("[data-craft-affix-family]")]
    .filter((select) => indices.includes(Number(select.dataset.craftAffixFamily)))
    .map((select) => {
      const index = Number(select.dataset.craftAffixFamily),
        family = craftAffixFamily(body, index),
        tierValue = body.querySelector(`[data-craft-affix-tier="${index}"]`)?.value,
        tier = isVoraxLegendaryAffix(body, index)
          ? family?.tiers[0]
          : family?.tiers.find((entry) => entry.tier === tierValue);
      if (!tier) return "";
      const sliders = [...body.querySelectorAll(`[data-craft-affix-roll="${index}"]`)];
      return sliders.length
        ? resolveModifierRolls(
            tier.template,
            sliders.map((slider) => slider.value),
          )
        : tier.template;
    })
    .filter(Boolean);
}
function towerSequenceAllowed(type) {
  return towerSequencesForType(type).length > 0;
}
function rareBasesForType(type) {
  return rareBaseItemsSs13
    .filter((entry) => entry.type === type && !isLegacyRareBase(entry))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}
function rareBaseOptions(type) {
  return rareBasesForType(type)
    .map((entry) => `<option value="${escapeHtml(entry.id)}">Lv ${entry.level} · ${escapeHtml(entry.name)}</option>`)
    .join("");
}
function baseAffixOptions(type) {
  return `<option value="">None</option>${(baseAffixesSs13[type] || []).map((affix) => `<option value="${escapeHtml(affix)}" data-tier="${escapeHtml(baseAffixTiersSs13[type]?.[affix] || "")}">${escapeHtml(affix.replaceAll("\n", " / "))}</option>`).join("")}`;
}
function voraxBaseAffixOptions(type, slot) {
  const pool = voraxBaseAffixSlotPool(type, slot);
  return `<option value="">None</option>${pool.map((affix) => `<option value="${escapeHtml(affix.modifier)}" data-tier="${escapeHtml(affix.tier)}">T${escapeHtml(affix.tier)} · ${escapeHtml(affix.modifier.replaceAll("\n", " / "))}</option>`).join("")}`;
}
function baseAffixRollControls(index, template) {
  const ranges = modifierRollRanges(template);
  return ranges
    .map(
      (range, rangeIndex) =>
        `<label class="base-affix-roll">${affixRollInputs(range, `data-base-affix-roll="${index}" data-range-index="${rangeIndex}"`)}</label>`,
    )
    .join("");
}
function configuredBaseAffixes(body) {
  return [...body.querySelectorAll("[data-craft-base-affix]")]
    .map((select, index) => {
      const template = select.value.trim();
      if (!template) return "";
      const sliders = [...body.querySelectorAll(`[data-base-affix-roll="${index}"]`)];
      return sliders.length
        ? resolveModifierRolls(
            template,
            sliders.map((slider) => slider.value),
          )
        : template;
    })
    .filter(Boolean);
}
function definedItemFields(item) {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}
function currentCraftPreview() {
  const body = $("#equipment-crafter-body"),
    type = body?.querySelector("[data-craft-type]");
  if (!type) return null;
  const selected = type.selectedOptions[0],
    baseAffixModifiers = configuredBaseAffixes(body),
    prefixModifiers = configuredCraftAffixes(body, [0, 1, 2]),
    suffixModifiers = configuredCraftAffixes(body, [3, 4, 5]),
    modifiers = [...baseAffixModifiers, ...prefixModifiers, ...suffixModifiers];
  const baseAffixTierIds = [...body.querySelectorAll("[data-craft-base-affix]")].map((select) =>
    select.value ? select.selectedOptions[0]?.dataset.tier || "" : "",
  );
  const craftAffixFamilyIds = [0, 1, 2, 3, 4, 5].map(
    (index) => body.querySelector(`[data-craft-affix-family="${index}"]`)?.value || "",
  );
  const craftAffixTierIds = [0, 1, 2, 3, 4, 5].map((index) =>
    isVoraxLegendaryAffix(body, index) ? "L" : body.querySelector(`[data-craft-affix-tier="${index}"]`)?.value || "",
  );
  const craftAffixLegendary = [0, 1, 2, 3, 4, 5].map((index) => isVoraxLegendaryAffix(body, index));
  const baseEntry =
    equipmentCraftMode === "rare"
      ? rareBaseItemsSs13.find((entry) => entry.id === body.querySelector("[data-craft-base]")?.value)
      : equipmentCraftMode === "vorax"
        ? voraxCraftingSs13.bases.find((entry) => entry.name === type.value)
        : null;
  const slot = baseEntry?.slot || selected.dataset.slot;
  const blend = slot === "belt" ? selectedBeltBlend(body) : null;
  if (blend) modifiers.push(blend.modifier);
  const sequence = towerSequenceById(body.querySelector("[data-craft-sequence]")?.value);
  if (sequence) modifiers.push(sequence.modifier);
  return definedItemFields({
    name:
      body.querySelector("[data-craft-name]")?.value.trim() ||
      baseEntry?.name ||
      body.querySelector("[data-craft-base]")?.selectedOptions?.[0]?.textContent ||
      `${equipmentCraftMode === "vorax" ? "Crafted" : "Rare"} ${type.value}`,
    base: type.value,
    baseId: baseEntry?.id,
    beltBlendId: blend?.id,
    towerSequenceId: sequence?.id,
    implicitModifiers: [...(baseEntry?.modifiers || [])],
    baseAffixModifiers,
    baseAffixTierIds,
    prefixModifiers,
    suffixModifiers,
    craftAffixFamilyIds,
    craftAffixTierIds,
    craftAffixLegendary,
    slot,
    level: baseEntry?.level || Number(body.querySelector("[data-craft-level]")?.value) || 100,
    itemLevel: Number(body.querySelector("[data-craft-level]")?.value) || 100,
    energy: equipmentEnergyAllowed(slot) ? Number(body.querySelector("[data-craft-energy]")?.value) || 0 : 0,
    icon: baseEntry?.icon,
    source: baseEntry?.source,
    modifiers: [...(baseEntry?.modifiers || []), ...modifiers],
    affixCount: modifiers.length,
    defenses: {},
    rarity: equipmentCraftMode,
  });
}
function updateCraftPreview() {
  const item = currentCraftPreview();
  if (item && $("#crafted-equipment-preview"))
    $("#crafted-equipment-preview").innerHTML = `<small>Preview</small>${equipmentPreview(item)}`;
}
function renderEquipmentCrafter() {
  const body = $("#equipment-crafter-body");
  $("#equipment-crafter-title").textContent =
    equipmentCraftMode === "legendary"
      ? "Craft Legendary"
      : equipmentCraftMode === "vorax"
        ? "Craft Vorax Item"
        : "Craft Rare Item";
  if (equipmentCraftMode === "vorax" && !selectedVoraxBaseName) {
    body.innerHTML = `<div class="vorax-select-layout"><section><small>Select Limb</small><div class="vorax-base-grid">${voraxCraftingSs13.bases.map((base) => `<button type="button" data-select-vorax-base="${escapeHtml(base.name)}"><img src="${escapeHtml(base.icon)}" alt=""><span>${escapeHtml(base.label)}</span></button>`).join("")}</div></section><aside><small>Preview</small><div class="vorax-empty-preview">Select options to preview item</div></aside></div>`;
    return;
  }
  if (equipmentCraftMode === "legendary") {
    const entries = legendaryGearSs13.filter(
      (entry) =>
        !equipmentSearch ||
        `${entry.name} ${entry.modifiers.join(" ")}`.toLowerCase().includes(equipmentSearch.toLowerCase()),
    );
    const selected = legendaryGearSs13[selectedLegendaryIndex];
    const baseOptions = selected ? baseTypesForSlot(selected.slot) : [],
      corrosionPool = selected ? corrosionImplicitsForBase(selectedLegendaryBase) : [],
      corrosion = corrosionPool[selectedCorrosionIndex],
      corrosionText = corrosion ? interpolateCorrosionRoll(corrosion, 100) : "";
    const initialSequence = towerSequenceById(selectedLegendaryTowerSequenceId);
    body.innerHTML = selected
      ? `<div class="legendary-config-layout"><section><div class="gear-edit-selected"><img src="${selected.icon}" alt=""><span><strong>${escapeHtml(selected.name)}</strong><small>${titleCase(selected.slot)}</small></span><button type="button" data-change-legendary>Change</button></div><label>Base<select data-legendary-base>${baseOptions.map((base) => `<option value="${escapeHtml(base)}" ${base === selectedLegendaryBase ? "selected" : ""}>${escapeHtml(base)}</option>`).join("")}</select></label>${selected.slot === "belt" ? `<label>Belt Blend<select data-legendary-belt-blend>${beltBlendOptions(selectedLegendaryBeltBlendId)}</select></label>` : ""}${equipmentEnergyAllowed(selected.slot) ? `<label>Equipment Energy<input data-legendary-energy type="number" min="0" value="${maxEquipmentEnergy(100, selected.slot, selectedLegendaryBase)}"></label>` : ""}${towerSequenceAllowed(selectedLegendaryBase) ? `<label>TOWER Sequence<select data-legendary-tower-sequence>${towerSequenceOptions(selectedLegendaryBase, selectedLegendaryTowerSequenceId)}</select></label>` : ""}<label>Corrosion Implicit<select data-legendary-corrosion><option value="-1">None</option>${corrosionPool.map((entry, index) => `<option value="${index}" ${index === selectedCorrosionIndex ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}</select></label>${corrosion ? `<div class="fixed-mod corrosion-affix"><b>Corroded</b><span data-corrosion-text>${escapeHtml(corrosionText)}</span>${corrosion.min !== corrosion.max ? `<input type="range" min="0" max="100" value="100" data-corrosion-roll>` : ""}</div>` : ""}<h3>Legendary Mods</h3><div class="gear-mod-editor">${selected.modifiers.map((_, index) => legendaryModifierControl(selected, index)).join("")}</div></section><aside id="legendary-config-preview"><small>Preview</small>${equipmentPreview({ ...selected, base: selectedLegendaryBase, corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers], modifiers: [...maxRolledLegendaryModifiers(selected), ...(beltBlendById(selectedLegendaryBeltBlendId) ? [beltBlendById(selectedLegendaryBeltBlendId).modifier] : []), ...(initialSequence ? [initialSequence.modifier] : [])], corrosionModifiers: corrosionText ? [corrosionText] : [] })}</aside></div>`
      : `<div class="legendary-craft-layout"><section><label class="gear-search">⌕<input type="search" data-legendary-search value="${escapeHtml(equipmentSearch)}" placeholder="Search legendary or @Mod…"></label><div class="legendary-results">${entries
          .slice(0, 120)
          .map(
            (entry) =>
              `<button type="button" class="legendary-choice" data-legendary-id="${entry.id}"><img src="${entry.icon}" alt=""><span><strong>${escapeHtml(entry.name)}</strong><small>${titleCase(entry.slot)} · Lv.${entry.level}</small></span></button>`,
          )
          .join(
            "",
          )}</div><small>${entries.length} legendary gear available${entries.length > 120 ? " · refine the search to see more" : ""}</small></section><aside><p>Select a legendary item to configure it.</p></aside></div>`;
  } else {
    const types =
      equipmentCraftMode === "vorax"
        ? voraxItemTypes.filter(([name]) => name === selectedVoraxBaseName)
        : craftItemTypes;
    const initialBases =
      equipmentCraftMode === "rare"
        ? rareBaseOptions(types[0][0])
        : `<option value="${escapeHtml(types[0][0])}">${escapeHtml(types[0][0])}</option>`;
    const initialBase =
      equipmentCraftMode === "rare"
        ? rareBasesForType(types[0][0])[0]
        : equipmentCraftMode === "vorax"
          ? voraxCraftingSs13.bases.find((entry) => entry.name === types[0][0])
          : null;
    body.innerHTML = `<div class="rare-craft-layout detailed-crafter"><section><div class="craft-name-level"><label>Name<input data-craft-name placeholder="Custom name (optional)"></label><label>Item Level<input data-craft-level type="number" min="1" max="100" value="100"></label></div><label>Item Type<select data-craft-type>${types.map(([name, slot]) => `<option value="${escapeHtml(name)}" data-slot="${slot}">${escapeHtml(name)}</option>`).join("")}</select></label><label>Base Item<select data-craft-base>${initialBases}</select></label><label data-belt-blend-field ${types[0][1] === "belt" ? "" : "hidden"}>Belt Blend<select data-craft-belt-blend>${beltBlendOptions()}</select></label><div class="base-affix-control"><label>Base Affix 1<select data-craft-base-affix="0">${equipmentCraftMode === "rare" ? baseAffixOptions(types[0][0]) : voraxBaseAffixOptions(types[0][0], 0)}</select></label><div class="base-affix-rolls" data-base-affix-rolls="0"></div></div><div class="base-affix-control"><label>Base Affix 2<select data-craft-base-affix="1">${equipmentCraftMode === "rare" ? baseAffixOptions(types[0][0]) : voraxBaseAffixOptions(types[0][0], 1)}</select></label><div class="base-affix-rolls" data-base-affix-rolls="1"></div></div><label>Corrosion Implicit<select><option>None</option><option>Corroded implicit</option></select></label><div class="craft-energy-row"><label data-equipment-energy-field ${equipmentEnergyAllowed(types[0][1]) ? "" : "hidden"}>Equipment Energy<input data-craft-energy type="number" min="0" value="${maxEquipmentEnergy(100, types[0][1], types[0][0])}"></label><label data-tower-sequence-field ${towerSequenceAllowed(types[0][0]) ? "" : "hidden"}>TOWER Sequence<select data-craft-sequence>${towerSequenceOptions(types[0][0])}</select></label></div><h3>${equipmentCraftMode === "vorax" ? "Organ affixes" : "Prefixes"}</h3>${[0, 1, 2].map((index) => craftAffixControl(`Prefix ${index + 1}`, index, types[0][0])).join("")}<h3>Suffixes</h3>${[3, 4, 5].map((index) => craftAffixControl(`Suffix ${index - 2}`, index, types[0][0])).join("")}</section><aside id="crafted-equipment-preview"><small>Preview</small>${equipmentPreview(initialBase ? { ...initialBase, base: initialBase.type, implicitModifiers: initialBase.modifiers, rarity: "rare", itemLevel: 100 } : { name: types[0][0], base: types[0][0], slot: types[0][1], level: 100, itemLevel: 100, modifiers: [] })}</aside></div>`;
  }
}
function setCraftRollValues(containerSelector, attribute, values) {
  const controls = [...document.querySelectorAll(containerSelector)];
  controls.forEach((range, index) => {
    if (values[index] === undefined) return;
    range.value = String(values[index]);
    updateNegativeRollVisual(range);
    const numberInput = range.closest(".affix-roll-inputs")?.querySelector("[data-affix-roll-number]");
    if (numberInput) numberInput.value = range.value;
    range.closest("label")?.querySelector("em")?.replaceChildren(range.value);
  });
}
function populateCraftEditor(item) {
  const body = $("#equipment-crafter-body"),
    type = body.querySelector("[data-craft-type]");
  if (!body || !type) return;
  type.value = item.base || itemWeaponType(item);
  type.dispatchEvent(new Event("input", { bubbles: true }));
  body.querySelector("[data-craft-name]").value = item.name || "";
  body.querySelector("[data-craft-level]").value = item.itemLevel || item.level || 100;
  const base = body.querySelector("[data-craft-base]");
  if (base && item.baseId) base.value = item.baseId;
  const energy = body.querySelector("[data-craft-energy]");
  if (energy) energy.value = item.energy || 0;
  const blend = body.querySelector("[data-craft-belt-blend]");
  if (blend) blend.value = item.beltBlendId || "";
  const sequence = body.querySelector("[data-craft-sequence]");
  if (sequence) sequence.value = item.towerSequenceId || "";
  (item.baseAffixModifiers || []).slice(0, 2).forEach((resolved, index) => {
    const select = body.querySelector(`[data-craft-base-affix="${index}"]`),
      template = [...select.options].find(
        (option) => modifierSignature(option.value) === modifierSignature(resolved),
      )?.value;
    if (!template) return;
    select.value = template;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    setCraftRollValues(
      `[data-base-affix-roll="${index}"]`,
      "data-base-affix-roll",
      resolvedRollValues(template, resolved),
    );
  });
  const storedFamilies = item.craftAffixFamilyIds,
    storedTiers = item.craftAffixTierIds;
  (item.craftAffixLegendary || []).slice(0, 6).forEach((active, index) => {
    if (!active) return;
    const toggle = body.querySelector(`[data-toggle-vorax-legendary="${index}"]`);
    if (!toggle) return;
    toggle.dataset.legendaryActive = "true";
    toggle.setAttribute("aria-pressed", "true");
    toggle.closest(".craft-affix-control")?.classList.add("legendary-affix-active");
    const select = body.querySelector(`[data-craft-affix-family="${index}"]`);
    if (select) select.innerHTML = craftAffixFamilyOptions(type.value, index);
  });
  if (Array.isArray(storedFamilies) && storedFamilies.some(Boolean)) {
    let prefixIndex = 0,
      suffixIndex = 0;
    storedFamilies.slice(0, 6).forEach((familyId, index) => {
      if (!familyId) return;
      const resolved =
          index < 3 ? (item.prefixModifiers || [])[prefixIndex++] : (item.suffixModifiers || [])[suffixIndex++],
        family = craftAffixPool(type.value, index).find((entry) => entry.id === familyId),
        tier = isVoraxLegendaryAffix(body, index)
          ? family?.tiers[0]
          : family?.tiers.find((candidate) => String(candidate.tier) === String(storedTiers?.[index] || ""));
      if (!family || !tier) return;
      const select = body.querySelector(`[data-craft-affix-family="${index}"]`);
      select.value = family.id;
      updateCraftAffixConfig(index, tier.tier);
      if (resolved)
        setCraftRollValues(
          `[data-craft-affix-roll="${index}"]`,
          "data-craft-affix-roll",
          resolvedRollValues(tier.template, resolved),
        );
    });
  } else {
    [
      [item.prefixModifiers || [], 0],
      [item.suffixModifiers || [], 3],
    ].forEach(([resolvedModifiers, offset]) =>
      resolvedModifiers.slice(0, 3).forEach((resolved, position) => {
        const index = offset + position,
          pool = craftAffixPool(type.value, index);
        let family, tier;
        for (const entry of pool) {
          const found = entry.tiers.find((candidate) => tierMatchesResolved(candidate, resolved));
          if (found) {
            family = entry;
            tier = found;
            break;
          }
        }
        if (!family || !tier) return;
        const select = body.querySelector(`[data-craft-affix-family="${index}"]`);
        select.value = family.id;
        updateCraftAffixConfig(index, tier.tier);
        setCraftRollValues(
          `[data-craft-affix-roll="${index}"]`,
          "data-craft-affix-roll",
          resolvedRollValues(tier.template, resolved),
        );
      }),
    );
  }
  updateCraftPreview();
  $("#equipment-crafter-title").textContent = `Edit ${item.name}`;
  const save = $("#equipment-crafter [data-add-crafted-equipment]");
  if (save) save.textContent = "Save Changes";
}
function openCraftedItemEditor(item) {
  editingCraftItemId = item.id;
  equipmentCraftMode = item.rarity === "vorax" ? "vorax" : "rare";
  selectedVoraxBaseName = equipmentCraftMode === "vorax" ? item.base || item.name : "";
  renderEquipmentCrafter();
  populateCraftEditor(item);
  $("#inventory-item-dialog").close();
  $("#equipment-crafter").showModal();
}
function openInventoryItemEditor(item) {
  if (!item) return;
  normalizeSunsEmbraceItem(item);
  selectedInventoryItemId = item.id;
  if (
    item.rarity !== "legendary" &&
    !legendaryEditorSource(item) &&
    plannerState.equipmentInventory.some((entry) => entry.id === item.id)
  ) {
    openCraftedItemEditor(item);
    return;
  }
  inventoryItemEditing = true;
  const legendaryModel = inventoryLegendaryModel(item);
  // The editor keys corrosion and line text by catalog index; corrodedModifierIndices are positions in item.modifiers.
  editingCorrodedModifierIndices = legendaryModel
    ? new Set(legendaryModel.slots.filter((slot) => slot.corroded).map((slot) => slot.catalogIndex))
    : new Set(item.corrodedModifierIndices || []);
  editingLegendaryTexts = new Map(
    legendaryModel
      ? legendaryModel.slots.filter((slot) => slot.position >= 0).map((slot) => [slot.catalogIndex, slot.text])
      : [],
  );
  editingFolkloreRingOption = folkloreRingOptionFromModifiers(item.legendaryModifiers || item.modifiers);
  const placeholderSource = legendaryEditorSource(item);
  editingPlaceholderChoices = new Map(
    legendaryModel && placeholderSource
      ? legendaryModel.slots
          .filter((slot) => slot.position >= 0)
          .map((slot) => [
            slot.catalogIndex,
            placeholderOptionForText(placeholderSource.id, slot.catalogIndex, slot.text, slot.corroded)?.option.id,
          ])
          .filter(([, id]) => id)
      : [],
  );
  // A tiered line keeps the tier its stored roll was rolled in (Ice Pulse "+29% Spell Damage" opens on T2); unset = the best tier.
  editingTierChoices = new Map(
    legendaryModel && placeholderSource
      ? legendaryModel.slots
          .filter((slot) => slot.position >= 0 && !slot.corroded)
          .map((slot) => [slot.catalogIndex, legendaryTierForText(placeholderSource, slot.catalogIndex, slot.text)])
          .filter(([, tier]) => tier)
      : [],
  );
  renderInventoryItemDialog();
  const dialog = $("#inventory-item-dialog");
  if (!dialog.open) dialog.showModal();
}

function selectedPactspiritLevel(name) {
  const fallback = plannerState.pacts.kismetSlotMode
    ? 1
    : selenaScorchingBeamPactsSs13.pactspirits.find((spirit) => spirit.name === name)?.rank || 1;
  return pactspiritLevel(name, plannerState.pacts.spiritLevels, fallback);
}

// The Pactspirits section is React (apps/web/src/features/pacts): it re-reads its source.
function renderPacts() {
  viewSourceChanged("pacts");
}

function removeSelectedPactspirit(index) {
  if (!plannerState.pacts.selectedSpirits[index]) return;
  plannerState.pacts.selectedSpirits[index] = "";
  plannerState.pacts.activeSpirits = activeCapturedPactspirits(
    plannerState.pacts.selectedSpirits,
    selenaScorchingBeamPactsSs13.pactspirits.map((spirit) => spirit.name),
  );
  hidePlannerTooltip();
  refreshPactCandidate();
}

const slateAffixes = (slate) => plannerState.slates?.affixOverrides?.[slate.id] || slate.fixed || [];
const netherKingFixedChoices = new Set(
  netherKingFixedPool.map((affix) => slateAffixChoice(affix, "Nether King").value),
);
function slateCraftedAffixGroups(slate) {
  const saved = slate.affixGroups;
  if (slate.god !== "Nether King")
    return saved || { fixed: (slate.affixes || []).slice(0, 2), random: (slate.affixes || []).slice(2) };
  if (saved) {
    const fixed = (saved.fixed || []).filter((affix) => !affix || netherKingFixedChoices.has(affix));
    const brand = [
      ...(saved.fixed || []).filter((affix) => affix && !netherKingFixedChoices.has(affix)),
      ...(saved.brand || saved.random || []),
    ];
    return { fixed, brand };
  }
  const affixes = slate.affixes || [];
  let fixedCount = 0;
  while (fixedCount < 2 && netherKingFixedChoices.has(affixes[fixedCount])) fixedCount += 1;
  return { fixed: affixes.slice(0, fixedCount), brand: affixes.slice(fixedCount) };
}

// The Fate slot selector (apps/web/src/shell/dialogs/FateSlotSelectorDialog.tsx) is open for this Pactspirit.
let fateSlotSpirit = "";
function openFateSlotSelector(name) {
  fateSlotSpirit = name;
  viewSourceChanged("fateSlotSelector");
  $("#fate-slot-selector").showModal();
}
function selectFateSlots(choiceId) {
  const dialog = $("#fate-slot-selector"),
    name = fateSlotSpirit,
    choice = fateSlotChoice(choiceId);
  if (!name || !choice) return;
  const nextUnlocks = { ...(plannerState.pacts.fateUnlocks || {}), [name]: choice.id };
  const validKeys = new Set(fateExtraSlots(name, choice.id).map((slot) => slot.key));
  const nextKismets = Object.fromEntries(
    Object.entries(plannerState.pacts.kismetSlots || {}).filter(
      ([key]) => key !== `${name}:10` && (!key.startsWith(`${name}:extra:`) || validKeys.has(key)),
    ),
  );
  plannerState.pacts.fateUnlocks = nextUnlocks;
  plannerState.pacts.kismetSlots = nextKismets;
  plannerState.pacts.kismetSlotMode = true;
  dialog.close();
  hidePlannerTooltip();
  refreshPactCandidate();
}
function clearFateSlots(name) {
  if (!name) return;
  const unlocks = { ...(plannerState.pacts.fateUnlocks || {}) };
  delete unlocks[name];
  plannerState.pacts.fateUnlocks = unlocks;
  plannerState.pacts.kismetSlots = Object.fromEntries(
    Object.entries(plannerState.pacts.kismetSlots || {}).filter(([key]) => !key.startsWith(`${name}:extra:`)),
  );
  hidePlannerTooltip();
  refreshPactCandidate();
}
function clearKismetNode(key) {
  if (!plannerState.pacts.kismetSlots?.[key]) return;
  const slots = { ...plannerState.pacts.kismetSlots };
  delete slots[key];
  plannerState.pacts.kismetSlots = slots;
  hidePlannerTooltip();
  refreshPactCandidate();
}
function kismetChoices() {
  return kismetCatalogSs13
    .filter((item) => item.kind === activeKismetSlot?.kind)
    .sort(
      (a, b) =>
        (a.rarity === "Legendary" ? -1 : 1) - (b.rarity === "Legendary" ? -1 : 1) || a.name.localeCompare(b.name),
    );
}
function renderKismetChoices() {
  const query = $("#kismet-search").value.trim().toLowerCase();
  const choices = kismetChoices().filter(
    (item) => !query || `${item.name} ${item.affixes.join(" ")}`.toLowerCase().includes(query),
  );
  $("#kismet-choice-list").innerHTML = choices.length
    ? choices
        .map(
          (item) =>
            `<button type="button" class="kismet-choice ${item.name === selectedKismetName ? "selected" : ""}" data-select-kismet="${escapeHtml(item.name)}"><img src="${item.icon}" alt=""><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.affixes.join(" · "))}</small></span><em class="${item.rarity.toLowerCase()}">${item.rarity}</em></button>`,
        )
        .join("")
    : '<p class="kismet-no-results">No matching kismets.</p>';
}
function renderKismetPreview() {
  const entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName),
    previewBoost =
      entry && activeKismetSlot
        ? microFateEffectScale(
            {
              ...plannerState.pacts,
              kismetSlots: { ...plannerState.pacts.kismetSlots, [activeKismetSlot.key]: { name: entry.name } },
            },
            activeKismetSlot.key,
          )
        : null;
  $("#kismet-preview").innerHTML = entry
    ? `<div class="kismet-preview-head"><img src="${entry.icon}" alt=""><div><strong>${escapeHtml(entry.name)}</strong><small>${entry.rarity} · ${entry.kind === "micro" ? "Micro" : "Medium"} Kismet${starTrailNote(previewBoost) ? ` · ${starTrailNote(previewBoost)}` : ""}</small></div></div><ul>${kismetAffixesWithRolls(
        entry,
        selectedKismetRolls,
      )
        .map((affix) => `<li>${boostedKismetAffixHtml(affix, previewBoost)}</li>`)
        .join("")}</ul><p>Install to replace this ${entry.kind === "micro" ? "Micro" : "Medium"} node.</p>`
    : "";
}
function renderKismetDetails() {
  const entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName);
  const controls = entry ? kismetRollControls(entry) : [];
  $("#kismet-roll-controls").innerHTML = controls.length
    ? controls
        .map(
          (control, index) =>
            `<label class="kismet-roll-row"><span>Value ${index + 1}: <strong data-kismet-roll-output="${index}">${selectedKismetRolls[index]}</strong></span><div><input type="range" data-kismet-roll-range="${index}" min="${control.min}" max="${control.max}" step="${control.step}" value="${selectedKismetRolls[index]}"><input type="number" data-kismet-roll-number="${index}" min="${control.min}" max="${control.max}" step="${control.step}" value="${selectedKismetRolls[index]}" aria-label="Value ${index + 1}"></div><small>${escapeHtml(entry.affixes[control.affixIndex])}</small></label>`,
        )
        .join("")
    : '<p class="kismet-fixed-roll">This Kismet has fixed effects.</p>';
  renderKismetPreview();
}
function selectKismetChoice(name) {
  const entry = kismetCatalogSs13.find((item) => item.name === name && item.kind === activeKismetSlot?.kind);
  if (!entry) return;
  selectedKismetName = name;
  selectedKismetRolls = normalizeKismetRolls(entry);
  renderKismetChoices();
  renderKismetDetails();
}
function openKismetCrafter(key, kind) {
  activeKismetSlot = { key, kind };
  const saved = plannerState.pacts.kismetSlots?.[key],
    entry = kismetCatalogSs13.find((item) => item.name === saved?.name && item.kind === kind) || kismetChoices()[0];
  selectedKismetName = entry?.name || "";
  selectedKismetRolls = entry ? normalizeKismetRolls(entry, saved?.name === entry.name ? saved.rolls : []) : [];
  $("#kismet-crafter-title").textContent = `Select ${kind === "micro" ? "Micro" : "Medium"} Kismet`;
  $("#kismet-search").value = "";
  renderKismetChoices();
  renderKismetDetails();
  $("#kismet-crafter").showModal();
  $("#kismet-search").focus();
}
function saveKismetSlot(clear = false) {
  if (!activeKismetSlot) return;
  const next = { ...(plannerState.pacts.kismetSlots || {}) };
  if (clear) delete next[activeKismetSlot.key];
  else {
    const entry = kismetCatalogSs13.find(
      (item) => item.name === selectedKismetName && item.kind === activeKismetSlot.kind,
    );
    if (!entry) return;
    const current = equippedKismetSummary(selenaScorchingBeamPactsSs13, {
      ...plannerState.pacts,
      kismetSlotMode: true,
      kismetSlots: next,
    });
    if (
      !next[activeKismetSlot.key] &&
      (entry.kind === "micro" ? current.microCount >= current.microMax : current.mediumCount >= current.mediumMax)
    ) {
      showToast(`${entry.kind === "micro" ? "Micro" : "Medium"} Kismet slots are full`);
      return;
    }
    next[activeKismetSlot.key] = { name: entry.name, rolls: normalizeKismetRolls(entry, selectedKismetRolls) };
  }
  plannerState.pacts.kismetSlots = next;
  plannerState.pacts.kismetSlotMode = true;
  $("#kismet-crafter").close();
  activeKismetSlot = null;
  hidePlannerTooltip();
  refreshPactCandidate();
}
const slateAsset = (name) => `./src/assets/tli/slates/${name}`;
const slateShapeArt = (shape, god = selectedSlateGod) => {
  const cells = {
    corner: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    line: [
      [0, 0],
      [0, 1],
    ],
    tee: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    single: [[0, 0]],
  }[shape] || [[0, 0]];
  return `<span class="god-slate-shape ${slateGodKey(god)}">${cells.map(([x, y]) => `<i style="--x:${x};--y:${y}"></i>`).join("")}</span>`;
};
const godSlateAssets = {
  deception: ["AI"],
  hunting: ["Agi"],
  knowledge: ["Int"],
  machines: ["SI"],
  might: ["Str"],
  war: ["SA"],
};
const slateShapeCodes = ["Z1", "L1", "O1", "T1"];
function renderSlateInventory() {
  const inventory = plannerState.slates?.inventory || [];
  $("#slate-inventory-header").innerHTML =
    `<strong id="slate-inventory-title">Slate Inventory</strong><button type="button" class="picker-close" data-close-slate-inventory aria-label="Close slate inventory">×</button>`;
  $("#slate-crafter-body").innerHTML = `<div class="crafted-slate-inventory"><div class="crafted-slate-list">${
    inventory.length
      ? inventory
          .map((slate) => {
            const icon = craftedSlateIcon(slate),
              equipped = equippedSlateIds.has(slate.id),
              staged = !!parkedSlates[slate.id];
            return `<article class="crafted-slate-item ${equipped ? "equipped" : staged ? "staged" : ""}" data-crafted-slate-inventory="${escapeHtml(slate.id)}"><span class="crafted-slate-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : slateShapeArt(slate.shape, slate.god)}</span><span><strong>${escapeHtml(slate.name)}${equipped ? '<em class="crafted-slate-equipped-badge">Equipped</em>' : staged ? '<em class="crafted-slate-equipped-badge">Workspace</em>' : ""}</strong><small>${slate.affixes.filter(Boolean).length} affix${slate.affixes.filter(Boolean).length === 1 ? "" : "es"} · ${escapeHtml(slate.god)}</small></span><span class="crafted-slate-tools"><button type="button" data-duplicate-crafted-slate="${escapeHtml(slate.id)}" title="Duplicate">▢</button><button type="button" data-edit-crafted-slate="${escapeHtml(slate.id)}" title="Edit">✎</button><button type="button" data-remove-crafted-slate="${escapeHtml(slate.id)}" title="Remove from grid" ${equipped || staged ? "" : "disabled"}>⊘</button><button type="button" data-delete-crafted-slate="${escapeHtml(slate.id)}" title="Delete">×</button></span></article>`;
          })
          .join("")
      : `<div class="crafted-slate-empty"><strong>No crafted slates yet</strong><span>Craft a slate to add it to this build's inventory.</span></div>`
  }</div><button type="button" class="button crafted-slate-create" data-open-slate-crafter>Craft Slate</button></div>`;
}
function renderSlateCrafter() {
  const body = $("#slate-crafter-body"),
    affixPool = divinitySlateAffixesSs13[selectedSlateGod] || [],
    affixRows = (heading, start, count) =>
      `<fieldset><legend>${heading} (0/${count})</legend>${Array.from({ length: count }, (_, index) => `<label class="slate-affix-row"><span>Slot ${start + index}</span><select><option value="">Select affix…</option></select></label>`).join("")}</fieldset>`;
  $("#slate-inventory-header").innerHTML =
    `<button type="button" class="${activeSlateCrafterTab === "craft" ? "active" : ""}" data-slate-inventory-tab="craft">Craft Slate</button><button type="button" class="${activeSlateCrafterTab === "legendary" ? "active" : ""}" data-slate-inventory-tab="legendary">Craft Legendary Slate</button><button type="button" class="${activeSlateCrafterTab === "judgment" ? "active" : ""}" data-slate-inventory-tab="judgment">Nether King</button><button type="button" class="picker-close" data-close-slate-inventory aria-label="Close slate inventory">×</button>`;
  const actions = `<div class="slate-inventory-actions"><button type="button" class="button button-secondary" data-back-slate-inventory>${editingCraftedSlateId ? "Cancel" : "Back to Inventory"}</button><button type="button" class="button" data-add-crafted-slate>${editingCraftedSlateId ? "Save Changes" : "Add to Inventory"}</button></div>`;
  if (activeSlateCrafterTab === "legendary") {
    const templates = [
      ["game-captures/sparks-of-moth-fire.webp", "Sparks of Moth Fire"],
      ["game-captures/fallen-starlight.webp", "Fallen Starlight"],
      ["game-captures/corner-of-divinity.webp", "A Corner of Divinity"],
      ["game-captures/space-rift.svg", "Space Rift"],
      ["game-captures/pedigree-of-gods.webp", "Pedigree of Gods"],
      ["game-captures/residence-of-stars.svg", "Residence of Stars"],
      ["game-captures/prairie-ablaze.webp", "When Sparks Set the Prairie Ablaze"],
    ];
    if (selectedLegendarySlateName === "Sparks of Moth Fire") {
      const icon = slateGameCaptureByName[selectedLegendarySlateName];
      body.innerHTML = `<div class="slate-craft-layout slate-legendary-detail"><section><p class="eyebrow">Legendary Template</p><div class="slate-legendary-selection"><img src="${icon}" alt=""><div><strong>Sparks of Moth Fire</strong><small>Selected Legendary</small></div><button type="button" class="button button-secondary" data-change-slate-template>Change</button><button type="button" class="active" data-slate-template="Sparks of Moth Fire" hidden></button></div><fieldset><legend>Shape &amp; Orientation</legend><div class="slate-shape-options"><button type="button" class="active" data-craft-shape="single"><img src="${icon}" alt="Sparks of Moth Fire shape"></button><span class="slate-shape-preview"><img src="${icon}" alt=""></span><div class="slate-transform-options"><button type="button" data-craft-transform="rotate">↻ Rotate</button><button type="button" data-craft-transform="flip-h">↔ Flip H</button><button type="button" data-craft-transform="flip-v">↕ Flip V</button></div></div></fieldset><fieldset><legend>Fixed Affix</legend><label class="slate-affix-row"><span>Slot 1</span><select data-sparks-copy-rule aria-label="Sparks of Moth Fire copy direction">${sparksOfMothFireCopyRules.map((rule, index) => `<option value="${escapeHtml(rule)}">${sparksOfMothFireDirections[index]} · ${escapeHtml(rule)}</option>`).join("")}</select></label></fieldset></section><aside><span>Preview</span><div class="slate-craft-card"><img src="${icon}" alt=""><strong>Sparks of Moth Fire</strong><small>DIVINITY SLATE · LEGENDARY</small><div class="slate-craft-affix-preview"><section><h3>Fixed Affix</h3><div class="sparks-preview-direction"><span class="sparks-preview-arrow" data-sparks-preview-arrow aria-hidden="true">↑</span><strong data-sparks-preview-direction>From above</strong></div><ul><li><span data-sparks-preview-rule>${escapeHtml(sparksOfMothFireCopyRules[0])}</span></li></ul></section></div></div>${actions}</aside></div>`;
      return;
    }
    if (selectedLegendarySlateName === "Residence of Stars") {
      const icon = slateGameCaptureByName[selectedLegendarySlateName];
      body.innerHTML = `<div class="slate-craft-layout slate-legendary-detail"><section><p class="eyebrow">Legendary Template</p><div class="slate-legendary-selection"><img src="${icon}" alt=""><div><strong>Residence of Stars</strong><small>Selected Legendary</small></div><button type="button" class="button button-secondary" data-change-slate-template>Change</button><button type="button" class="active" data-slate-template="Residence of Stars" hidden></button></div><fieldset><legend>Shape &amp; Orientation</legend><div class="slate-shape-options"><button type="button" class="active" data-craft-shape="residence"><img src="${icon}" alt="Residence of Stars shape"></button><span class="slate-shape-preview"><img src="${icon}" alt=""></span><small class="slate-transform-note">Orientation is fixed</small></div></fieldset><fieldset><legend>Fixed Affix</legend><label class="slate-affix-row"><span>Slot 1</span><span class="slate-readonly">${escapeHtml(residenceOfStarsCopyRule)}</span></label></fieldset></section><aside><span>Preview</span><div class="slate-craft-card"><img src="${icon}" alt=""><strong>Residence of Stars</strong><small>DIVINITY SLATE · LEGENDARY</small><div class="slate-craft-affix-preview"><section><h3>Fixed Affix</h3><ul><li><span>${escapeHtml(residenceOfStarsCopyRule)}</span></li></ul></section></div></div>${actions}</aside></div>`;
      return;
    }
    if (
      [
        "When Sparks Set the Prairie Ablaze",
        "Space Rift",
        "Fallen Starlight",
        "A Corner of Divinity",
        "Pedigree of Gods",
      ].includes(selectedLegendarySlateName)
    ) {
      const name = selectedLegendarySlateName,
        icon = slateGameCaptureByName[name],
        slotTypes = legendaryTalentSlotTypes[name] || [];
      const copyRules =
        name === "Space Rift"
          ? spaceRiftCopyRules
          : name === "When Sparks Set the Prairie Ablaze"
            ? [prairieAblazeCopyRule]
            : [];
      const optionPool =
        name === "Pedigree of Gods"
          ? [...allDivinitySlateAffixes, ...pedigreeCoreAffixesSs13]
          : allDivinitySlateAffixes;
      const affixControls = slotTypes
        .map(
          (types, index) =>
            `<label class="slate-affix-row"><span>Slot ${index + 1}</span><select data-legendary-affix="${index}" aria-label="${escapeHtml(name)} affix ${index + 1}"><option value="">Select ${escapeHtml(types.join(" or "))}…</option></select></label>`,
        )
        .join("");
      const fixedControl =
        copyRules.length > 1
          ? `<select data-legendary-copy-rule aria-label="Space Rift copy direction">${copyRules.map((rule, index) => `<option value="${escapeHtml(rule)}">${index ? "→ Right" : "← Left"} · ${escapeHtml(rule)}</option>`).join("")}</select>`
          : `<span class="slate-readonly">${escapeHtml(copyRules[0] || "")}</span>`;
      const previewAffix = copyRules.length
        ? `<div class="slate-craft-affix-preview"><section><h3>Fixed Affix</h3>${copyRules.length > 1 ? '<div class="sparks-preview-direction"><span class="sparks-preview-arrow" data-legendary-copy-arrow aria-hidden="true">←</span><strong data-legendary-copy-label>From left</strong></div>' : ""}<ul><li><span data-legendary-copy-preview>${escapeHtml(copyRules[0])}</span></li></ul></section></div>`
        : `<div class="slate-craft-affix-preview"><p>Choose affixes to preview their effects.</p></div>`;
      body.innerHTML = `<div class="slate-craft-layout slate-legendary-detail"><section><p class="eyebrow">Legendary Template</p><div class="slate-legendary-selection"><img src="${icon}" alt=""><div><strong>${escapeHtml(name)}</strong><small>Selected Legendary</small></div><button type="button" class="button button-secondary" data-change-slate-template>Change</button><button type="button" class="active" data-slate-template="${escapeHtml(name)}" hidden></button></div><fieldset><legend>Shape &amp; Orientation</legend><div class="slate-shape-options"><button type="button" class="active" data-craft-shape="legendary"><img src="${icon}" alt="${escapeHtml(name)} shape"></button><span class="slate-shape-preview"><img src="${icon}" alt=""></span><div class="slate-transform-options">${slateTransformRules(name).rotate ? `<button type="button" data-craft-transform="rotate">↻ Rotate</button>` : ""}${slateTransformRules(name).flip ? `<button type="button" data-craft-transform="flip-h">↔ Flip H</button><button type="button" data-craft-transform="flip-v">↕ Flip V</button>` : ""}</div></div></fieldset><fieldset><legend>${copyRules.length ? "Fixed Affix" : `Talent Affixes (0/${slotTypes.length})`}</legend>${copyRules.length ? `<label class="slate-affix-row"><span>Slot 1</span>${fixedControl}</label>` : affixControls}</fieldset></section><aside><span>Preview</span><div class="slate-craft-card"><img src="${icon}" alt=""><strong>${escapeHtml(name)}</strong><small>DIVINITY SLATE · LEGENDARY</small>${previewAffix}</div>${actions}</aside></div>`;
      [...body.querySelectorAll("[data-legendary-affix]")].forEach((select, index) =>
        setSlateAffixPool(
          select,
          optionPool.filter((affix) => slotTypes[index].includes(affix.name)),
          selectedSlateGod,
          true,
        ),
      );
      return;
    }
    body.innerHTML = `<div class="slate-template-layout"><section><p>Legendary Template</p><div class="slate-template-grid">${templates.map(([icon, name]) => `<button type="button" data-slate-template="${escapeHtml(name)}"><img src="${slateAsset(icon)}" alt=""><span>${escapeHtml(name)}</span></button>`).join("")}</div></section><aside><span>Preview</span><div class="slate-empty-preview">Select options to preview slate</div>${actions}</aside></div>`;
    return;
  }
  const nether = activeSlateCrafterTab === "judgment";
  const netherNames = ["Judgment", "Contamination", "Offspring"];
  const netherName = `Nether King's Divinity: ${selectedNetherSlateType}`;
  const netherIcon = slateGameCaptureByName[netherName];
  const gods = [
    "Goddess of Deception",
    "Goddess of Hunting",
    "Goddess of Knowledge",
    "God of Machines",
    "God of Might",
    "God of War",
  ];
  const godKey = slateGodKey(selectedSlateGod),
    suffix = godSlateAssets[godKey]?.[0],
    nativeSlateFiles = suffix ? slateShapeCodes.map((shape) => `UI_TalantNG_${shape}_0_Icon_${suffix}_112.webp`) : [],
    native = Boolean(suffix),
    nativeArt = (file) =>
      `<img src="${
        file.includes("_Z1_") && godSlateCaptureByKey[godKey]
          ? slateAsset(`game-captures/${godSlateCaptureByKey[godKey]}.svg`)
          : godKey === "deception" && file.includes("_Z1_")
            ? slateAsset("game-captures/goddess-of-deception-divinity.webp")
            : godSlateShapeCapture(
                godKey,
                slateShapeCodes.find((shape) => file.includes(`_${shape}_`)),
              )
      }" alt="${selectedSlateGod} slate">`;
  body.innerHTML = `<div class="slate-craft-layout"><section><label class="slate-field">Name<input type="text" data-slate-craft-name placeholder="Custom name (optional)"></label>${nether ? `<fieldset class="slate-craft-gods"><legend>Nether King Type</legend>${netherNames.map((type) => `<button type="button" data-nether-slate-type="${type}" class="${type === selectedNetherSlateType ? "active" : ""}">${type}</button>`).join("")}</fieldset>` : `<fieldset class="slate-craft-gods"><legend>God</legend>${gods.map((god) => `<button type="button" data-slate-god="${god}" class="${god === selectedSlateGod ? "active" : ""}">${god}</button>`).join("")}</fieldset>`}<fieldset><legend>Shape &amp; Orientation</legend><div class="slate-shape-options ${native ? "native-slate-assets" : ""}">${nether ? `<button type="button" class="active" data-craft-shape="authority"><img src="${netherIcon}" alt=""></button>` : native ? nativeSlateFiles.map((file, index) => `<button type="button" class="${index ? "" : "active"}" data-craft-shape="${godKey}-${index}">${nativeArt(file)}</button>`).join("") : ["corner", "line", "tee", "single"].map((shape, index) => `<button type="button" class="${index ? "" : "active"}" data-craft-shape="${shape}">${slateShapeArt(shape)}</button>`).join("")}<span class="slate-shape-preview">${nether ? `<img src="${netherIcon}" alt="">` : native ? nativeArt(nativeSlateFiles[0]) : slateShapeArt("corner")}</span><div class="slate-transform-options"><button type="button" data-craft-transform="rotate">↻ Rotate</button><button type="button" data-craft-transform="flip-h">↔ Flip H</button><button type="button" data-craft-transform="flip-v">↕ Flip V</button></div></div>${nether ? `<small>Block grows with filled Brand Talent Nodes<br>(0–1 → 1 block, 2 → 2, 3 → Authority)</small>` : ""}</fieldset>${nether ? `<fieldset><legend>Authority Effect</legend><input class="slate-readonly" value="${netherName}" readonly><small>This slate has a fixed Authority effect</small><p class="slate-authority-copy">Divinity Slates on links between Divinities have 70% increased affix effect.</p></fieldset>` : ""}${affixRows("Fixed Affixes", 1, 2, nether ? netherKingFixedPool : affixPool)}${affixRows(nether ? "Brand Talent Nodes" : "Random Affixes", 3, 3, nether ? netherKingBrandPool : affixPool)}</section><aside><span>Preview</span><div class="slate-craft-card ${nether ? "nether" : slateGodFamilyClass(selectedSlateGod)}">${nether ? `<img src="${netherIcon}" alt="">` : native ? nativeArt(nativeSlateFiles[0]) : `${slateShapeArt("corner")} `}<strong>${nether ? netherName : selectedSlateGod}</strong><small>${nether ? "NETHER KING'S DIVINITY · LEGENDARY" : "DIVINITY SLATE · MAGIC"}</small>${nether ? `<hr><em>AUTHORITY</em><b>${netherName}</b>` : ""}</div>${actions}</aside></div>`;
  [...body.querySelectorAll(".slate-affix-row select")].forEach((select, index) =>
    setSlateAffixPool(
      select,
      nether ? (index < 2 ? netherKingFixedPool : netherKingBrandPool) : affixPool,
      selectedSlateGod,
    ),
  );
  body
    .querySelector(".slate-craft-card small")
    ?.insertAdjacentHTML("afterend", '<div class="slate-craft-affix-preview" aria-live="polite"></div>');
  updateSlateCraftPreview();
}
function updateSlateCraftPreview() {
  const body = $("#slate-crafter-body"),
    card = body?.querySelector(".slate-craft-card"),
    preview = card?.querySelector(".slate-craft-affix-preview");
  if (!preview) return;
  if (activeSlateCrafterTab === "legendary") {
    const art = body.querySelector(".slate-shape-preview img"),
      cardArt = card.querySelector(":scope > img");
    if (art && cardArt) cardArt.style.transform = art.style.transform;
    const rule = body.querySelector("[data-sparks-copy-rule]"),
      rulePreview = card.querySelector("[data-sparks-preview-rule]");
    if (rule && rulePreview) {
      rulePreview.textContent = rule.value;
      const direction = sparksOfMothFireDirections[Math.max(0, sparksOfMothFireCopyRules.indexOf(rule.value))];
      const arrow = card.querySelector("[data-sparks-preview-arrow]"),
        label = card.querySelector("[data-sparks-preview-direction]");
      if (arrow) arrow.textContent = direction[0];
      if (label) label.textContent = `From ${direction.slice(2).toLowerCase()}`;
    }
    const legendaryRule = body.querySelector("[data-legendary-copy-rule]"),
      legendaryRulePreview = card.querySelector("[data-legendary-copy-preview]");
    if (legendaryRule && legendaryRulePreview) {
      legendaryRulePreview.textContent = legendaryRule.value;
      const fromRight = legendaryRule.selectedIndex === 1;
      card.querySelector("[data-legendary-copy-arrow]").textContent = fromRight ? "→" : "←";
      card.querySelector("[data-legendary-copy-label]").textContent = fromRight ? "From right" : "From left";
    }
    const talentSelects = [...body.querySelectorAll("[data-legendary-affix]")];
    if (talentSelects.length) {
      const chosen = talentSelects.filter((select) => select.value);
      body.querySelector(".slate-legendary-detail fieldset:last-of-type legend").textContent =
        `Talent Affixes (${chosen.length}/${talentSelects.length})`;
      preview.innerHTML = chosen.length
        ? `<section><h3>Talent Affixes</h3><ul>${chosen
            .map((select) => {
              const option = select.selectedOptions[0],
                details = option.dataset.affixDetails || select.value,
                colon = details.indexOf(": "),
                type = colon < 0 ? "" : details.slice(0, colon),
                effect = colon < 0 ? details : details.slice(colon + 2),
                limited = option.dataset.maxDivinityEffect === "1",
                core = /\bLv\.[12] Core Talent\b/.test(type);
              return `<li class="${core ? "core-slate-affix" : ""} ${limited ? "max-one-divinity" : ""}">${core ? '<strong class="core-slate-badge">Core Talent</strong>' : ""}<small>${escapeHtml([option.dataset.affixTree, type].filter(Boolean).join(" · "))}</small><span>${escapeHtml(effect)}</span>${limited ? '<strong class="max-divinity-badge">MAX ACTIVE: 1</strong>' : ""}</li>`;
            })
            .join("")}</ul></section>`
        : "<p>Choose affixes to preview their effects.</p>";
    }
    return;
  }
  const name = body.querySelector("[data-slate-craft-name]")?.value.trim();
  card.querySelector("strong").textContent =
    name ||
    (activeSlateCrafterTab === "judgment" ? `Nether King's Divinity: ${selectedNetherSlateType}` : selectedSlateGod);
  const art = body.querySelector(".slate-shape-preview img"),
    cardArt = card.querySelector(":scope > img");
  if (art && cardArt) {
    cardArt.src = art.src;
    cardArt.style.transform = art.style.transform;
  }
  const selects = [...body.querySelectorAll(".slate-affix-row select")];
  const groups = [
    ["Fixed Affixes", selects.slice(0, 2)],
    [activeSlateCrafterTab === "judgment" ? "Brand Talent Nodes" : "Random Affixes", selects.slice(2)],
  ];
  body.querySelectorAll(".slate-craft-layout fieldset").forEach((fieldset) => {
    const legend = fieldset.querySelector(":scope > legend");
    if (!legend) return;
    const group = groups.find(([title]) => legend.textContent.startsWith(title));
    if (group)
      legend.textContent = `${group[0]} (${group[1].filter((select) => select.value).length}/${group[1].length})`;
  });
  preview.innerHTML =
    groups
      .map(([title, slots]) => {
        const chosen = slots
          .filter((select) => select.value)
          .map((select) => {
            const option = select.selectedOptions[0],
              details = option.dataset.affixDetails || option.textContent,
              colon = details.indexOf(": "),
              type = colon < 0 ? "" : details.slice(0, colon),
              effect = colon < 0 ? details : details.slice(colon + 2),
              tree = option.dataset.affixTree || "",
              limited = option.dataset.maxDivinityEffect === "1";
            return `<li class="${limited ? "max-one-divinity" : ""}"><small>${escapeHtml([tree, type].filter(Boolean).join(" · "))}</small><span>${escapeHtml(effect)}</span>${limited ? '<strong class="max-divinity-badge" title="Only one copy of this effect is active across equipped slates">MAX ACTIVE DIVINITY: 1</strong><small>Duplicates on other slates do not stack.</small>' : ""}</li>`;
          });
        return chosen.length ? `<section><h3>${title}</h3><ul>${chosen.join("")}</ul></section>` : "";
      })
      .join("") || "<p>Choose affixes to preview their effects.</p>";
}
document.addEventListener("change", (event) => {
  if (event.target.matches("#slate-crafter-body .slate-affix-row select")) updateSlateCraftPreview();
});
document.addEventListener("input", (event) => {
  if (event.target.matches("#slate-crafter-body [data-slate-craft-name]")) updateSlateCraftPreview();
});
function openCraftedSlateEditor(slate) {
  editingCraftedSlateId = slate.id;
  selectedNetherSlateType = slate.name.split("Nether King's Divinity: ")[1] || "Judgment";
  selectedSlateGod = slate.god === "Nether King" ? "Goddess of Deception" : slate.god;
  activeSlateCrafterTab =
    slate.god === "Nether King" ? "judgment" : slate.rarity === "legendary" ? "legendary" : "craft";
  selectedLegendarySlateName = activeSlateCrafterTab === "legendary" ? slate.template || slate.name : "";
  renderSlateCrafter();
  if (activeSlateCrafterTab === "legendary") {
    const preview = $(".slate-shape-preview");
    const copyRule = $("[data-sparks-copy-rule]");
    if (copyRule) {
      const savedRule = slate.copyRule || slate.affixes?.[0];
      if (sparksOfMothFireCopyRules.includes(savedRule)) copyRule.value = savedRule;
    }
    const legendaryRule = $("[data-legendary-copy-rule]");
    if (legendaryRule && spaceRiftCopyRules.includes(slate.copyRule)) legendaryRule.value = slate.copyRule;
    // Pedigree slots hold rolled talent nodes; a saved value outside the slot's pool is cleared here only (storage changes on Save).
    const pedigree =
      selectedLegendarySlateName === PEDIGREE_OF_GODS ? normalizePedigreeAffixes(slate.affixes || []) : null;
    if (pedigree?.cleared.length)
      document
        .querySelector("[data-legendary-affix]")
        ?.closest("fieldset")
        ?.querySelector("legend")
        ?.insertAdjacentHTML(
          "afterend",
          `<p class="notice" data-pedigree-slot-notice>Pedigree of Gods slots hold rolled talent nodes only. The saved value in slot ${pedigree.cleared.map((item) => item.slot).join(", ")} is not a valid node and was cleared; choose the node shown on your slate.</p>`,
        );
    [...document.querySelectorAll("[data-legendary-affix]")].forEach((select, index) => {
      const affix = (pedigree ? pedigree.affixes : slate.affixes)?.[index] || "";
      if (affix && ![...select.options].some((option) => option.value === affix)) select.add(new Option(affix, affix));
      select.value = affix;
    });
    if (preview?.firstElementChild) {
      preview.dataset.rotation = String(slate.rotation || 0);
      preview.dataset.flipX = String(slate.flipX || 1);
      preview.dataset.flipY = String(slate.flipY || 1);
      preview.firstElementChild.style.transform = `rotate(${slate.rotation || 0}deg) scale(${slate.flipX || 1}, ${slate.flipY || 1})`;
    }
    const template = [...document.querySelectorAll("[data-slate-template]")].find(
      (button) => button.dataset.slateTemplate === slate.name,
    );
    if (template && !preview) {
      template.classList.add("active");
      const card = $(".slate-empty-preview"),
        image = template.querySelector("img");
      card.className = "slate-craft-card";
      card.innerHTML = `${image?.outerHTML || ""}<strong>${escapeHtml(slate.name)}</strong><small>DIVINITY SLATE · LEGENDARY</small>`;
    }
    updateSlateCraftPreview();
    return;
  }
  const name = $("[data-slate-craft-name]");
  if (name) name.value = slate.name;
  const shape = [...document.querySelectorAll("[data-craft-shape]")].find(
    (button) => button.dataset.craftShape === slate.shape,
  );
  if (shape) {
    document
      .querySelectorAll("[data-craft-shape]")
      .forEach((button) => button.classList.toggle("active", button === shape));
    const art = shape.querySelector("img,.god-slate-shape"),
      preview = $(".slate-shape-preview");
    if (art && preview) {
      preview.innerHTML = art.outerHTML;
      preview.dataset.rotation = String(slate.rotation);
      preview.dataset.flipX = String(slate.flipX);
      preview.dataset.flipY = String(slate.flipY);
      preview.firstElementChild.style.transform = `rotate(${slate.rotation}deg) scale(${slate.flipX}, ${slate.flipY})`;
    }
  }
  [...document.querySelectorAll("#slate-crafter-body .slate-affix-row select")].forEach((select, index) => {
    const savedGroups = slateCraftedAffixGroups(slate);
    const savedSlots = [
      ...savedGroups.fixed,
      ...Array(Math.max(0, 2 - savedGroups.fixed.length)).fill(""),
      ...(savedGroups.random || savedGroups.brand || []),
    ];
    const affix = savedSlots?.[index] || "";
    if (affix && ![...select.options].some((option) => option.value === affix)) select.add(new Option(affix, affix));
    select.value = affix;
  });
  updateSlateCraftPreview();
}
function renderSlateEditor(slate) {
  const affixes = slateAffixes(slate),
    rules = slateTransformRules(slate);
  $("#slate-editor-title").textContent = `Edit ${titleCase(slate.rarity)} Slate`;
  $("#slate-editor-content").innerHTML =
    `<div class="slate-editor-layout"><section><p class="eyebrow">Legendary template</p><h2>${slate.name}</h2><div class="slate-editor-shape"><img src="${slate.icon || slate.cellIcon || ""}" alt=""><div>${rules.rotate ? `<button type="button" data-slate-rotate="${slate.id}" data-slate-rotate-dir="1">↻ Rotate</button><button type="button" data-slate-rotate="${slate.id}" data-slate-rotate-dir="-1">↶ Rotate back</button>` : ""}${rules.flip ? `<button type="button" data-slate-flip="${slate.id}" data-slate-flip-axis="x">↔ Flip H</button><button type="button" data-slate-flip="${slate.id}" data-slate-flip-axis="y">↕ Flip V</button>` : ""}${!rules.rotate && !rules.flip ? "Orientation is fixed" : ""}</div></div><fieldset><legend>Affixes (${affixes.length})</legend>${affixes.map((effect, index) => `<label class="slate-affix-row"><span>Slot ${index + 1}</span><input type="text" data-slate-affix="${index}" value="${escapeHtml(effect)}"></label>`).join("")}<button type="button" class="button button-secondary add-affix" data-add-slate-affix>Add affix</button></fieldset></section><aside><span>Preview</span><div class="slate-craft-card"><strong>${slate.name}</strong><small>DIVINITY SLATE · ${slate.rarity.toUpperCase()}</small></div></aside></div><div class="slate-editor-footer"><button type="button" class="button button-secondary" data-close-slate-editor>Cancel</button><button type="button" class="button" data-save-slate-editor="${slate.id}">Save Changes</button></div>`;
}

// The Divinity Slates board (apps/web/src/features/slates) re-reads its source (src/app/bridge/slates-view-model.ts).
function renderSlates() {
  viewSourceChanged("slates");
}

const skillRoleLabels = {
  main: "Main damage",
  empower: "Empower",
  elixir: "Elixir",
  curse: "Curse",
  aura: "Precise aura",
};

// The Skills section (apps/web/src/features/skills) re-reads its source (src/app/bridge/skills-view-model.ts).
function renderSkills() {
  viewSourceChanged("skills");
}

function selectorEntries() {
  if (selectorKind === "skill")
    return tlidbSkillCatalogSs13.filter((entry) =>
      activeSkillBoardTab === "auras"
        ? entry.role === "aura"
        : entry.role !== "aura" ||
          (heroCanPlaceMagusInActiveSlot(plannerState.hero.selectedHeroId) && isSpiritMagusSkill(entry)),
    );
  if (selectorKind === "hero-support") return heroTraitSupportOptions();
  const setup = selectorTargetSetup();
  if (!setup) return tlidbSupportCatalogSs13;
  const skillTags = tlidbSkillCatalogSs13.find((entry) => entry.name === setup.name)?.tags || [];
  return tlidbSupportCatalogSs13.filter((entry) => {
    if (selectorKind === "support" && !supportFitsSlot(entry, selectorTargetSupportSlot)) return false;
    if (entry.exclusiveFor) return entry.exclusiveFor === setup.name;
    if (setup.role === "aura") {
      // The game's tag filter decides when the aura and the support both have a stone record (src/engine/supports/support-compatibility.js).
      if (
        gameRuleDecides(
          entry,
          tlidbSkillCatalogSs13.find((skill) => skill.name === setup.name),
        )
      )
        return supportCanSupportSkill(
          entry,
          tlidbSkillCatalogSs13.find((skill) => skill.name === setup.name),
          setup.supports,
        );
      if (entry.name === "Blind" && skillTags.includes("Spirit Magus")) return true;
      if (
        skillTags.includes("Focus") &&
        !entry.passiveOnly &&
        supportCanSupportSkill(
          entry,
          tlidbSkillCatalogSs13.find((skill) => skill.name === setup.name),
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
        tlidbSkillCatalogSs13.find((skill) => skill.name === setup.name),
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
            ? plannerState.hero.heroTraitSupportConfigs?.[activeHeroTraitSupportId]
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
function selectorBoardSetups(traitGrants = false) {
  return skillBoardRows(currentEditedSetups(), plannerState.skills.boardSlots, activeSkillBoardTab, { traitGrants });
}
function auraFamilyName(name) {
  return String(name || "")
    .replace(/^Precise:\s*/i, "")
    .trim()
    .toLowerCase();
}
function selectorTargetSetup() {
  const board = selectorBoardSetups(selectorKind === "support");
  return (
    (selectorTargetSetupName && board.find((setup) => setupStateKey(setup) === selectorTargetSetupName)) ||
    board[selectorTargetRow] ||
    null
  );
}
function selectorTargetSupport() {
  if (selectorKind === "hero-support") {
    const name = plannerState.hero.heroTraitSupports?.[activeHeroTraitSupportId] || "";
    const entry = tlidbSupportCatalogSs13.find((support) => support.name === name);
    return entry
      ? {
          ...entry,
          level: plannerState.hero.heroTraitSupportLevels?.[activeHeroTraitSupportId] || entry.level || 20,
          specialConfig: plannerState.hero.heroTraitSupportConfigs?.[activeHeroTraitSupportId],
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
// The skill selector's data (apps/web/src/shell/dialogs/SkillSelectorDialog.tsx): the title and list, which the dialog
// filters by its search box, and the highlighted choice's detail and Confirm button (skillSelectorDetail).
function skillSelectorSource() {
  const result = (entry, index, tintClass = "") => ({
    index,
    ...displayTexts({ name: entry.name, tags: [...(entry.tags || ["Support"])] }),
    icon: entry.icon,
    tintClass,
    search: [entry.name, ...(entry.tags || []), ...(entry.effects || [])].join(" ").toLowerCase(),
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
        ? `Support for ${heroTraitSupportConfig[activeHeroTraitSupportId]?.skill || "trait skill"}`
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
const rangeText = ({ min, max }) => (min === max ? min : `${min}–${max}`);
const rollControl = (range, value, index = 0) => ({ index, min: range.min, max: range.max, step: range.step, value });
// The skill selector's detail (apps/web/src/shell/dialogs/SkillSelectorDetail.tsx) for the highlighted choice, and its
// Confirm button. A follower skill's detail is still the HTML of src/app/follower-panel.js followerSkillSelectorView.
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
      detail: { kind: "empty", message: `Select a ${selectorKind} to configure` },
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

// The Config card is React (apps/web/src/features/configuration): it re-reads its source.
function renderConfiguration() {
  viewSourceChanged("configuration");
}

// The Stats view is React (apps/web/src/features/stats): it re-reads its source.
function renderCharacter() {
  viewSourceChanged("stats");
}
// The Stats view's data (src/app/bridge/stats-view-model.ts). The stat sheet is prepared once per calculated build and
// picked skill, the damage path once per calculated build (from a second calculation at 30% target Fire Resistance):
// switching panels or paths, or leaving a recount source out of the view, prepares neither again.
let preparedStatSheet = null,
  preparedDamagePath = null;
function statsSource() {
  const planner = currentPlanner();
  if (preparedStatSheet?.planner !== planner || preparedStatSheet.skill !== selectedStatSheetSkill)
    preparedStatSheet = {
      planner,
      skill: selectedStatSheetSkill,
      sheet: prepareStatSheet(planner, selectedStatSheetSkill, format),
    };
  if (preparedDamagePath?.planner !== planner) {
    const theoretical = calculatePlanner({
      ...capturePlannerState(),
      combat: { ...plannerState.combat, targetFireResistancePercent: 30 },
    }).theoretical;
    preparedDamagePath = { planner, path: prepareDamagePath(theoretical, planner, format) };
  }
  return statsView(
    { sheet: preparedStatSheet.sheet, damagePath: preparedDamagePath.path },
    { panel: activeStatsPanel, path: selectedDamagePath, excluded: recountExcludedSources() },
  );
}
// Open questions "Copy questions": plain text of the build's applicable questions; false when the clipboard refused it.
async function copyOpenQuestions() {
  const planner = currentPlanner();
  const text = openQuestionsText(openQuestionsFor(planner, planner?.state));
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    showToast("Clipboard access was unavailable");
    return false;
  }
}
// "Submit an answer" on an open question: the answer dialog for it, pre-filled.
function submitOpenQuestion(id) {
  const entry = OPEN_QUESTIONS.find((item) => item.id === id);
  if (!entry) return;
  persistPlannerState();
  feedbackDialog.open("answer", {
    entry,
    version: APP_VERSION,
    platform: platformName(window),
    buildCode: currentBuildCode(),
  });
}
// Report buttons: each opens the in-planner feedback dialog (src/app/feedback/feedback-dialog.js) with its GitHub form's fields; "Send to
// GitHub" puts the compact build code in the URL when it is included and fits (else copies it) and opens the pre-filled
// issue form in a new tab (the desktop app hands it to the system browser, electron/main.cjs setWindowOpenHandler).
const feedbackDialog = createFeedbackDialog({ dialog: $("#feedback-dialog"), toast: showToast });
function currentBuildCode() {
  try {
    return encodePlannerState(plannerState);
  } catch {
    return "";
  }
}
function reportCalculation() {
  persistPlannerState();
  const context = calculationReportContext(currentPlanner(), selectedStatSheetSkill);
  feedbackDialog.open("calculation", {
    ...context,
    version: APP_VERSION,
    platform: platformName(window),
    buildCode: currentBuildCode(),
  });
}
$("[data-report-bug]").addEventListener("click", () => {
  persistPlannerState();
  feedbackDialog.open("bug", {
    area: bugAreaForView({ view: activeWorkspaceView, statsPanel: activeStatsPanel, slateMode: talentSlateMode }),
    version: APP_VERSION,
    platform: platformName(window),
    buildCode: currentBuildCode(),
  });
});
const tooltipSelector =
  "[data-damage-source],.talent-node,.core-talent,.equipment-item,.inventory-item,.skill-setup,.support-card:not(.add-support-card),[data-skill-tooltip],[data-support-tooltip],.skill-primary-socket:not(.empty-skill-slot),[data-hero-trait-support-id],[data-hero-trait-tooltip],[data-tree-extra-row-tooltip],[data-sage-scent-tooltip],.hero-memory-socket.filled,.hero-memory-item,.pactspirit,.kismet-toggle,.micro-quantity,.slate-chip,.slate-piece,.crafted-slate-item,[data-pactspirit-name],[data-pact-node-tooltip],[data-follower-skill-tooltip],[data-follower-tooltip],[data-qol-help]";
let tooltipAnchorX = 0,
  tooltipAnchorY = 0;
let tooltipAnchorElement = null;
function savedMemoryAffix(memory, group, index) {
  const effect = memory[group]?.[index];
  if (!effect) return "";
  const fixed = group === "fixedAffixes",
    tier = memory[fixed ? "fixedTiers" : "randomTiers"]?.[index],
    roll = memory[fixed ? "fixedRolls" : "randomRolls"]?.[index];
  const catalog = fixed && tier === 0 ? heroMemoryFixedT0AffixesSs13 : heroMemoryTierAffixesSs13;
  const match = catalog.find(
    (entry) =>
      entry.type === memory.type &&
      entry.kind === (fixed ? "Fixed Affix" : "Random Affix") &&
      entry.tier === tier &&
      memoryAffixKey(entry.baseEffect || entry.effect) === memoryAffixKey(effect),
  );
  const tierEffect = match?.effect || effect,
    range = memoryRollRange(tierEffect);
  return rolledMemoryAffix(
    tierEffect,
    range && Number.isFinite(roll) ? Math.max(range.min, Math.min(range.max, roll)) : roll,
  );
}
function memoryAffixRowContent(effect, tier) {
  return `${Number.isInteger(tier) ? affixTierBadge(`T${tier}`) : ""}<span>${escapeHtml(effect)}</span>`;
}
function heroMemoryTooltipContent(element) {
  const id =
    element.dataset.memoryInventoryId ||
    (element.dataset.memoryTier === "base"
      ? plannerState.hero.baseTraitMemoryId
      : plannerState.hero.equippedMemoryIds?.[element.dataset.memoryTier]);
  const memory = plannerState.hero.memoryInventory?.find((item) => item.id === id);
  if (!memory) return null;
  const baseSlotted = plannerState.hero.baseTraitMemoryId === id,
    reduction = baseSlotted ? baseTraitReduction() : null;
  const memoryModel = currentPlanner().heroMemories;
  const equipped =
    Object.values(plannerState.hero.equippedMemoryIds || {}).includes(id) || (baseSlotted && reduction !== null);
  const status = (text) => heroMemoryLineCoverage(memoryModel, id, text, equipped);
  const section = (label, entries) =>
    entries.length
      ? `<section${label === "Implicit" ? ` class="memory-implicit ${memory.waxAndWane ? "wax-applied" : ""}"` : ""}><h4>${label}</h4>${entries.map((entry) => (typeof entry === "string" ? `<p>${escapeHtml(entry)} ${coverageBadge(status(entry))}</p>` : `<div class="memory-affix-row">${memoryAffixRowContent(entry.effect, entry.tier)} ${coverageBadge(entry.status || status(entry.effect))}</div>`)).join("")}</section>`
      : "";
  const fixed = (memory.fixedAffixes || [])
    .map((_, index) => ({ effect: savedMemoryAffix(memory, "fixedAffixes", index), tier: memory.fixedTiers?.[index] }))
    .filter((entry) => entry.effect);
  const random = (memory.randomAffixes || [])
    .map((_, index) => ({
      effect: savedMemoryAffix(memory, "randomAffixes", index),
      tier: memory.randomTiers?.[index],
    }))
    .filter((entry) => entry.effect)
    .map((entry) => ({
      ...entry,
      effect: reduction === null ? entry.effect : reduceBaseTraitMemoryStat(entry.effect, reduction),
    }));
  const implicitText = memoryScaledBaseStat(
    memory.baseStat,
    memory.type,
    memory.enhancementLevel,
    memory.waxAndWane,
    memory.rarity,
  );
  const implicit = reduction === null ? implicitText : reduceBaseTraitMemoryStat(implicitText, reduction);
  const revival = [
    memory.waxAndWane ? "Wax and Wane · +30% base stat" : "",
    memory.risingMoon ? "Rising Moon · fixed affix tier increased" : "",
  ].filter(Boolean);
  return {
    memoryHtml: `<div class="memory-tooltip-head"><img src="${heroMemoryIcon(memory.type)}" alt=""><div><strong>${escapeHtml(memory.name || memory.type)}</strong><small>${escapeHtml(memory.rarity || "normal").toUpperCase()} · HERO MEMORY</small></div></div>${memoryRevivalBadge(memory)}<div class="memory-tooltip-body"><p>Enhancement Level <b>${memory.enhancementLevel}/${memoryMaxEnhancementForRarity(memory.rarity)}</b></p><p>Trait Level <b>+${traitLevelBonusForEnhancement(memory.enhancementLevel)}</b></p>${reduction === null ? "" : `<p>Base Trait Slot <b>${reduction}% to base stats and random affixes</b></p>`}${section("Implicit", [implicit])}${section(
      "Memory Revival",
      revival.map((effect) => ({ effect, status: equipped ? "Applied to rolls" : "Not equipped" })),
    )}${memory.revivedAffix ? `<section><h4>Revived Affix${lunarPhaseRevivedAffixesSs13.includes(normalizeRevivedAffix(memory.revivedAffix)) ? " · Lunar Phase" : ""}</h4>${memoryRevivedAffixMarkup(memory)}${memory.revivedAffix === "Ceaseless Tide" ? `<p>When equipped on Sing with the Tide: +80% additional Tide Effect and ×0.8 cast speed while in Bard. Movement is not simulated.</p>` : ""}${coverageBadge(!equipped ? "Not equipped" : memory.revivedAffix === "Ceaseless Tide" && memoryModel.ceaselessTide ? "In calc" : equippedBaseTraitSlot(plannerState.hero)?.source.id === memory.id ? "Enables base slot" : (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.status || "Not modeled", (catsNightSafariStatus(currentPlanner(), memory) || revivedAffixCoverage(currentPlanner(), memory))?.reason || "")}</section>` : ""}${section("Fixed Affixes", fixed)}${section("Random Affixes", random)}</div><small>${element.dataset.memoryInventoryId ? "Right-click to equip or unequip" : "Right-click to unequip"}</small>`,
    rarity: memory.rarity || "normal",
  };
}
function slateTooltipContent(element) {
  const id = element.dataset.slateId || element.dataset.craftedSlateInventory;
  const slate = slatesForBoard().find((item) => item.id === id);
  if (!slate) return null;
  const icon = slate.icon || slate.cellIcon || "";
  const pose = slatePlacements[id] || parkedSlates[id] || slate;
  const rotation = (((Number(pose.rotation) || 0) % 360) + 360) % 360;
  const flipX = Number(pose.flipX) === -1 ? -1 : 1,
    flipY = Number(pose.flipY) === -1 ? -1 : 1;
  const affixes = slateAffixes(slate);
  const affected = judgmentAffectedSlateIds(slatesForBoard(), slatePlacements, equippedSlateIds).has(slate.id);
  const judgmentContext = {
    linked: affected,
    ownAuthority: Boolean(isActiveJudgment(slate) && equippedSlateIds.has(slate.id) && slatePlacements[slate.id]),
  };
  const displayed = (affix) =>
    scaleJudgmentAffix(affix, slate.amplifiedPercent || 0, judgmentAffixTargetPercent(slate, affix, judgmentContext));
  const limited = new Set(
    Object.values(divinitySlateAffixesSs13)
      .flat()
      .filter((affix) => affix.maxDivinityEffect === 1)
      .map((affix) => `${affix.tree}: ${affix.name}: ${affix.effect}`),
  );
  const renderAffixRows = (entries) =>
    entries
      .filter(Boolean)
      .map((affix) => {
        const core = affix.match(/^(.+?): (Lv\.[12] Core Talent): (.+?)(?:\s+[—–]\s+|$)/);
        return `<li class="${core ? "core-slate-affix" : ""} ${limited.has(affix) ? "max-one-divinity" : ""}">${core ? `<strong class="core-slate-badge">Core Talent</strong><span class="core-slate-summary">${coloredSlateAffix(`${core[1]}: ${core[3]}`)}</span><small class="core-slate-hint">Hold Alt for details</small><span class="core-slate-detail">${coloredSlateAffix(displayed(affix))}</span>` : `<span>${coloredSlateAffix(displayed(affix))}</span>`}<div class="slate-affix-badges">${limited.has(affix) ? '<strong class="max-divinity-badge" title="Only one copy of this effect is active across equipped slates">Max active: 1</strong>' : ""}${coverageBadge(/^Copies?\b/i.test(affix) ? (equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id] ? "In calc" : "Not equipped") : slateLineCoverage(displayed(affix), equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id]))}</div></li>`;
      })
      .join("");
  const template = slate.template || slate.name;
  const craftedGroups =
    slate.affixes && !legendaryTalentSlotTypes[template] && !slate.copyRule ? slateCraftedAffixGroups(slate) : null;
  const groups = craftedGroups
    ? [
        ["Fixed Affixes", craftedGroups.fixed],
        ["Random Affixes", craftedGroups.random || craftedGroups.brand || []],
      ]
    : slate.brands
      ? [
          ["Fixed Affixes", affixes],
          ["Brand Talent Nodes", slate.brands],
        ]
      : legendaryTalentSlotTypes[template]
        ? [["Talent Affixes", affixes]]
        : slate.copyRule
          ? [["Fixed Affix", affixes.length ? affixes : [slate.copyRule]]]
          : [
              ["Fixed Affixes", affixes.slice(0, 2)],
              ["Random Affixes", affixes.slice(2)],
            ];
  const affixSections = groups
    .map(([title, entries]) => {
      const rows = renderAffixRows(entries);
      return rows ? `<section><h3>${title}</h3><ul>${rows}</ul></section>` : "";
    })
    .join("");
  const copySlate = isCopySlate(slate);
  const placed = equippedSlateIds.has(slate.id) && !!slatePlacements[slate.id];
  const copied =
    copySlate && placed
      ? currentPlanner().resolvedSlates.find((item) => item.id === slate.id)?.copiedAffixSources || []
      : [];
  const copiedSection = copySlate
    ? `<section class="slate-copied-affixes"><h3>Copied affixes</h3>${copied.length ? `<ul>${copied.map(({ source, affix }) => `<li><div class="copied-affix-meta"><small>${escapeHtml(source)}</small><strong class="copied-affix-badge">Copied</strong></div><span>${coloredSlateAffix(affix)}</span>${coverageBadge(slateLineCoverage(affix, placed))}</li>`).join("")}</ul>` : `<p>${placed ? "No eligible adjacent affixes to copy." : "Place on the grid to see copied affixes."}</p>`}</section>`
    : "";
  return {
    slateHtml: `<div class="slate-tooltip-head ${slateGodFamilyClass(slate.god)}">${icon ? `<img src="${escapeHtml(icon)}" alt="" style="transform:scale(${flipX},${flipY}) rotate(${rotation}deg)">` : ""}<div><strong>${escapeHtml(slate.name)}</strong><small>DIVINITY SLATE · ${escapeHtml(slate.rarity || "magic").toUpperCase()}</small></div></div>${affected ? '<div class="slate-judgment-badge">Judgment · Affix effect +70%</div>' : ""}<div class="slate-craft-affix-preview">${affixSections || `<p>${copySlate ? "Copy effect" : "No affixes selected."}</p>`}${copiedSection}</div>`,
  };
}
function skillTooltipContent(element) {
  const heroSupportId = element.dataset.heroTraitSupportId;
  const boardSetups = skillBoardRows(currentEditedSetups(), plannerState.skills.boardSlots, activeSkillBoardTab, {
    traitGrants: true,
  });
  const rowSetup = boardSetups[Number(element.dataset.selectorRow)];
  const supportSlot = Number(element.dataset.selectorSupportSlot);
  const supportName =
    element.dataset.supportTooltip ||
    (Number.isInteger(supportSlot) ? rowSetup?.supports?.filter((entry) => entry.enabled)[supportSlot]?.name : "");
  const skillName =
    element.dataset.skillTooltip ||
    element.dataset.parentSkill ||
    heroTraitSupportConfig[heroSupportId]?.skill ||
    rowSetup?.name;
  const setup =
    (element.closest("#skill-groups") ? rowSetup : null) ||
    currentEditedSetups().find((entry) => entry.name === skillName) ||
    rowSetup;
  const heroInstalled =
    heroSupportId && supportName
      ? {
          ...tlidbSupportCatalogSs13.find((entry) => entry.name === supportName),
          level: plannerState.hero.heroTraitSupportLevels?.[heroSupportId] || 20,
          specialConfig: plannerState.hero.heroTraitSupportConfigs?.[heroSupportId],
        }
      : null;
  const installed =
    heroInstalled || (supportName ? setup?.supports.find((entry) => entry.name === supportName) : setup);
  const catalog = supportName
    ? tlidbSupportCatalogSs13.find((entry) => entry.name === supportName)
    : tlidbSkillCatalogSs13.find((entry) => entry.name === skillName);
  if (!installed && !catalog) return null;
  const name = supportName || skillName,
    level = installed?.effectiveLevel || installed?.level || catalog?.level || catalog?.baseLevel || 20;
  const levelLabel = installed?.baseLevel !== undefined ? skillLevelLabel(installed) : `Lv. ${level}`;
  const tags = catalog?.tags || [supportName ? "Support" : skillRoleLabels[setup?.role] || "Skill"];
  const skillDisplay = !supportName && catalog ? skillDisplaySs13(catalog, level) : null;
  const supportDisplay = supportName && catalog ? supportDisplaySs13(catalog, level) : null;
  const facts = skillDisplay?.facts || supportDisplay?.facts || [];
  const detailEffects = installed?.displayEffects || installed?.effects || catalog?.effects || [];
  const observed =
    setup && !supportName
      ? Object.entries(setup.observed || setup.databaseLevel20 || {})
          .slice(0, 5)
          .map(([key, value]) => `${titleCase(key)}: ${Array.isArray(value) ? value.join("–") : value}`)
      : [];
  const effects = skillDisplay?.effects?.length
    ? skillDisplay.effects
    : supportDisplay?.effects?.length
      ? supportDisplay.effects
      : detailEffects.length
        ? detailEffects
        : observed;
  const icon = supportName ? catalog?.icon || tliArt.supports[name] : catalog?.icon || tliArt.skills[name];
  const specialTiers = supportName ? configurableSupportTierData(name) : null;
  const progressionTiers = supportName ? progressionSupportTierData(name) : null;
  const specialConfig =
    specialTiers || progressionTiers
      ? normalizeProgressionSupportConfig(name, installed?.specialConfig) ||
        defaultConfigurableSupportConfig(name, installed?.effects || catalog?.effects)
      : null;
  const specialTier = specialTiers?.find((entry) => entry.tier === specialConfig?.tier);
  const progressionTier = progressionTiers?.find((entry) => entry.tier === specialConfig?.tier);
  const secondaryTiers = supportName ? activationMediumSecondaryTierData(name) : null;
  const secondaryTier = secondaryTiers?.find((entry) => entry.tier === specialConfig?.secondaryTier);
  const headerMeta = Number.isFinite(specialConfig?.stars)
    ? `<small class="special-support-stars" aria-label="${specialConfig.stars} stars">${"★".repeat(specialConfig.stars)}${"☆".repeat(5 - specialConfig.stars)} <em>${specialConfig.stars}/5</em></small><small>${levelLabel}</small>`
    : `<small>${specialConfig ? `Tier ${specialConfig.tier} · ${levelLabel}` : !supportName && setup ? skillLevelLabel(setup) : levelLabel}</small>`;
  const effectReference = skillDisplay?.effectEstimate
    ? `<p class="skill-effect-reference">${escapeHtml(skillDisplay.effectEstimate)}</p>`
    : ((skillDisplay && !skillDisplay.hasLevelProgression) ||
          (supportDisplay && !supportDisplay.hasLevelProgression && !specialTier && !progressionTier)) &&
        level !== 20
      ? ""
      : "";
  const displayEffects =
    specialConfig && progressionTier
      ? [
          ...(activationMediumSelectedLines(name, specialConfig)?.map((line) => `T${line.tier} · ${line.text}`) ||
            progressionSupportText(name, specialConfig)
              .split(" | ")
              .map((line, index) => (index ? line : `Main affix · T${progressionTier.tier} · ${line}`))),
          ...(progressionSupportHasStars(name)
            ? [`Star level · +${specialSupportStarBonus(specialConfig.stars)}% additional damage`]
            : []),
        ]
      : specialConfig && specialTier
        ? [
            ...(name === "Activation Medium: Spell Burst"
              ? [
                  supportDisplay?.effects?.[0] ||
                    catalog?.effects?.[0] ||
                    "Triggers the supported skill when activating Spell Burst. Interval: 0.1s",
                ]
              : []),
            ...(secondaryTier
              ? [
                  `Activation affix · T${specialConfig.secondaryTier} · Prepares the supported skill every ${specialConfig.secondaryRoll} s`,
                ]
              : []),
            `Main affix · T${specialConfig.tier} · ${specialConfig.roll >= 0 ? "+" : ""}${specialConfig.roll}% ${specialConfig.rollKind ? `additional ${specialConfig.rollKind === "cooldown" ? "Cooldown Recovery Speed" : "Duration"} for the supported skill` : specialTier.effect}`,
            ...(Number.isFinite(specialConfig.stars)
              ? [
                  `Star bonus · ${specialConfig.stars} ★ · +${specialSupportStarBonus(specialConfig.stars)}% additional damage`,
                ]
              : []),
          ]
        : effects;
  const isAura = !supportName && (catalog?.role === "aura" || setup?.role === "aura");
  const supportCoverageArgs = {
      skillName: setup?.name || skillName,
      supportName,
      installed: Boolean(installed),
      enabled: !(setup?.enabled === false || installed?.enabled === false),
    },
    supportClauses = supportName ? supportClauseCoverage(currentPlanner(), supportCoverageArgs) : [],
    supportOverall = supportName ? classifySkillCoverage(currentPlanner(), supportCoverageArgs) : null,
    supportLineBadge = (line) => {
      const lineCoverage = supportLineCoverage(supportClauses, line, supportOverall);
      return lineCoverage
        ? ` ${coverageBadge(lineCoverage.status, lineCoverage.reason ? `${lineCoverage.status}: ${lineCoverage.reason}` : "")}`
        : "";
    },
    effectsHtml = `${effectReference}<div class="skill-tooltip-effect-list"><h4>${escapeHtml(name)}:</h4>${(displayEffects.length
      ? displayEffects
      : ["See TLIDB for complete level scaling."]
    )
      .map(
        (effect) =>
          `<p>${
            supportName
              ? String(effect)
                  .split("\n")
                  .map((line) => `${highlightedSupportEffect(line)}${supportLineBadge(line)}`)
                  .join("\n")
              : isAura
                ? highlightedAuraEffect(effect)
                : highlightedSkillEffect(effect, name)
          }</p>`,
      )
      .join("")}</div>`;
  const coverage = classifySkillCoverage(currentPlanner(), {
    skillName: supportName ? setup?.name || skillName : name,
    supportName: supportName || "",
    installed: Boolean(installed),
    enabled: !(setup?.enabled === false || installed?.enabled === false),
  });
  return {
    supportTooltip: Boolean(supportName),
    auraTooltip: isAura,
    skillHtml: `<div class="skill-tooltip-head"><img src="${icon || ""}" alt=""><div><strong>${escapeHtml(name)}</strong>${headerMeta}</div></div><div class="skill-tooltip-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}${coverageBadge(coverage.status, coverage.reason ? `${coverage.status}: ${coverage.reason}` : "")}</div>${!supportName && curseSkillLeftOut(name) ? curseLimitNoteHtml(curseLimitState()?.reason) : ""}${traitGrantNoteHtml(installed)}<div class="skill-tooltip-facts">${facts.map(([label, value]) => `<div class="${label === "Effectiveness of Added Damage" ? "skill-added-damage-stat" : ""}"><span>${escapeHtml(String(label))}</span><b>${escapeHtml(String(value))}</b></div>`).join("")}</div>${effectsHtml}${catalog?.source || setup?.source ? `<small class="skill-tooltip-source">${heroSupportId || element.dataset.carinoSupportSlot !== undefined ? "Click to edit · Right-click to remove" : "TLIDB · hover details"}</small>` : ""}`,
  };
}
function gearTooltipContent(element) {
  const inventoryId = element.dataset.equipInventory;
  const item = inventoryId
    ? inventoryItems().find((entry) => entry.id === inventoryId)
    : currentEquipmentImpact().allItems.find((entry) => entry.slot === element.dataset.equipmentSlot);
  if (!item || (!inventoryId && disabledEquipmentSlots.has(item.slot))) return null;
  const rarity = titleCase(itemDisplayRarity(item));
  const active = inventoryId ? isItemEquipped(item) : !disabledEquipmentSlots.has(item.slot);
  const impact = currentEquipmentImpact();
  const corrodedIndices = new Set(item.corrodedModifierIndices || []),
    kindCodes = {
      Implicit: "I",
      "Implicit · Corroded": "I",
      "Base Affix": "BA",
      "Belt Blend": "BL",
      "TOWER Sequence": "TS",
      Prefix: "P",
      Suffix: "S",
      "Legendary Mod": "L",
      "Corrosion Implicit": "C",
      Affix: "A",
    };
  const sections = itemModifierSections(item).map((section) => ({
    ...section,
    entries: section.entries.map((entry) => {
      const corroded = entry.tone === "corrosion" || corrodedIndices.has(entry.index),
        legendary = entry.tone === "legendary" || entry.badge === "L";
      const status = gearLineCoverage(
          item,
          entry.text,
          active,
          currentPlanner().block,
          currentPlanner().lowResources,
          currentPlanner().blurEffects,
        ),
        curseReason = active ? curseLineLeftOutReason(entry.text, item) : "";
      return {
        ...entry,
        legendary,
        status,
        curseReason,
        tone: corroded ? "corrosion" : status === "In calc" ? "calculated" : "pending",
        kind: corroded ? "C" : kindCodes[section.label] || "A",
      };
    }),
  }));
  return {
    title: item.name,
    rarity: rarity.toLowerCase(),
    sixAffix: hasSixCraftAffixes(item),
    priceless: isPricelessItem(item),
    itemLevel100: Boolean(itemLevel100Class(item)),
    html: `<div class="gear-tooltip-head"><img src="${gearIcon(item)}" alt=""><strong>${escapeHtml(item.name)}</strong><div><span>${escapeHtml(item.base || titleCase(item.slot))}</span><em class="${rarity.toLowerCase()}">${rarity}</em></div></div><div class="gear-tooltip-body">${curseLimitNoteHtml(sections.flatMap((section) => section.entries).find((row) => row.curseReason)?.curseReason)}<span class="gear-level">Require Lv ${item.level || 1}</span>${item.energy && equipmentEnergyAllowed(item.slot) ? `<span class="gear-energy">${item.energy} Equipment Energy</span>` : ""}<div class="tooltip-mod-sections">${sections.map((section) => `<section><h4>${escapeHtml(section.label)}${section.detail ? `<small>${escapeHtml(section.detail)}</small>` : ""}</h4>${section.entries.length ? `<ul>${section.entries.map((row) => `<li class="${row.legendary ? "legendary-affix " : ""}${row.tone === "corrosion" ? "corrosion-affix" : ""}">${row.badge ? affixTierBadge(row.badge) : `<i>${row.kind}</i>`}<span>${modifierTextMarkup(row.text, (line) => gearLineCoverage(item, line, active, currentPlanner().block, currentPlanner().lowResources, currentPlanner().blurEffects))}</span><b class="${row.status === "In calc" ? "calculated" : neutralStatuses.has(row.status) ? "neutral" : "pending"}"${row.curseReason ? ` title="${escapeHtml(`${row.status}: ${row.curseReason}`)}"` : ""}>${row.status}</b></li>`).join("")}</ul>` : ""}</section>`).join("") || "<p>No modifiers configured</p>"}</div></div><small>${inventoryId ? "Click to manage · Right-click to equip" : "Click to inspect · Right-click to unequip"}</small>`,
  };
}
function sageScentTooltipContent(element) {
  const kind = element.dataset.sageScentTooltip;
  const name = plannerState.hero.sageScent?.[kind];
  const entry =
    kind === "elixir"
      ? sageElixirsSs13.find((item) => item.name === name)
      : sageScentIngredientsSs13[kind]?.find((item) => item.name === name);
  if (!entry) return null;
  const label = kind === "elixir" ? "Elixir Skill" : `${titleCase(kind)} Ingredient`;
  const tags = kind === "elixir" ? entry.tags || [] : [];
  const lines = (entry.description || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    scentHtml: `<div class="sage-tooltip-head"><img src="${escapeHtml(entry.icon)}" alt=""><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(entry.name)}</strong></div></div>${tags.length ? `<div class="sage-tooltip-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}<div class="sage-tooltip-effects">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div><small class="sage-tooltip-hint">Click to change</small>`,
  };
}
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

function plannerTooltipContent(element) {
  if (element.matches("[data-tree-extra-row-tooltip]")) return { traitHtml: treeExtraRowTooltipHtml() };
  if (element.matches("[data-qol-help]")) return { qolHtml: qolHelpTooltipHtml(element.dataset.qolHelp) };
  if (element.matches("[data-damage-source]")) return damageSourceTooltipContent(element);
  if (element.matches("[data-sage-scent-tooltip]")) return sageScentTooltipContent(element);
  if (element.matches(".core-talent")) {
    const panel = currentTalentPanel(),
      isPrism = element.classList.contains("prism");
    const installed = isPrism
      ? (plannerState.talents.prismInventory || []).find(
          (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
        )
      : null;
    const threshold = Number(element.dataset.coreSlot || 0);
    const selectedName = plannerState.talents.coreSelections[`${panel.name}:${threshold}`];
    const core = isPrism
      ? null
      : panel.coreTalents.find((item) => item.unlockPoints === threshold && item.name === selectedName);
    if (isPrism && !installed) return null;
    const title = isPrism ? installed.base : core?.name || `${threshold}-point Core Talent`;
    const icon = isPrism ? prismIcon(installed) : core && (tliArt.coreTalents[core.name] || core.icon);
    const description = isPrism
      ? prismBaseEffect(installed.type, installed.base, installed.legendaryAffix)
      : core?.description || "Choose a core talent to view its effects.";
    const lines = description
      .split(/\s*\|\s*|\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const label = isPrism
      ? prismReplacesCore(installed)
        ? "Prism core override"
        : "Separate prism effect"
      : `Core talent · ${threshold} points`;
    const badge = isPrism ? "Prism" : core ? "Selected" : element.classList.contains("locked") ? "Locked" : "Open";
    const footer = isPrism
      ? "Base prism effect"
      : core
        ? "Selected · Click to change"
        : element.classList.contains("locked")
          ? `Requires ${threshold} points in ${panel.name}`
          : "Click to select a core talent";
    const coreStatus =
      core?.name === "Subtle Impact" && !currentPlanner().conditions.blur
        ? currentPlanner().blurSources.some((source) => source.available)
          ? "Inactive"
          : "Missing Blur source"
        : !core && !installed
          ? "Not selected"
          : isPrism
            ? prismAffixCoverage(installed, "base")
            : core?.name === "Daze"
              ? dazeStatus(currentPlanner())
              : modeledCoreTalents.includes(core?.name)
                ? "In calc"
                : refineCoverage("Not independently modeled", lines.join("\n"));
    return {
      talentType: isPrism ? "prism-core" : "core",
      basicTalentHtml: `<div class="basic-talent-head"><span class="basic-talent-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(title)}</strong></div><b>${escapeHtml(badge)}</b></div><div class="basic-talent-body core-talent-body">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}${coverageBadge(coreStatus, isPrism ? prismAffixCoverageReason(installed, "base") : "")}${core?.name === "Subtle Impact" ? `<p>Damage over time only · Requires a Blur grant in the build and Blur enabled in Configuration. Conditional uptime is assumed.</p>` : core?.name === "Fueling" ? `<p>Nearby target assumed · Fire Resistance fixed at 0%.</p>` : core?.name === "True Flame" ? `<p>Fire hits only · Requires a modeled Ignite source and uses configured average Affliction.</p>` : ""}</div><footer>${escapeHtml(footer)}</footer>`,
    };
  }
  if (element.matches("[data-pact-node-tooltip]")) {
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
  if (element.matches("[data-pactspirit-name]")) {
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
  if (element.matches(".hero-memory-socket.filled,.hero-memory-item")) return heroMemoryTooltipContent(element);
  if (element.matches(".slate-piece,.crafted-slate-item")) return slateTooltipContent(element);
  if (element.matches("[data-follower-skill-tooltip]")) {
    const traitHtml = followerSkillTooltipHtml(element.dataset.followerSkillTooltip, {
      state: plannerState,
      planner: currentPlanner(),
    });
    return traitHtml
      ? {
          traitHtml,
          rarity: followerTooltipRarity({ state: plannerState, skillName: element.dataset.followerSkillTooltip }),
          followerTooltip: true,
        }
      : null;
  }
  if (element.matches("[data-follower-tooltip]")) {
    const rarityId = element.dataset.followerTooltipRarity || null,
      traitHtml = followerTooltipHtml(element.dataset.followerTooltip, {
        state: plannerState,
        planner: currentPlanner(),
        rarityId,
      });
    return traitHtml
      ? {
          traitHtml,
          rarity: followerTooltipRarity({ state: plannerState, followerId: element.dataset.followerTooltip, rarityId }),
          followerTooltip: true,
        }
      : null;
  }
  if (element.matches("[data-hero-trait-tooltip]")) {
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
        html += `<span class="trait-progression">(${values.map((value, index) => `<${index === activeIndex ? "b" : "span"} class="${index === activeIndex ? "trait-current-value" : "trait-other-value"}">${escapeHtml(value.trim())}</${index === activeIndex ? "b" : "span"}>`).join('<span class="trait-separator">/</span>')})${escapeHtml(match[2])}</span>`;
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
      traitHtml: `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(trait.name)}</strong>${coverageBadge(heroTraitCoverage(hero.id, trait.name, visibleLines, selected), heroTraitCoverageReason(hero.id, trait.name, descriptionLines, selected))}<em>Level ${traitLevel}</em></div><small class="hero-trait-unlock">Unlocks at hero level ${trait.level}</small><div class="hero-trait-effects">${visibleLines.map((line) => `<p>${emphasize(line)}</p>`).join("")}${String(levelKey).endsWith(":extra") ? `<p>${escapeHtml(EXTRA_ROW_NOTE)}</p>` : ""}${trait.name === "Sing with the Tide" ? `<p>Damage effects use the current base trait level. Bard state is assumed; bubbles, movement, Tide duration and state switching are excluded from this tag.</p>` : trait.name === "Murmurs of the Distant Tide" ? `<p>Additional Tide Effect scales the Tide damage bonuses in the stat sheet and damage path. Bard state is assumed; reduced Tide duration is ignored.</p>` : trait.name === "Idyll of the Tide" ? `<p>Stat sheet and damage path use the Idyll stack count set in Combat, defaulting to 15. Stack buildup and loss are not simulated.</p>` : trait.name === "Wave Aria" ? `<p>Damage component is included in calculations. Tide placement and duration are outside this badge’s scope.</p>` : ""}</div>${traitKeywordDetailsHtml(hero.id, visibleLines)}<small class="hero-trait-source">TLIDB · CURRENT TRAIT LEVEL ${traitLevel}</small>`,
    };
  }
  if (element.matches(".skill-primary-socket,.skill-support-socket,[data-skill-tooltip],[data-support-tooltip]"))
    return skillTooltipContent(element);
  if (element.matches(".talent-node")) {
    const panel = currentTalentPanel(),
      installed = (plannerState.talents.prismInventory || []).find(
        (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
      );
    const prismCoordinate = plannerState.talents.installedPrismNodes?.[panel.name];
    if (installed && prismCoordinate === element.dataset.coordinate) return { prismHtml: prismTooltipHtml(installed) };
    const nodes = talentDisplayNodes(panel),
      node = nodes.find((item) => item.coordinate.join(",") === element.dataset.coordinate);
    if (!node) return null;
    const rank = talentRanks.get(panel.name + ":" + node.coordinate) || 0;
    const effects = node.effectsPerRank || node.effects || {};
    const type = node.type || "micro",
      max = node.maxRank || (node.effectsPerRank ? 3 : 1),
      title = node.placeholder ? `${titleCase(type)} Talent` : nodeTitle(node);
    const icon = element.querySelector(".talent-node-art")?.getAttribute("src");
    const inverseMultiplier = node.reflectedFrom ? inverseImageEffectMultiplier(installed, type) : 1;
    const effectRows = Object.entries(effects)
      .map(
        ([key, value]) =>
          `<div class="basic-talent-effect"><span>${escapeHtml(effectLabel(key))}</span><strong>${escapeHtml(formatEffect(key, typeof value === "number" ? value * (node.effectsPerRank ? rank : 1) * inverseMultiplier : value))}</strong>${coverageBadge(talentEffectCoverage(key, value, rank))}</div>`,
      )
      .join("");
    let prismEffects = "";
    if (installed && prismCoordinate && element.classList.contains("prism-affected-node")) {
      if (installed.type === "inverse") {
        const roll = inverseImageRoll(
          installed,
          type === "legendary" ? "legendary" : type === "medium" ? "medium" : "micro",
        );
        prismEffects = node.reflectedFrom
          ? `<section class="basic-talent-prism"><h4>Inverse Image <span>Reflected from ${escapeHtml(node.reflectedFrom)}</span></h4><div class="talent-prism-affix ${rank > 0 ? "active" : "inactive"}"><b>Fixed affix</b><p>${escapeHtml(titleCase(type))} Talent Effect Range: ${roll > 0 ? "+" : ""}${roll}%</p><small>${rank > 0 ? "Active on this reflected talent" : "Allocate this reflected talent to activate"}</small></div></section>`
          : "";
      } else {
        const bounds = prismAreaBounds(installed, prismCoordinate);
        const activeLegendaryCount = nodes.filter(
          (candidate) =>
            candidate.type === "legendary" &&
            candidate.coordinate.join(",") !== prismCoordinate &&
            candidate.coordinate[0] >= bounds.left &&
            candidate.coordinate[0] < bounds.left + bounds.width &&
            candidate.coordinate[1] >= bounds.top &&
            candidate.coordinate[1] < bounds.top + bounds.height &&
            (talentRanks.get(`${panel.name}:${candidate.coordinate}`) || 0) > 0,
        ).length;
        const affixes = prismNodeAffixes(installed, node.type, rank, activeLegendaryCount);
        prismEffects = `<section class="basic-talent-prism"><h4>Prism effects <span>${escapeHtml(prismName(installed))}</span></h4>${affixes.length ? affixes.map((affix) => `<div class="talent-prism-affix ${affix.active ? "active" : "inactive"}"><b>${affix.tier} affix</b><p>${escapeHtml(affix.effect)} ${coverageBadge(affix.active ? prismAffixCoverage(installed, affix.tier === "Rare" ? "rareAffix" : "legendaryAffix") : "Inactive")}</p><small>${escapeHtml(affix.reason)}</small></div>`).join("") : '<p class="talent-prism-none">No node-specific affix applies to this talent.</p>'}</section>`;
      }
    }
    return {
      basicTalentHtml: `<div class="basic-talent-head"><span class="basic-talent-icon">${icon ? `<img src="${escapeHtml(icon)}" alt="">` : "✦"}</span><div><small>${escapeHtml(type === "legendary" ? "Legendary Medium Talent" : `${titleCase(type)} Talent`)}</small><strong>${escapeHtml(title)}</strong></div><b>${rank}/${max}</b></div><div class="basic-talent-body">${effectRows || `<p>${escapeHtml(node.description ? talentEffectText(node.description, rank, inverseMultiplier) : "Profession-tree node")}</p>${coverageBadge(talentLineCoverage(node.description || "", rank > 0))}`}</div>${prismEffects}<footer>${rank > 0 ? "Allocated" : element.classList.contains("locked") ? "Locked · prerequisites not met" : "Click to allocate"}</footer>`,
    };
  }
  if (element.matches(".equipment-item,.inventory-item")) return gearTooltipContent(element);
  if (element.matches(".skill-setup")) {
    const skill = currentEditedSetups()[Number(element.dataset.skillIndex)];
    return {
      title: skill.name + " · Lv." + skill.effectiveLevel,
      body: [
        skillRoleLabels[skill.role],
        "Energy: " + skill.energyCost,
        ...skill.supports.map((support) => (support.enabled ? "● " : "○ ") + support.name + " Lv." + support.level),
      ].join("\n"),
    };
  }
  if (element.matches(".slate-chip")) {
    const slate = selenaScorchingBeamSlatesSs13.slates.find((item) => item.id === element.dataset.slateId);
    return {
      title: slate.name + " · Lv." + slate.level,
      body: [
        slate.authority,
        ...(slate.fixed || []),
        ...(slate.brands || []),
        ...(slate.copiedTalents || []),
        slate.copyRule,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }
  const title = element.querySelector("h2,h3,strong")?.textContent?.trim() || "Planner detail";
  const body = element.textContent.replace(/\s+/g, " ").trim();
  return { title, body };
}
function positionPlannerTooltip(x, y) {
  tooltipAnchorX = x;
  tooltipAnchorY = y;
  const tooltip = $("#planner-tooltip");
  const inventoryCard = tooltipAnchorElement?.closest?.("#equipment-inventory .inventory-item");
  if (inventoryCard) {
    const card = inventoryCard.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const left =
      card.left - width - 12 >= 10 ? card.left - width - 12 : Math.min(window.innerWidth - width - 10, card.right + 12);
    const top = Math.min(Math.max(10, card.top), Math.max(10, window.innerHeight - tooltip.offsetHeight - 12));
    tooltip.style.left = Math.max(10, left) + "px";
    tooltip.style.top = top + "px";
    return;
  }
  const left = Math.min(window.innerWidth - 370, x + 18);
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - 12, y + 18);
  tooltip.style.left = Math.max(10, left) + "px";
  tooltip.style.top = Math.max(10, top) + "px";
}
let tooltipPositionFrame = 0;
let pendingTooltipX = 0,
  pendingTooltipY = 0;
function scheduleTooltipPosition(x, y) {
  pendingTooltipX = x;
  pendingTooltipY = y;
  if (tooltipPositionFrame) return;
  tooltipPositionFrame = requestAnimationFrame(() => {
    tooltipPositionFrame = 0;
    if (tooltipAnchorElement) positionPlannerTooltip(pendingTooltipX, pendingTooltipY);
  });
}
let damageSourceTooltipHideTimer;
function showPlannerTooltip(element, x, y) {
  clearTimeout(damageSourceTooltipHideTimer);
  if (!document.body.classList.contains("unified-planner") && !element.matches("[data-damage-source],[data-qol-help]"))
    return;
  const previousRenderPass = renderPassPlanner;
  renderPassPlanner = currentPlanner();
  let content;
  try {
    content = plannerTooltipContent(element);
  } finally {
    renderPassPlanner = previousRenderPass;
  }
  if (!content) return hidePlannerTooltip();
  const actionHint = element.getAttribute("title") || element.dataset.tooltipHint;
  if (element.hasAttribute("title")) {
    element.dataset.tooltipHint = actionHint;
    element.removeAttribute("title");
  }
  tooltipAnchorElement = element;
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
    `<strong>${escapeHtml(content.title)}</strong><span>${escapeHtml(content.body)}</span><small>${sourceSummary ? "Source breakdown · scroll for more" : "Click to edit"}</small>`;
  if (actionHint)
    tooltip.insertAdjacentHTML(
      "beforeend",
      `<small class="planner-tooltip-action-hint">${escapeHtml(actionHint)}</small>`,
    );
  tooltip.setAttribute("aria-hidden", "false");
  tooltip.classList.add("visible");
  tooltipAnchorX = x;
  tooltipAnchorY = y;
  positionPlannerTooltip(x, y);
}
function hidePlannerTooltip() {
  clearTimeout(damageSourceTooltipHideTimer);
  tooltipAnchorElement = null;
  $("#planner-tooltip").classList.remove("visible");
  $("#planner-tooltip").setAttribute("aria-hidden", "true");
}
function setRevivalAltDetails(visible) {
  document.body.classList.toggle("revival-alt-held", visible);
  if ($("#planner-tooltip").classList.contains("visible"))
    requestAnimationFrame(() => positionPlannerTooltip(tooltipAnchorX, tooltipAnchorY));
}
window.addEventListener("keydown", (event) => {
  if (event.key === "Alt") setRevivalAltDetails(true);
});
window.addEventListener("keyup", (event) => {
  if (event.key === "Alt") setRevivalAltDetails(false);
});
window.addEventListener("blur", () => setRevivalAltDetails(false));

let tooltipScrollQuietUntil = 0;
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

// A rotated or flipped slate that no longer fits waits under the pointer (the board follows it) until a click places it.
function pickUpTransformedSlate(slate, current, candidate, action) {
  slatePendingDrop = { id: slate.id, original: { ...current }, transformed: candidate, action };
  slatePlacements = { ...slatePlacements, [slate.id]: candidate };
  selectedSlateId = null;
  slateToolsPosition = null;
  if ($("#slate-editor").open) $("#slate-editor").close();
  renderSlates();
  showToast(`Move the ${action} slate and click to place it`);
}

// The click that ends a waiting slate: `placement` is the grid position under it (null off the grid), `parked` the stage
// position beside the grid (null on the grid or off the stage), both measured by the board.
function finishPendingSlate({ placement, parked }) {
  if (!slatePendingDrop) return;
  const pending = slatePendingDrop,
    slate = slatesForBoard().find((item) => item.id === pending.id);
  slatePendingDrop = null;
  if (placement && slate && canPlaceSlate(slate, placement, slatePlacements, slatesForBoard())) {
    slatePlacements = { ...slatePlacements, [pending.id]: placement };
    persistPlannerState();
    showToast(`${pending.action} slate placed`);
  } else if (slate && parked) {
    parkedSlates = { ...parkedSlates, [pending.id]: parked };
    equippedSlateIds.delete(pending.id);
    const next = { ...slatePlacements };
    delete next[pending.id];
    slatePlacements = next;
    persistPlannerState();
    showToast("Slate parked beside the grid");
  } else {
    slatePlacements = { ...slatePlacements, [pending.id]: pending.original };
    renderSlates();
    showToast("Invalid drop · slate restored");
  }
}
document.addEventListener("pointerout", (event) => {
  const target = event.target.closest(tooltipSelector);
  if (
    target &&
    !target.contains(event.relatedTarget) &&
    !(event.pointerType === "touch" && target.matches("[data-qol-help]"))
  ) {
    if (target.matches("[data-damage-source]")) damageSourceTooltipHideTimer = setTimeout(hidePlannerTooltip, 180);
    else hidePlannerTooltip();
  }
});
$("#planner-tooltip").addEventListener("pointerenter", () => clearTimeout(damageSourceTooltipHideTimer));
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
// Section "?" help: hover and keyboard focus show it (above); a tap, pen click or Enter / Space toggles it
// (a mouse click only shows it, since hovering already did). Whether it was open is read at pointerdown.
let qolHelpOpenAtPointerDown = null;
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

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-affix-roll-number]")) {
    const number = event.target,
      range = number.closest(".affix-roll-inputs")?.querySelector('input[type="range"]');
    if (range) {
      const value = Number(number.value),
        min = Number(number.min),
        max = Number(number.max);
      if (Number.isFinite(value) && value >= min && value <= max) {
        range.value = String(value);
        range.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    return;
  }
  if (
    event.target.matches(
      "[data-legendary-roll],[data-edit-legendary-roll],[data-modifier-roll],[data-base-affix-roll],[data-craft-affix-roll]",
    )
  ) {
    updateNegativeRollVisual(event.target);
    const number = event.target.closest(".affix-roll-inputs")?.querySelector("[data-affix-roll-number]");
    if (number) number.value = event.target.value;
  }
  if (event.target.matches("[data-legendary-search]")) {
    equipmentSearch = event.target.value;
    renderEquipmentCrafter();
    const search = $("[data-legendary-search]");
    search?.focus();
    search?.setSelectionRange(equipmentSearch.length, equipmentSearch.length);
  }
  if (event.target.matches("[data-craft-type]")) {
    const base = $("#equipment-crafter-body [data-craft-base]");
    if (base)
      base.innerHTML =
        equipmentCraftMode === "rare"
          ? rareBaseOptions(event.target.value)
          : `<option value="${escapeHtml(event.target.value)}">${escapeHtml(event.target.value)}</option>`;
    document
      .querySelectorAll("#equipment-crafter-body [data-craft-base-affix]")
      .forEach(
        (select, index) =>
          (select.innerHTML =
            equipmentCraftMode === "rare"
              ? baseAffixOptions(event.target.value)
              : voraxBaseAffixOptions(event.target.value, index)),
      );
    document
      .querySelectorAll("#equipment-crafter-body [data-base-affix-rolls]")
      .forEach((container) => (container.innerHTML = ""));
    document.querySelectorAll("#equipment-crafter-body [data-craft-affix-family]").forEach((select) => {
      const index = Number(select.dataset.craftAffixFamily);
      select.innerHTML = craftAffixFamilyOptions(event.target.value, index);
      updateCraftAffixConfig(index);
    });
    const sequenceField = document.querySelector("#equipment-crafter-body [data-tower-sequence-field]"),
      sequenceInput = sequenceField?.querySelector("[data-craft-sequence]");
    if (sequenceField) sequenceField.hidden = !towerSequenceAllowed(event.target.value);
    if (sequenceInput) sequenceInput.innerHTML = towerSequenceOptions(event.target.value);
    const selectedSlot = event.target.selectedOptions[0]?.dataset.slot,
      energyField = document.querySelector("#equipment-crafter-body [data-equipment-energy-field]"),
      energyInput = energyField?.querySelector("[data-craft-energy]");
    if (energyField) energyField.hidden = !equipmentEnergyAllowed(selectedSlot);
    if (energyInput)
      energyInput.value = String(
        maxEquipmentEnergy(
          document.querySelector("#equipment-crafter-body [data-craft-level]")?.value,
          selectedSlot,
          event.target.value,
        ),
      );
    const blendField = document.querySelector("#equipment-crafter-body [data-belt-blend-field]"),
      blendSelect = blendField?.querySelector("[data-craft-belt-blend]");
    if (blendField) blendField.hidden = selectedSlot !== "belt";
    if (blendSelect && selectedSlot !== "belt") blendSelect.value = "";
  }
  if (event.target.matches("[data-craft-base-affix]")) {
    const index = Number(event.target.dataset.craftBaseAffix),
      container = document.querySelector(`[data-base-affix-rolls="${index}"]`);
    if (container) container.innerHTML = baseAffixRollControls(index, event.target.value);
  }
  if (event.target.matches("[data-craft-affix-family]")) {
    updateCraftAffixConfig(Number(event.target.dataset.craftAffixFamily));
    updateCraftPreview();
  }
  if (event.target.matches("[data-craft-affix-tier]")) {
    const index = Number(event.target.dataset.craftAffixTier),
      body = $("#equipment-crafter-body"),
      family = craftAffixFamily(body, index),
      tier = family?.tiers.find((entry) => entry.tier === event.target.value),
      rolls = body.querySelector(`[data-craft-affix-rolls="${index}"]`);
    if (rolls) rolls.innerHTML = craftAffixRollControls(index, tier);
    updateCraftPreview();
  }
  if (event.target.matches("[data-craft-level]")) {
    const body = document.querySelector("#equipment-crafter-body"),
      energy = body?.querySelector("[data-craft-energy]"),
      type = body?.querySelector("[data-craft-type]");
    if (energy && type)
      energy.value = String(maxEquipmentEnergy(event.target.value, type.selectedOptions[0]?.dataset.slot, type.value));
  }
  if (event.target.matches("[data-craft-level]"))
    document.querySelectorAll("#equipment-crafter-body [data-craft-affix-family]").forEach((select) => {
      const index = Number(select.dataset.craftAffixFamily),
        tier = document.querySelector(`[data-craft-affix-tier="${index}"]`)?.value;
      updateCraftAffixConfig(index, tier);
    });
  if (
    event.target.matches(
      "[data-craft-name],[data-craft-level],[data-craft-type],[data-craft-base],[data-craft-energy],[data-craft-base-affix],[data-craft-belt-blend],[data-craft-sequence]",
    )
  )
    updateCraftPreview();
  if (event.target.matches("[data-base-affix-roll]")) {
    event.target.closest("label")?.querySelector("em")?.replaceChildren(event.target.value);
    updateCraftPreview();
  }
  if (event.target.matches("[data-craft-affix-roll]")) {
    event.target.closest("label")?.querySelector("em")?.replaceChildren(event.target.value);
    updateCraftPreview();
  }
  if (event.target.matches("[data-legendary-base]")) {
    selectedLegendaryBase = event.target.value;
    if (towerSequenceById(selectedLegendaryTowerSequenceId)?.weaponType !== selectedLegendaryBase)
      selectedLegendaryTowerSequenceId = "";
    selectedCorrosionIndex = -1;
    renderEquipmentCrafter();
  }
  if (event.target.matches("[data-legendary-belt-blend],[data-legendary-tower-sequence]")) {
    if (event.target.matches("[data-legendary-belt-blend]")) selectedLegendaryBeltBlendId = event.target.value;
    else selectedLegendaryTowerSequenceId = event.target.value;
    const selected = legendaryGearSs13[selectedLegendaryIndex],
      preview = $("#legendary-config-preview"),
      corrosion = configuredCorrosionModifier();
    if (preview)
      preview.innerHTML = `<small>Preview</small>${equipmentPreview({ ...selected, base: selectedLegendaryBase, corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers], modifiers: configuredLegendaryModifiersWithSpecials(), corrosionModifiers: corrosion ? [corrosion] : [] })}`;
  }
  if (event.target.matches("[data-legendary-corrosion]")) {
    selectedCorrosionIndex = Number(event.target.value);
    renderEquipmentCrafter();
  }
  if (event.target.matches("[data-legendary-roll]")) {
    const index = Number(event.target.dataset.legendaryRoll),
      selected = legendaryGearSs13[selectedLegendaryIndex],
      control = event.target.closest(".legendary-mod-control"),
      sliders = [...control.querySelectorAll("[data-legendary-roll]")],
      text = resolveModifierRolls(
        legendaryModifierTemplate(selected, index),
        sliders.map((slider) => slider.value),
      );
    control.querySelector("[data-legendary-mod]").innerHTML = modifierTextMarkup(text);
    event.target.closest("label").querySelector("em").textContent = event.target.value;
    const preview = $("#legendary-config-preview"),
      corrosion = configuredCorrosionModifier();
    if (preview)
      preview.innerHTML = `<small>Preview</small>${equipmentPreview({ ...selected, base: selectedLegendaryBase, corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers], modifiers: configuredLegendaryModifiersWithSpecials(), corrosionModifiers: corrosion ? [corrosion] : [] })}`;
  }
  if (event.target.matches("[data-corrosion-roll]")) {
    const text = configuredCorrosionModifier();
    $("[data-corrosion-text]").textContent = text;
    const selected = legendaryGearSs13[selectedLegendaryIndex],
      preview = $("#legendary-config-preview");
    if (preview)
      preview.innerHTML = `<small>Preview</small>${equipmentPreview({ ...selected, base: selectedLegendaryBase, corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers], modifiers: configuredLegendaryModifiersWithSpecials(), corrosionModifiers: [text] })}`;
  }
  if (event.target.matches("[data-edit-legendary-roll]")) {
    const index = Number(event.target.dataset.editLegendaryRoll),
      item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId),
      source =
        legendaryEditorSource(item) ||
        legendaryGearSs13.find(
          (entry) => entry.name.toLowerCase() === (item?.name || "").replace(/ - Priceless$/i, "").toLowerCase(),
        ),
      control = event.target.closest(".legendary-mod-control"),
      sliders = [...control.querySelectorAll("[data-edit-legendary-roll]")],
      template = editingLegendaryModifierTemplate(source, index),
      text = resolveModifierRolls(
        template,
        sliders.map((slider) => slider.value),
      );
    control.querySelector("[data-edit-modifier-text]").innerHTML = modifierTextMarkup(text);
    control.querySelector("[data-edit-modifier]").value = text;
    editingLegendaryTexts.set(index, text);
    event.target.closest("label").querySelector("em").textContent = event.target.value;
  }
});

function changeTalentRank(coordinate, delta, max = false) {
  const panel = currentTalentPanel();
  const displayNodes = talentDisplayNodes(panel);
  const node = displayNodes.find((item) => item.coordinate.join(",") === coordinate);
  if (!node) return;
  const prismCoordinate = plannerState.talents.installedPrisms?.[panel.name]
    ? plannerState.talents.installedPrismNodes?.[panel.name]
    : null;
  const prism = (plannerState.talents.prismInventory || []).find(
    (item) => item.id === plannerState.talents.installedPrisms?.[panel.name],
  );
  const prerequisiteFreeCoordinates = inverseImageReflectedCoordinates(prism, prismCoordinate);
  const layouts = activeTalentLayouts();
  const args = {
    panel: panel.name,
    node,
    graph: layouts[panel.name],
    layouts,
    ranks: Object.fromEntries(talentRanks),
    prismCoordinate,
    prerequisiteFreeCoordinates,
  };
  if (delta > 0) {
    const allocation = max ? allocateTalentToMaxWithPrerequisites(args) : allocateTalentWithPrerequisites(args);
    if (!allocation.allowed) {
      showToast(allocation.reason);
      return;
    }
    talentRanks.clear();
    for (const [rankKey, rankValue] of Object.entries(allocation.ranks)) talentRanks.set(rankKey, rankValue);
    persistPlannerState();
    renderTalents();
    renderSkills();
    renderConfiguration();
    return;
  }
  const rule = removeTalentWithDependents(args);
  if (!rule.allowed) {
    showToast(rule.reason);
    return;
  }
  talentRanks.clear();
  for (const [rankKey, rankValue] of Object.entries(rule.ranks)) talentRanks.set(rankKey, rankValue);
  persistPlannerState();
  renderTalents();
  renderSkills();
  renderConfiguration();
}

// Talent tree commands (apps/web/src/features/talents). The tree, core and prism dialogs stay here.
function openTalentTree(slot) {
  pendingPrismPlacement = null;
  setTalentSlateMode(false);
  activeTalentSlot = slot;
  const selected = plannerState.talents.selectedTrees[slot];
  if (selected) {
    activeWorkspaceView = "talents";
    activeTalentPanel = selected;
    renderTalents();
    saveWorkspaceLocation();
    return;
  }
  renderTalents();
  $("#talent-panel-picker").showModal();
}
// Right-click on a tree tab: the tree and every one after it are emptied.
function removeTalentTree(slot) {
  if (!plannerState.talents.selectedTrees[slot]) return false;
  for (let index = slot; index < plannerState.talents.selectedTrees.length; index += 1) {
    const name = plannerState.talents.selectedTrees[index];
    clearTalentTreeState(name);
    delete plannerState.talents.installedPrisms[name];
    delete plannerState.talents.installedPrismNodes[name];
    plannerState.talents.selectedTrees[index] = "";
  }
  persistPlannerState();
  renderCandidateViews();
  showToast("Talent tree removed");
  return true;
}
function openTalentSlates() {
  activeWorkspaceView = "talents";
  setTalentSlateMode(true);
  renderTalents();
  renderSlates();
  saveWorkspaceLocation();
}
function openCorePicker(threshold) {
  activeCoreThreshold = threshold;
  viewSourceChanged("corePicker");
  $("#core-talent-picker").showModal();
}
// The core talent picker's pick (choices are disabled below the slot's points).
function selectCoreTalent(name) {
  plannerState.talents.coreSelections[`${activeTalentPanel}:${activeCoreThreshold}`] = name;
  persistPlannerState();
  $("#core-talent-picker").close();
  renderTalents();
  showToast(`${name} selected`);
}
function removeCoreTalent(threshold) {
  const key = `${currentTalentPanel().name}:${threshold}`;
  if (!plannerState.talents.coreSelections[key]) return false;
  delete plannerState.talents.coreSelections[key];
  persistPlannerState();
  renderCandidateViews();
  showToast("Core talent removed");
  return true;
}
// A click on a node: places a prism waiting for one, opens the prism inventory on the installed prism, or adds a point
// (with the points on the way to it).
function clickTalentNode(coordinate) {
  if (pendingPrismPlacement) {
    placeCraftedPrism(coordinate);
    return;
  }
  if (
    plannerState.talents.installedPrismNodes?.[activeTalentPanel] === coordinate &&
    plannerState.talents.installedPrisms?.[activeTalentPanel]
  ) {
    openPrismInventory();
    return;
  }
  changeTalentRank(coordinate, 1);
}
// A right-click on a node: takes the installed prism off, takes a point off, or fills an empty node.
function rightClickTalentNode(coordinate) {
  if (pendingPrismPlacement) return;
  const panelName = currentTalentPanel().name;
  if (
    plannerState.talents.installedPrismNodes?.[panelName] === coordinate &&
    plannerState.talents.installedPrisms?.[panelName]
  ) {
    const item = plannerState.talents.prismInventory.find(
      (entry) => entry.id === plannerState.talents.installedPrisms[panelName],
    );
    clearInverseReflectedRanks(panelName, item, coordinate);
    delete plannerState.talents.installedPrisms[panelName];
    delete plannerState.talents.installedPrismNodes[panelName];
    if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(panelName);
    persistPlannerState();
    renderCandidateViews();
    showToast("Prism removed from talent node");
    return;
  }
  const empty = !(talentRanks.get(`${panelName}:${coordinate}`) || 0);
  changeTalentRank(coordinate, empty ? 1 : -1, empty);
}
function resetTalentTree() {
  clearTalentTreeState(activeTalentPanel);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(activeTalentPanel)} points reset`);
}
function reselectTalentTree() {
  const slot = plannerState.talents.selectedTrees.indexOf(activeTalentPanel);
  activeTalentSlot = slot >= 0 ? slot : 0;
  renderTalents();
  $("#talent-panel-picker").showModal();
}
function cancelPrismPlacement() {
  pendingPrismPlacement = null;
  renderTalents();
}
// The end of a drag of the installed prism: onto another node of the open tree it moves there; anywhere else it stays.
function dropPrism(coordinate) {
  const panel = activeTalentPanel,
    origin = plannerState.talents.installedPrismNodes?.[panel];
  const valid =
    coordinate && professionTreeLayoutsAllSs13[panel]?.nodes.some((node) => node.coordinate.join(",") === coordinate);
  if (!valid) {
    showToast("Invalid drop · Prism returned to its original node");
    return;
  }
  if (coordinate === origin) return;
  const item = plannerState.talents.prismInventory.find(
    (entry) => entry.id === plannerState.talents.installedPrisms?.[panel],
  );
  clearInverseReflectedRanks(panel, item, origin);
  clearInverseReflectedRanks(panel, item, coordinate);
  plannerState.talents.installedPrismNodes[panel] = coordinate;
  talentRanks.set(`${panel}:${coordinate}`, 0);
  if (item?.type === "inverse") reconcileTalentRanksAfterPrismChange(panel);
  persistPlannerState();
  renderCandidateViews();
  showToast(`Prism moved to node ${coordinate}`);
}

function clearTalentTreeState(name) {
  if (!name) return;
  for (const key of [...talentRanks.keys()]) if (key.startsWith(name + ":")) talentRanks.set(key, 0);
  for (const key of Object.keys(plannerState.talents.coreSelections))
    if (key.startsWith(name + ":")) delete plannerState.talents.coreSelections[key];
}

document.addEventListener("contextmenu", (event) => {
  const memoryRow = event.target.closest("[data-memory-inventory-id]");
  if (memoryRow) {
    event.preventDefault();
    const id = memoryRow.dataset.memoryInventoryId,
      memory = plannerState.hero.memoryInventory?.find((item) => item.id === id);
    if (!memory) return;
    const tier = Object.keys(plannerState.hero.equippedMemoryIds || {}).find(
      (key) => plannerState.hero.equippedMemoryIds[key] === id,
    );
    if (tier) {
      unequipHeroMemory(tier);
      return;
    }
    if (plannerState.hero.baseTraitMemoryId === id) {
      plannerState.hero.baseTraitMemoryId = "";
      plannerState.hero.baseTraitMemoryRoll = null;
      hidePlannerTooltip();
      persistPlannerState();
      renderHeroTraitTree();
      renderHeroMemoryInventory();
      showToast("Base trait memory unequipped");
      return;
    }
    const openSlot = openHeroMemorySlot(memory, activeHeroMemoryTier === "base");
    if (openSlot === "base") {
      const slot = equippedBaseTraitSlot(plannerState.hero);
      plannerState.hero.baseTraitMemoryId = id;
      plannerState.hero.baseTraitMemoryRoll = slot.reductionRange.max;
      hidePlannerTooltip();
      persistPlannerState();
      renderHeroTraitTree();
      renderHeroMemoryInventory();
      showToast(`${escapeHtml(memory.name)} equipped in base trait slot`);
    } else if (openSlot) equipHeroMemory(memory);
    else showToast("No open compatible memory slot");
    return;
  }
  const craftedSlateInventory = event.target.closest("[data-crafted-slate-inventory]");
  if (craftedSlateInventory) {
    event.preventDefault();
    const id = craftedSlateInventory.dataset.craftedSlateInventory,
      slate = slatesForBoard().find((item) => item.id === id),
      saved = (plannerState.slates?.inventory || []).find((item) => item.id === id),
      startRotation = slatePlacements[id]?.rotation ?? parkedSlates[id]?.rotation ?? saved?.rotation ?? 0,
      flipX = slatePlacements[id]?.flipX ?? parkedSlates[id]?.flipX ?? saved?.flipX ?? 1,
      flipY = slatePlacements[id]?.flipY ?? parkedSlates[id]?.flipY ?? saved?.flipY ?? 1;
    const rotations = slateTransformRules(slate).rotate
      ? [startRotation, 0, 90, 180, 270].filter((value, index, array) => array.indexOf(value) === index)
      : [0];
    let placement = null;
    for (const rotation of rotations) {
      for (let row = 1; row <= 6 && !placement; row += 1) {
        for (let column = 1; column <= 6; column += 1) {
          const candidate = { column, row, rotation, flipX, flipY };
          if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
            placement = candidate;
            break;
          }
        }
      }
      if (placement) break;
    }
    if (placement) {
      slatePlacements = { ...slatePlacements, [id]: placement };
      equippedSlateIds.add(id);
      delete parkedSlates[id];
      selectedSlateId = null;
      slateToolsPosition = null;
      slatePlacementTarget = null;
      slateEditMode = false;
      const listScroll = $("#slate-inventory .crafted-slate-list")?.scrollTop || 0;
      renderSlateInventory();
      $("#slate-inventory .crafted-slate-list").scrollTop = listScroll;
      persistPlannerState();
      showToast(`${slate.name} placed on the grid`);
    } else if (parkSlateBesideGrid(slate, startRotation, flipX, flipY)) {
      const next = { ...slatePlacements };
      delete next[id];
      slatePlacements = next;
      equippedSlateIds.delete(id);
      selectedSlateId = null;
      slateToolsPosition = null;
      const listScroll = $("#slate-inventory .crafted-slate-list")?.scrollTop || 0;
      persistPlannerState();
      renderCandidateViews();
      renderSlateInventory();
      $("#slate-inventory .crafted-slate-list").scrollTop = listScroll;
      showToast(`${slate.name} placed beside the full grid`);
    } else showToast("No space is available beside the grid for that slate");
    return;
  }
});

$("#inventory-item-dialog").addEventListener("click", (event) => {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (outside) event.currentTarget.close();
});

document.addEventListener("keydown", (event) => {
  if (
    event.target.matches("select:not([data-native-select])") &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  ) {
    event.preventDefault();
    openSearchableSelect(event.target, event.key);
    return;
  }
  if (!event.target.matches("#select-search-popover input")) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeSearchableSelect();
  }
  if (event.key === "Enter" && searchableSelectMatches.length) {
    event.preventDefault();
    chooseSearchableOption(searchableSelectMatches[0].index);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (event.target.matches("select:not([data-native-select])") && event.button === 0) {
    event.preventDefault();
    event.target.focus();
    openSearchableSelect(event.target);
  }
});
document.addEventListener("input", (event) => {
  if (event.target.matches("#select-search-popover input")) renderSearchableSelectResults(event.target.value);
});
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-select-search]")) {
    closeSearchableSelect();
    return;
  }
  const result = event.target.closest("[data-select-search-index]");
  if (result) {
    chooseSearchableOption(result.dataset.selectSearchIndex);
    return;
  }
  if (event.target.matches('input[type="number"]')) event.target.select();
  if (searchableSelectTarget && !event.target.closest("#select-search-popover") && !event.target.closest("select"))
    closeSearchableSelect();
});
document.addEventListener("focusin", (event) => {
  if (event.target.matches('input[type="number"]')) event.target.select();
});
document.querySelector(".loadout-tab")?.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".loadout-tab-rename")) return;
  event.preventDefault();
  startActiveBuildRename(event.currentTarget);
});
document.querySelector(".loadout-tab")?.addEventListener("keydown", (event) => {
  if (event.target !== event.currentTarget || !isRenameKey(event)) return;
  event.preventDefault();
  startActiveBuildRename(event.currentTarget);
});

document.addEventListener("click", (event) => {
  const kismetChoice = event.target.closest("[data-select-kismet]");
  if (kismetChoice) {
    selectKismetChoice(kismetChoice.dataset.selectKismet);
    return;
  }
  if (event.target.closest("[data-confirm-kismet]")) {
    saveKismetSlot();
    return;
  }
  if (event.target.closest("[data-clear-kismet-slot]")) {
    saveKismetSlot(true);
    return;
  }
  if (event.target.closest("[data-close-kismet-crafter]")) {
    $("#kismet-crafter").close();
    activeKismetSlot = null;
    return;
  }
  const heroPanelTab = event.target.closest("[data-hero-panel-tab]");
  if (heroPanelTab) {
    writeHeroPanelTab(activeBuildViewId(), heroPanelTab.dataset.heroPanelTab);
    hidePlannerTooltip();
    renderHeroPanel();
    return;
  }
  if (event.target.closest("[data-close-prism-crafter],[data-cancel-prism-crafter]")) {
    $("#prism-crafter-dialog").close();
    openPrismInventory();
    return;
  }
  const prismType = event.target.closest("[data-prism-type]");
  if (prismType) {
    const inverse = prismType.dataset.prismType === "inverse";
    prismDraft = {
      type: prismType.dataset.prismType,
      base: inverse ? "Inverse Image" : "",
      radiusAffix: "",
      rareAffix: "",
      legendaryAffix: "",
      ...(inverse ? { inverseRolls: { micro: -100, medium: -100, legendary: -100 } } : {}),
    };
    renderPrismCrafter();
    return;
  }
  if (event.target.closest("[data-confirm-prism-craft]")) {
    if (!prismDraft?.base) return;
    const editing = Boolean(prismEditingId),
      item = {
        ...prismDraft,
        legendaryAffix: prismSupportsLegendaryAffix(prismDraft) ? prismDraft.legendaryAffix : "",
        id: prismEditingId || globalThis.crypto?.randomUUID?.() || `prism-${Date.now()}`,
      };
    if (editing) {
      const index = plannerState.talents.prismInventory.findIndex((entry) => entry.id === prismEditingId);
      if (index < 0) return;
      plannerState.talents.prismInventory[index] = item;
    } else plannerState.talents.prismInventory.push(item);
    persistPlannerState();
    $("#prism-crafter-dialog").close();
    renderCandidateViews();
    viewSourceChanged("prismInventory");
    $("#prism-inventory-dialog").showModal();
    showToast(`${prismName(item)} ${editing ? "updated" : "crafted"}`);
    return;
  }
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    if (viewButton.dataset.view === "slates") {
      activateWorkspaceView("talents");
      setTalentSlateMode(true);
      renderTalents();
      saveWorkspaceLocation();
    } else {
      if (viewButton.dataset.view === "talents") setTalentSlateMode(false);
      activateWorkspaceView(viewButton.dataset.view);
    }
  }
  // "Download backup" in the unreadable-library notice (renderLibraryNotice).
  if (event.target.closest("[data-backup-builds]")) backupLibraryBuilds();
  if (event.target.closest("[data-resume-calculations]")) {
    setSafeMode(sessionStorage, false);
    location.reload();
  }
  if (event.target.closest("[data-start-new-library]")) {
    try {
      startNewLibrary();
      applyPlannerState(loadPlannerState());
      renderCandidateViews();
      renderLibraryNotice();
      updateStorageStatus();
      showToast("New library started · Your unreadable data stays backed up");
    } catch (error) {
      showToast(error?.message || "A new library could not be started");
    }
  }
  if (event.target.closest("[data-close-hero-memory]")) {
    $("#hero-memory-selector").close();
    return;
  }
  if (event.target.closest("[data-clear-base-memory]")) {
    plannerState.hero.baseTraitMemoryId = "";
    plannerState.hero.baseTraitMemoryRoll = null;
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    return;
  }
  const equipBaseMemoryButton = event.target.closest("[data-equip-base-memory]");
  if (equipBaseMemoryButton) {
    const memory = plannerState.hero.memoryInventory?.find(
        (item) => item.id === equipBaseMemoryButton.dataset.equipBaseMemory,
      ),
      slot = equippedBaseTraitSlot(plannerState.hero);
    if (!slot || (!canEquipBaseTraitMemory(memory) && plannerState.hero.baseTraitMemoryId !== memory?.id)) return;
    if (plannerState.hero.baseTraitMemoryId === memory.id) {
      plannerState.hero.baseTraitMemoryId = "";
      plannerState.hero.baseTraitMemoryRoll = null;
    } else {
      plannerState.hero.baseTraitMemoryId = memory.id;
      plannerState.hero.baseTraitMemoryRoll = slot.reductionRange.max;
    }
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    return;
  }
  if (event.target.closest("[data-clear-hero-memory]")) {
    unequipHeroMemory(activeHeroMemoryTier);
    return;
  }
  if (event.target.closest("[data-craft-hero-memory]")) {
    startHeroMemoryCraft();
    return;
  }
  if (event.target.closest("[data-back-hero-memory]")) {
    memoryDraft = null;
    editingMemoryId = null;
    renderHeroMemoryInventory();
    return;
  }
  const memoryTypeButton = event.target.closest("[data-memory-type]");
  if (memoryTypeButton) {
    const nextType = memoryTypeButton.dataset.memoryType;
    if (memoryDraft.type === nextType) return;
    const scroll = $("#hero-memory-content .hero-memory-form")?.scrollTop || 0;
    memoryDraft.type = nextType;
    memoryDraft.name = nextType;
    memoryDraft.baseStat = "";
    renderHeroMemoryCraft();
    $("#hero-memory-content .hero-memory-form").scrollTop = scroll;
    return;
  }
  const memoryRarityButton = event.target.closest("[data-memory-rarity]");
  if (memoryRarityButton) {
    memoryDraft.rarity = memoryRarityButton.dataset.memoryRarity;
    memoryDraft.enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity);
    memoryDraft.traitLevelBonus = traitLevelBonusForEnhancement(memoryDraft.enhancementLevel);
    renderHeroMemoryCraft();
    return;
  }
  const revivedTierButton = event.target.closest("[data-revived-tier]");
  if (revivedTierButton) {
    memoryDraft.revivedTier = Number(revivedTierButton.dataset.revivedTier);
    memoryDraft.revivedRoll =
      revivedAffixRollRange(
        revivedAffixTiers(memoryDraft.revivedAffix).find((entry) => entry.tier === memoryDraft.revivedTier)?.effect,
      )?.max ?? null;
    const scroll = $("#hero-memory-content .hero-memory-form")?.scrollTop || 0;
    renderHeroMemoryCraft();
    $("#hero-memory-content .hero-memory-form").scrollTop = scroll;
    focusMemoryRollValue("revivedRoll");
    return;
  }
  const memoryTierButton = event.target.closest("[data-memory-tier-choice]");
  if (memoryTierButton) {
    const [group, index, tier] = memoryTierButton.dataset.memoryTierChoice.split("."),
      tierGroup = group === "fixedAffixes" ? "fixedTiers" : "randomTiers",
      rollGroup = group === "fixedAffixes" ? "fixedRolls" : "randomRolls";
    memoryDraft[tierGroup][Number(index)] = Number(tier);
    memoryDraft[rollGroup][Number(index)] =
      memoryRollRange(
        memoryTierOptions(group, memoryDraft[group][Number(index)]).find((entry) => entry.tier === Number(tier))
          ?.effect || "",
      )?.max ?? null;
    const scroll = $("#hero-memory-content .hero-memory-form")?.scrollTop || 0;
    renderHeroMemoryCraft();
    $("#hero-memory-content .hero-memory-form").scrollTop = scroll;
    focusMemoryRollValue(`${rollGroup}.${index}`);
    if (document.activeElement?.dataset.memoryField !== `${rollGroup}.${index}`)
      focusMemoryRollValue(`${group}.${index}`);
    return;
  }
  const editMemoryButton = event.target.closest("[data-edit-crafted-memory]");
  if (editMemoryButton) {
    const memory = plannerState.hero.memoryInventory?.find(
      (item) => item.id === editMemoryButton.dataset.editCraftedMemory,
    );
    if (memory) startHeroMemoryCraft(memory);
    return;
  }
  const copyMemoryButton = event.target.closest("[data-copy-crafted-memory]");
  if (copyMemoryButton) {
    const original = plannerState.hero.memoryInventory?.find(
      (item) => item.id === copyMemoryButton.dataset.copyCraftedMemory,
    );
    if (!original) return;
    const copy = {
      ...structuredClone(original),
      id: globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    plannerState.hero.memoryInventory.push(copy);
    persistPlannerState();
    renderHeroMemoryInventory();
    showToast(`${escapeHtml(original.name)} copied`);
    return;
  }
  const equipMemoryButton = event.target.closest("[data-equip-crafted-memory]");
  if (equipMemoryButton) {
    const memory = plannerState.hero.memoryInventory?.find(
      (item) => item.id === equipMemoryButton.dataset.equipCraftedMemory,
    );
    if (memory) {
      const tier = Object.keys(plannerState.hero.equippedMemoryIds || {}).find(
        (key) => plannerState.hero.equippedMemoryIds[key] === memory.id,
      );
      if (tier) unequipHeroMemory(tier);
      else equipHeroMemory(memory);
    }
    return;
  }
  const deleteMemoryButton = event.target.closest("[data-delete-crafted-memory]");
  if (deleteMemoryButton) {
    const id = deleteMemoryButton.dataset.deleteCraftedMemory;
    plannerState.hero.memoryInventory = (plannerState.hero.memoryInventory || []).filter((memory) => memory.id !== id);
    for (const [tier, equippedId] of Object.entries(plannerState.hero.equippedMemoryIds || {}))
      if (equippedId === id) {
        delete plannerState.hero.equippedMemoryIds[tier];
        plannerState.hero.memories[tier] = "";
        plannerState.hero.memoryTraitLevels[tier] = 0;
      }
    clearInvalidBaseTraitMemory();
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    showToast("Memory deleted");
    return;
  }
  if (event.target.closest("[data-save-crafted-memory]")) {
    if (!memoryDraft?.rarity || !memoryDraft.baseStat) return;
    if (
      editingMemoryId &&
      (Object.values(plannerState.hero.equippedMemoryIds || {}).includes(editingMemoryId) ||
        plannerState.hero.baseTraitMemoryId === editingMemoryId) &&
      otherEquippedRevivedMemory(memoryDraft)
    ) {
      showToast("Only one revived memory can be equipped");
      return;
    }
    plannerState.hero.memoryInventory ||= [];
    const enhancementLevel = clampMemoryEnhancement(memoryDraft.enhancementLevel, memoryDraft.rarity),
      memory = {
        ...memoryDraft,
        enhancementLevel,
        traitLevelBonus: traitLevelBonusForEnhancement(enhancementLevel),
        id: editingMemoryId || globalThis.crypto?.randomUUID?.() || `memory-${Date.now()}`,
        name: memoryDraft.type,
      };
    const index = plannerState.hero.memoryInventory.findIndex((item) => item.id === memory.id);
    if (index >= 0) plannerState.hero.memoryInventory[index] = memory;
    else plannerState.hero.memoryInventory.push(memory);
    for (const [tier, equippedId] of Object.entries(plannerState.hero.equippedMemoryIds || {}))
      if (equippedId === memory.id) {
        if (memory.type !== heroMemoryTypeForTier(tier)) {
          delete plannerState.hero.equippedMemoryIds[tier];
          plannerState.hero.memories[tier] = "";
          plannerState.hero.memoryTraitLevels[tier] = 0;
        } else {
          plannerState.hero.memories[tier] = memory.name;
          plannerState.hero.memoryTraitLevels[tier] = traitLevelBonusForEnhancement(memory.enhancementLevel);
        }
      }
    clearInvalidBaseTraitMemory();
    memoryDraft = null;
    editingMemoryId = null;
    persistPlannerState();
    renderHeroTraitTree();
    renderHeroMemoryInventory();
    showToast(`${escapeHtml(memory.name)} saved`);
    return;
  }
  const voraxBaseChoice = event.target.closest("[data-select-vorax-base]");
  if (voraxBaseChoice) {
    selectedVoraxBaseName = voraxBaseChoice.dataset.selectVoraxBase;
    renderEquipmentCrafter();
  }
  const voraxLegendaryToggle = event.target.closest("[data-toggle-vorax-legendary]");
  if (voraxLegendaryToggle) {
    const index = Number(voraxLegendaryToggle.dataset.toggleVoraxLegendary),
      activating = voraxLegendaryToggle.dataset.legendaryActive !== "true",
      body = $("#equipment-crafter-body");
    if (
      activating &&
      body.querySelectorAll('[data-toggle-vorax-legendary][data-legendary-active="true"]').length >= 2
    ) {
      showToast("A Vorax item can inherit up to two Legendary affixes");
      return;
    }
    voraxLegendaryToggle.dataset.legendaryActive = String(activating);
    voraxLegendaryToggle.setAttribute("aria-pressed", String(activating));
    voraxLegendaryToggle.closest(".craft-affix-control")?.classList.toggle("legendary-affix-active", activating);
    const select = body.querySelector(`[data-craft-affix-family="${index}"]`),
      type = body.querySelector("[data-craft-type]")?.value;
    if (select) {
      select.innerHTML = craftAffixFamilyOptions(type, index);
      select.value = "";
    }
    updateCraftAffixConfig(index);
    updateCraftPreview();
  }
  if (event.target.closest("[data-close-equipment-craft]")) {
    editingCraftItemId = null;
    $("#equipment-crafter").close();
  }
  const legendaryChoice = event.target.closest("[data-legendary-id]");
  if (legendaryChoice) {
    selectedLegendaryIndex = legendaryGearSs13.findIndex((entry) => entry.id === legendaryChoice.dataset.legendaryId);
    selectedLegendaryBase = defaultBaseForItem(legendaryGearSs13[selectedLegendaryIndex]);
    selectedLegendaryBeltBlendId = "";
    selectedLegendaryTowerSequenceId = "";
    selectedCorrosionIndex = -1;
    selectedLegendaryCorrodedModifiers = new Set();
    selectedLegendaryPlaceholderChoices = new Map();
    selectedLegendaryTierChoices = new Map();
    selectedFolkloreRingOption = "left";
    renderEquipmentCrafter();
  }
  if (event.target.closest("[data-change-legendary]")) {
    selectedLegendaryIndex = -1;
    selectedLegendaryBase = "";
    selectedLegendaryBeltBlendId = "";
    selectedLegendaryTowerSequenceId = "";
    selectedCorrosionIndex = -1;
    selectedLegendaryCorrodedModifiers = new Set();
    selectedLegendaryPlaceholderChoices = new Map();
    selectedLegendaryTierChoices = new Map();
    renderEquipmentCrafter();
  }
  const toggleLegendaryCorrosion = event.target.closest("[data-toggle-legendary-corrosion]");
  if (toggleLegendaryCorrosion) {
    const index = Number(toggleLegendaryCorrosion.dataset.toggleLegendaryCorrosion);
    if (selectedLegendaryCorrodedModifiers.has(index)) selectedLegendaryCorrodedModifiers.delete(index);
    else selectedLegendaryCorrodedModifiers.add(index);
    renderEquipmentCrafter();
  }
  const addCraftedEquipment = event.target.closest("[data-add-crafted-equipment]");
  if (addCraftedEquipment) {
    let item;
    if (equipmentCraftMode === "legendary") {
      const selected = legendaryGearSs13[selectedLegendaryIndex];
      if (!selected) {
        showToast("Select a legendary item first");
        return;
      }
      const { remoteIcon, ...localItem } = structuredClone(selected),
        blend = beltBlendById(selectedLegendaryBeltBlendId),
        sequence = towerSequenceById(selectedLegendaryTowerSequenceId),
        legendaryModifiers = configuredLegendaryModifiers();
      item = {
        ...localItem,
        ...(blend ? { beltBlendId: blend.id } : {}),
        ...(sequence ? { towerSequenceId: sequence.id } : {}),
        legendaryModifiers,
        itemLevel: 100,
        energy: equipmentEnergyAllowed(selected.slot)
          ? Number($("#equipment-crafter-body [data-legendary-energy]")?.value) || 0
          : 0,
        modifiers: [
          ...legendaryModifiers,
          ...(blend ? [blend.modifier] : []),
          ...(sequence ? [sequence.modifier] : []),
        ],
        corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers],
        base: selectedLegendaryBase || defaultBaseForItem(selected),
        rarity: "legendary",
      };
      const corrosion = configuredCorrosionModifier();
      if (corrosion) item.corrosionModifiers = [corrosion];
    } else item = currentCraftPreview();
    item = definedItemFields(item);
    const editingItem = editingCraftItemId
      ? plannerState.equipmentInventory.find((entry) => entry.id === editingCraftItemId)
      : null;
    if (editingItem) {
      const id = editingItem.id;
      Object.keys(editingItem).forEach((key) => delete editingItem[key]);
      Object.assign(editingItem, item, { id });
      for (const [slot, override] of Object.entries(plannerState.equipmentOverrides || {})) {
        if (override.sourceInventoryId === id) {
          const { id: ignored, source, slot: sourceSlot, remoteIcon, ...updatedOverride } = editingItem;
          plannerState.equipmentOverrides[slot] = { ...structuredClone(updatedOverride), sourceInventoryId: id };
        }
      }
    } else {
      item.id = `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      plannerState.equipmentInventory.push(item);
    }
    const edited = Boolean(editingItem);
    editingCraftItemId = null;
    persistPlannerState();
    $("#equipment-crafter").close();
    renderCandidateViews();
    showToast(`${escapeHtml(item.name)} ${edited ? "updated" : "added to Inventory"}`);
  }
  if (event.target.closest("[data-close-inventory-item]")) $("#inventory-item-dialog").close();
  if (event.target.closest("[data-equip-selected-item]")) {
    const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
    if (isItemEquipped(item)) {
      disabledEquipmentSlots.add(equippedSlotForInventoryItem(item) || compatibleEquipmentSlot(item));
      persistPlannerState();
      renderCandidateViews();
      showToast(`${escapeHtml(item.name)} unequipped`);
    } else equipInventoryItem(item);
    $("#inventory-item-dialog").close();
  }
  if (event.target.closest("[data-edit-inventory-item]")) {
    const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
    openInventoryItemEditor(item);
  }
  if (event.target.closest("[data-copy-inventory-item]") && duplicateInventoryItem(selectedInventoryItemId))
    $("#inventory-item-dialog").close();
  const toggleEditCorrosion = event.target.closest("[data-toggle-edit-corrosion]");
  if (toggleEditCorrosion) {
    const index = Number(toggleEditCorrosion.dataset.toggleEditCorrosion);
    if (editingCorrodedModifierIndices.has(index)) editingCorrodedModifierIndices.delete(index);
    else editingCorrodedModifierIndices.add(index);
    editingLegendaryTexts.delete(index);
    renderInventoryItemDialog();
  }
  if (event.target.closest("[data-delete-inventory-item]")) {
    const item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
    if (item?.id.startsWith("captured-")) {
      plannerState.removedInventoryItemIds = [...new Set([...(plannerState.removedInventoryItemIds || []), item.id])];
      disabledEquipmentSlots.add(item.slot);
    } else
      plannerState.equipmentInventory = plannerState.equipmentInventory.filter(
        (entry) => entry.id !== selectedInventoryItemId,
      );
    for (const [slot, override] of Object.entries(plannerState.equipmentOverrides)) {
      if (override.sourceInventoryId === selectedInventoryItemId) {
        delete plannerState.equipmentOverrides[slot];
        disabledEquipmentSlots.add(slot);
      }
    }
    $("#inventory-item-dialog").close();
    persistPlannerState();
    renderCandidateViews();
    showToast("Item deleted from Inventory");
  }
  if (event.target.closest("[data-save-inventory-item]")) {
    let item = plannerState.equipmentInventory.find((entry) => entry.id === selectedInventoryItemId);
    const source = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
    if (!item && source) {
      item = { ...structuredClone(source), id: `gear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
      plannerState.equipmentInventory.push(item);
      selectedInventoryItemId = item.id;
    }
    if (item) {
      item.name = $("[data-inventory-edit-name]").value.trim() || item.name;
      item.level = Number($("[data-inventory-edit-level]").value) || item.level;
      item.energy = equipmentEnergyAllowed(item.slot) ? Number($("[data-inventory-edit-energy]")?.value) || 0 : 0;
      item.base = $("[data-inventory-edit-base]").value.trim() || item.base;
      const blend = item.slot === "belt" ? beltBlendById($("[data-edit-belt-blend]")?.value) : null,
        sequence = towerSequenceById($("[data-edit-tower-sequence]")?.value),
        editedModifiers = [...document.querySelectorAll("[data-edit-modifier]")]
          .map((input) => input.value.trim())
          .filter(Boolean);
      const legendarySource = legendaryEditorSource(item);
      if (legendarySource) {
        const texts = new Map(
          [...document.querySelectorAll("[data-edit-modifier]")]
            .map((input) => [Number(input.dataset.editModifier), input.value.trim()])
            .filter(([, text]) => text),
        );
        Object.assign(
          item,
          applyLegendaryEditorEdits(item, inventoryLegendaryModel(item, legendarySource), {
            texts,
            corrodedCatalog: editingCorrodedModifierIndices,
            specials: [
              { from: beltBlendById(item.beltBlendId)?.modifier, to: blend?.modifier },
              { from: towerSequenceById(item.towerSequenceId)?.modifier, to: sequence?.modifier },
            ],
          }),
        );
      } else applyEditedModifierStructure(item, editedModifiers);
      if (blend) item.beltBlendId = blend.id;
      else delete item.beltBlendId;
      if (sequence) item.towerSequenceId = sequence.id;
      else delete item.towerSequenceId;
      if (!legendarySource) {
        item.modifiers = [...editedModifiers, ...(item.rarity === "legendary" ? item.implicitModifiers || [] : [])];
        if (blend) item.modifiers.push(blend.modifier);
        if (sequence) item.modifiers.push(sequence.modifier);
        item.corrodedModifierIndices = [...editingCorrodedModifierIndices];
      }
      item.corrosionModifiers = ($("[data-edit-corrosion]")?.value || "").split(" | ").filter(Boolean);
      const base = rareBaseForItem(item, [(item.name || "").replace(/ - Priceless$/i, ""), item.base]);
      if (!legendarySource)
        item.affixCount =
          Math.max(0, item.modifiers.length - (base?.modifiers?.length || 0)) + item.corrosionModifiers.length;
      inventoryItemEditing = false;
      persistPlannerState();
      renderCandidateViews();
      renderInventoryItemDialog();
      showToast("Inventory item updated");
    }
  }
  if (event.target.closest("[data-close-slate-editor]")) $("#slate-editor").close();
  if (event.target.closest("[data-add-slate-affix]")) {
    const list = $("#slate-editor-content fieldset");
    const index = list.querySelectorAll("[data-slate-affix]").length;
    event.target
      .closest("[data-add-slate-affix]")
      .insertAdjacentHTML(
        "beforebegin",
        `<label class="slate-affix-row"><span>Slot ${index + 1}</span><input type="text" data-slate-affix="${index}" value=""></label>`,
      );
  }
  const saveSlateEditor = event.target.closest("[data-save-slate-editor]");
  if (saveSlateEditor) {
    plannerState.slates.affixOverrides ||= {};
    plannerState.slates.affixOverrides[saveSlateEditor.dataset.saveSlateEditor] = [
      ...$("#slate-editor-content").querySelectorAll("[data-slate-affix]"),
    ]
      .map((input) => input.value.trim())
      .filter(Boolean);
    persistPlannerState();
    $("#slate-editor").close();
    renderCandidateViews();
    showToast("Slate affixes saved");
  }
  if (event.target.closest("[data-close-slate-inventory]")) $("#slate-inventory").close();
  if (event.target.closest("[data-open-slate-crafter]")) {
    editingCraftedSlateId = null;
    selectedLegendarySlateName = "";
    activeSlateCrafterTab = "craft";
    renderSlateCrafter();
  }
  if (event.target.closest("[data-back-slate-inventory]")) {
    editingCraftedSlateId = null;
    renderSlateInventory();
  }
  const inventoryTab = event.target.closest("[data-slate-inventory-tab]");
  if (inventoryTab) {
    activeSlateCrafterTab = inventoryTab.dataset.slateInventoryTab;
    if (activeSlateCrafterTab === "legendary" && !editingCraftedSlateId) selectedLegendarySlateName = "";
    renderSlateCrafter();
  }
  if (event.target.closest("[data-change-slate-template]")) {
    selectedLegendarySlateName = "";
    renderSlateCrafter();
  }
  const slateTemplate = event.target.closest("[data-slate-template]");
  if (slateTemplate) {
    selectedLegendarySlateName = slateTemplate.dataset.slateTemplate;
    if (
      [
        "Sparks of Moth Fire",
        "Residence of Stars",
        "When Sparks Set the Prairie Ablaze",
        "Space Rift",
        "Fallen Starlight",
        "A Corner of Divinity",
        "Pedigree of Gods",
      ].includes(selectedLegendarySlateName)
    )
      renderSlateCrafter();
    else {
      document
        .querySelectorAll("[data-slate-template]")
        .forEach((button) => button.classList.toggle("active", button === slateTemplate));
      const preview = $(".slate-empty-preview");
      if (preview) {
        const image = slateTemplate.querySelector("img");
        preview.className = "slate-craft-card";
        preview.innerHTML = `${image?.outerHTML || ""}<strong>${escapeHtml(selectedLegendarySlateName)}</strong><small>DIVINITY SLATE · LEGENDARY</small>`;
      }
    }
  }
  const slateGodButton = event.target.closest("[data-slate-god]");
  if (slateGodButton) {
    selectedSlateGod = slateGodButton.dataset.slateGod;
    renderSlateCrafter();
  }
  const netherTypeButton = event.target.closest("[data-nether-slate-type]");
  if (netherTypeButton) {
    selectedNetherSlateType = netherTypeButton.dataset.netherSlateType;
    renderSlateCrafter();
  }
  const craftShape = event.target.closest("[data-craft-shape]");
  if (craftShape) {
    document
      .querySelectorAll("[data-craft-shape]")
      .forEach((button) => button.classList.toggle("active", button === craftShape));
    const art = craftShape.querySelector("img,.god-slate-shape"),
      preview = document.querySelector(".slate-shape-preview");
    if (art && preview) {
      preview.innerHTML = art.outerHTML;
      preview.dataset.rotation = "0";
      preview.dataset.flipX = "1";
      preview.dataset.flipY = "1";
      updateSlateCraftPreview();
    }
  }
  const craftTransform = event.target.closest("[data-craft-transform]");
  if (craftTransform) {
    const rules = slateTransformRules(activeSlateCrafterTab === "legendary" ? selectedLegendarySlateName : ""),
      operation = craftTransform.dataset.craftTransform;
    if ((operation === "rotate" && !rules.rotate) || (operation !== "rotate" && !rules.flip)) return;
    const preview = document.querySelector(".slate-shape-preview"),
      art = preview?.querySelector("img,.god-slate-shape");
    if (preview && art) {
      let rotation = Number.parseInt(preview.dataset.rotation || "0", 10),
        flipX = Number.parseInt(preview.dataset.flipX || "1", 10),
        flipY = Number.parseInt(preview.dataset.flipY || "1", 10);
      if (operation === "rotate") rotation = (rotation + 90) % 360;
      if (operation === "flip-h") flipX *= -1;
      if (operation === "flip-v") flipY *= -1;
      preview.dataset.rotation = String(rotation);
      preview.dataset.flipX = String(flipX);
      preview.dataset.flipY = String(flipY);
      art.style.transform = `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;
      updateSlateCraftPreview();
    }
  }
  if (event.target.closest("[data-add-crafted-slate]")) {
    const activeShape = $("[data-craft-shape].active"),
      preview = $(".slate-shape-preview"),
      template = $("[data-slate-template].active"),
      nameInput = $("[data-slate-craft-name]");
    const fallbackName =
      activeSlateCrafterTab === "judgment"
        ? `Nether King's Divinity: ${selectedNetherSlateType}`
        : template?.dataset.slateTemplate || selectedSlateGod;
    const originalSlate = (plannerState.slates.inventory || []).find((slate) => slate.id === editingCraftedSlateId);
    const previewImage = preview?.querySelector("img") || template?.querySelector("img") || $(".slate-craft-card img");
    const legendaryCopyRule =
      activeSlateCrafterTab !== "legendary"
        ? ""
        : fallbackName === "Sparks of Moth Fire"
          ? $("[data-sparks-copy-rule]")?.value || sparksOfMothFireCopyRules[0]
          : fallbackName === "Residence of Stars"
            ? residenceOfStarsCopyRule
            : fallbackName === "When Sparks Set the Prairie Ablaze"
              ? prairieAblazeCopyRule
              : fallbackName === "Space Rift"
                ? $("[data-legendary-copy-rule]")?.value || spaceRiftCopyRules[0]
                : "";
    const legendaryAffixSelects = [...document.querySelectorAll("[data-legendary-affix]")];
    const standardAffixSelects = [...document.querySelectorAll("#slate-crafter-body .slate-affix-row select")];
    const affixGroups =
      activeSlateCrafterTab === "legendary"
        ? null
        : {
            fixed: standardAffixSelects.slice(0, 2).map((select) => select.value),
            [activeSlateCrafterTab === "judgment" ? "brand" : "random"]: standardAffixSelects
              .slice(2)
              .map((select) => select.value),
          };
    const affixes = legendaryCopyRule
      ? [legendaryCopyRule]
      : legendaryAffixSelects.length
        ? legendaryAffixSelects.map((select) => select.value)
        : standardAffixSelects.map((select) => select.value).filter(Boolean);
    const crafted = {
      id: globalThis.crypto?.randomUUID?.() || `slate-${Date.now()}`,
      name:
        nameInput?.value.trim() ||
        (activeSlateCrafterTab === "legendary" && originalSlate?.template === fallbackName
          ? originalSlate.name
          : fallbackName),
      ...(activeSlateCrafterTab === "legendary" ? { template: fallbackName } : {}),
      god: activeSlateCrafterTab === "judgment" ? "Nether King" : selectedSlateGod,
      shape: activeShape?.dataset.craftShape || "single",
      rotation: Number(preview?.dataset.rotation || 0),
      flipX: Number(preview?.dataset.flipX || 1),
      flipY: Number(preview?.dataset.flipY || 1),
      affixes,
      ...(affixGroups ? { affixGroups } : {}),
      ...(legendaryCopyRule ? { copyRule: legendaryCopyRule } : {}),
      rarity: activeSlateCrafterTab === "craft" ? "magic" : "legendary",
      icon: previewImage?.getAttribute("src") || "",
    };
    plannerState.slates.inventory ||= [];
    const editedIndex = editingCraftedSlateId
      ? plannerState.slates.inventory.findIndex((slate) => slate.id === editingCraftedSlateId)
      : -1;
    let removedFromGrid = false;
    if (editedIndex >= 0) {
      crafted.id = editingCraftedSlateId;
      plannerState.slates.inventory[editedIndex] = crafted;
      if (equippedSlateIds.has(crafted.id)) {
        const boardSlate = craftedSlateForBoard(crafted),
          current = slatePlacements[crafted.id];
        if (current && !canPlaceSlate(boardSlate, current, slatePlacements, slatesForBoard())) {
          let placement = null;
          for (let row = 1; row <= 6 && !placement; row += 1)
            for (let column = 1; column <= 6 && !placement; column += 1) {
              const candidate = { ...current, row, column };
              if (canPlaceSlate(boardSlate, candidate, slatePlacements, slatesForBoard())) placement = candidate;
            }
          if (placement) slatePlacements = { ...slatePlacements, [crafted.id]: placement };
          else {
            equippedSlateIds.delete(crafted.id);
            const placements = { ...slatePlacements };
            delete placements[crafted.id];
            slatePlacements = placements;
            parkSlateBesideGrid(boardSlate, crafted.rotation || 0, crafted.flipX || 1, crafted.flipY || 1);
            removedFromGrid = true;
          }
        }
      }
    } else plannerState.slates.inventory.push(crafted);
    editingCraftedSlateId = null;
    persistPlannerState();
    renderSlateInventory();
    if (removedFromGrid) renderCandidateViews();
    showToast(
      removedFromGrid
        ? `${crafted.name} moved beside the grid; its new shape does not fit`
        : editedIndex >= 0
          ? `${crafted.name} updated`
          : `${crafted.name} added to Slate Inventory`,
    );
  }
  const deleteCraftedSlate = event.target.closest("[data-delete-crafted-slate]");
  if (deleteCraftedSlate) {
    const id = deleteCraftedSlate.dataset.deleteCraftedSlate;
    plannerState.slates.inventory = (plannerState.slates.inventory || []).filter((slate) => slate.id !== id);
    equippedSlateIds.delete(id);
    delete parkedSlates[id];
    const placements = { ...slatePlacements };
    delete placements[id];
    slatePlacements = placements;
    persistPlannerState();
    renderSlateInventory();
    showToast("Slate deleted");
  }
  const duplicateCraftedSlate = event.target.closest("[data-duplicate-crafted-slate]");
  if (duplicateCraftedSlate) {
    const source = (plannerState.slates.inventory || []).find(
      (slate) => slate.id === duplicateCraftedSlate.dataset.duplicateCraftedSlate,
    );
    if (source) {
      plannerState.slates.inventory.push({
        ...structuredClone(source),
        id: globalThis.crypto?.randomUUID?.() || `slate-${Date.now()}`,
        name: `${source.name} Copy`,
      });
      persistPlannerState();
      renderSlateInventory();
      showToast("Slate duplicated");
    }
  }
  const editCraftedSlate = event.target.closest("[data-edit-crafted-slate]");
  if (editCraftedSlate) {
    const slate = (plannerState.slates.inventory || []).find(
      (item) => item.id === editCraftedSlate.dataset.editCraftedSlate,
    );
    if (slate) openCraftedSlateEditor(slate);
  }
  const removeCraftedSlate = event.target.closest("[data-remove-crafted-slate]");
  if (removeCraftedSlate) {
    const id = removeCraftedSlate.dataset.removeCraftedSlate;
    equippedSlateIds.delete(id);
    delete parkedSlates[id];
    const placements = { ...slatePlacements };
    delete placements[id];
    slatePlacements = placements;
    persistPlannerState();
    renderSlateInventory();
    showToast("Slate removed from grid");
  }
  // The slate editor's Rotate / Flip buttons (the board's tools are apps/web/src/features/slates).
  const slateRotateButton = event.target.closest("[data-slate-rotate]");
  if (slateRotateButton)
    transformSlate(slateRotateButton.dataset.slateRotate, {
      rotate: Number(slateRotateButton.dataset.slateRotateDir || 1),
    });
  const slateFlipButton = event.target.closest("[data-slate-flip]");
  if (slateFlipButton)
    transformSlate(slateFlipButton.dataset.slateFlip, { flip: slateFlipButton.dataset.slateFlipAxis });
});

// Skill selector commands (apps/web/src/shell/dialogs/SkillSelectorDialog.tsx and SkillSelectorDetail.tsx).
// Confirm: `levelText` is the level field as typed (the generic modes).
function confirmSkillSelector(levelText) {
  if (selectorKind === "follower-skill") {
    const entry = followerSelectorEntries(plannerState, followerSelectorSlot)[selectorChoiceIndex];
    if (!entry) return;
    const draft =
      followerSelectorDraft?.name === entry.name
        ? followerSelectorDraft
        : followerSkillDraft(plannerState, followerSelectorSlot, entry.name);
    followerSelectorDraft = null;
    $("#skill-selector").close();
    commitFollower(
      applyFollowerSkillDraft(plannerState, followerSelectorSlot, draft),
      `${escapeHtml(entry.name)} equipped`,
    );
    return;
  }
  selectorLevel = Math.max(1, Math.min(40, Number(levelText) || selectorLevel || 20));
  const entry = selectorEntries()[selectorChoiceIndex];
  if (!entry || (selectorKind === "support" && !supportFitsSlot(entry, selectorTargetSupportSlot))) return;
  const selected = selectorTargetSetup();
  if (selectorKind === "hero-support") {
    plannerState.hero.heroTraitSupports[activeHeroTraitSupportId] = entry.name;
    plannerState.hero.heroTraitSupportLevels[activeHeroTraitSupportId] = selectorLevel;
    if (selectorSpecialConfig)
      plannerState.hero.heroTraitSupportConfigs[activeHeroTraitSupportId] = { ...selectorSpecialConfig };
    else delete plannerState.hero.heroTraitSupportConfigs[activeHeroTraitSupportId];
    persistPlannerState();
    showToast(
      `${escapeHtml(entry.name)} linked to ${escapeHtml(heroTraitSupportConfig[activeHeroTraitSupportId]?.skill || "trait skill")}`,
    );
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
    showToast(`${escapeHtml(entry.name)} setup added`);
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
    showToast(`${escapeHtml(entry.name)} linked to ${escapeHtml(selected.name)}`);
  }
  $("#skill-selector").close();
  renderCandidateViews();
}
// Clear slot: empties the slot the selector was opened for.
function clearSkillSelectorSlot() {
  if (selectorKind === "follower-skill") {
    $("#skill-selector").close();
    commitFollower(setFollowerSkill(plannerState, followerSelectorSlot, null), "Skill slot cleared");
    return;
  }
  const selected = selectorTargetSetup();
  if (selectorKind === "hero-support") {
    delete plannerState.hero.heroTraitSupports[activeHeroTraitSupportId];
    delete plannerState.hero.heroTraitSupportLevels[activeHeroTraitSupportId];
    delete plannerState.hero.heroTraitSupportConfigs[activeHeroTraitSupportId];
  } else if (selectorKind === "skill" && (selected?.enabled || selected?.slotInactive)) {
    plannerState.skills.boardSlots = assignSkillBoardSlot(
      plannerState.skills.boardSlots,
      activeSkillBoardTab,
      selectorBoardSetups(),
      selectorTargetRow,
      "",
    );
    const selectedKey = setupStateKey(selected),
      customIndex = plannerState.skills.customSetups.findIndex(
        (setup) => (setup.instanceId || setup.name) === selectedKey,
      );
    if (customIndex >= 0) plannerState.skills.customSetups.splice(customIndex, 1);
    else plannerState.skills.setupEnabled[selectedKey] = false;
    delete plannerState.skills.customSupports[selectedKey];
    delete plannerState.skills.supportOrder[selectedKey];
  } else if (selectorKind === "support" && selected) {
    const selectedKey = setupStateKey(selected),
      order = [
        ...(plannerState.skills.supportOrder[selectedKey] ||
          userInstalledSupports(selected).map((support) => support.name)),
      ];
    const supportName = order[selectorTargetSupportSlot];
    const support = selected.supports.find((item) => item.enabled && item.name === supportName);
    if (support) {
      if (support.custom)
        plannerState.skills.customSupports[selectedKey] = (
          plannerState.skills.customSupports[selectedKey] || []
        ).filter((item) => item.name !== support.name);
      else plannerState.skills.supportEnabled[supportStateKey(selectedKey, support.name)] = false;
    }
    while (order.length < 5) order.push("");
    order[selectorTargetSupportSlot] = "";
    plannerState.skills.supportOrder[selectedKey] = order.slice(0, 5);
  }
  $("#skill-selector").close();
  persistPlannerState();
  renderCandidateViews();
  showToast("Slot cleared");
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
function stepSelectorLevel(delta) {
  selectorLevel = clampLevel(selectorLevel + delta);
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

// ---- Divinity Slates board (apps/web/src/features/slates): the board reads the "slates" source; these carry out its edits.
function selectSlate(id, toolsPosition) {
  slateToolsPosition = toolsPosition;
  selectedSlateId = id;
  slatePlacementTarget = id;
  renderSlates();
}
// A click away from the slates and their tools, while the board is shown.
function clearSlateSelection() {
  if (!selectedSlateId || !talentSlateMode) return;
  selectedSlateId = null;
  slateToolsPosition = null;
  if (!slateEditMode) slatePlacementTarget = null;
  renderSlates();
}
function startSlateMove(id) {
  slatePlacementTarget = id;
  slateEditMode = true;
  renderSlates();
  showToast("Choose an empty board cell");
}
// Move mode: the cell the slate's top-left corner goes to.
function placeSlateAtCell(column, row) {
  if (!slateEditMode || !slatePlacementTarget) return;
  const slate = slatesForBoard().find((item) => item.id === slatePlacementTarget),
    previous = slatePlacements[slate.id] || parkedSlates[slate.id] || {};
  const candidate = {
    column,
    row,
    rotation: previous.rotation || 0,
    flipX: previous.flipX || 1,
    flipY: previous.flipY || 1,
  };
  if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    slatePlacements = { ...slatePlacements, [slate.id]: candidate };
    equippedSlateIds.add(slate.id);
    delete parkedSlates[slate.id];
    persistPlannerState();
    renderCandidateViews();
  } else showToast("That slate overlaps or leaves the statue board");
}
// Rotates ({ rotate: 1 | -1 }) or flips ({ flip: "x" | "y" }) a slate; one that no longer fits waits under the pointer.
function transformSlate(id, change) {
  const slate = slatesForBoard().find((item) => item.id === id);
  if (!slate || !slateTransformRules(slate)[change.rotate ? "rotate" : "flip"]) return;
  const parked = !!parkedSlates[slate.id],
    current = parked ? parkedSlates[slate.id] : slatePlacements[slate.id];
  if (!current) return;
  const key = change.flip === "y" ? "flipY" : "flipX",
    candidate = change.rotate
      ? { ...current, rotation: ((current.rotation || 0) + change.rotate * 90 + 360) % 360 }
      : { ...current, [key]: -Number(current[key] || 1) };
  if (parked) {
    parkedSlates = { ...parkedSlates, [slate.id]: candidate };
    persistPlannerState();
  } else if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    slatePlacements = { ...slatePlacements, [slate.id]: candidate };
    persistPlannerState();
    if (change.rotate && $("#slate-editor").open) renderSlateEditor(slate);
  } else pickUpTransformedSlate(slate, current, candidate, change.rotate ? "Rotated" : "Flipped");
}
// The wheel over the board with a slate selected: down rotates clockwise (Pedigree of Gods flips horizontally), up the
// other way (Pedigree of Gods flips vertically).
function wheelTransformSlate(down) {
  const slate = slatesForBoard().find((item) => item.id === selectedSlateId);
  if (!slate || (!slateTransformRules(slate).rotate && !slateTransformRules(slate).flip)) return;
  const parked = !!parkedSlates[selectedSlateId],
    current = parked ? parkedSlates[selectedSlateId] : slatePlacements[selectedSlateId];
  if (!current) return;
  const pedigree = slate.template === "Pedigree of Gods" || slate.name === "Pedigree of Gods";
  const axis = down ? "flipX" : "flipY";
  const candidate = pedigree
    ? { ...current, [axis]: -(current[axis] || 1) }
    : { ...current, rotation: ((current.rotation || 0) + (down ? 90 : -90) + 360) % 360 };
  if (parked) {
    parkedSlates = { ...parkedSlates, [selectedSlateId]: candidate };
    persistPlannerState();
    renderSlates();
  } else if (canPlaceSlate(slate, candidate, slatePlacements, slatesForBoard())) {
    slatePlacements = { ...slatePlacements, [selectedSlateId]: candidate };
    persistPlannerState();
    renderSlates();
  } else pickUpTransformedSlate(slate, current, candidate, pedigree ? "Flipped" : "Rotated");
}
// Removes an equipped or parked slate; for another slate, starts Move mode with it.
function removeSlate(id) {
  if (equippedSlateIds.has(id) || parkedSlates[id]) {
    equippedSlateIds.delete(id);
    delete parkedSlates[id];
    const next = { ...slatePlacements };
    delete next[id];
    slatePlacements = next;
    selectedSlateId = null;
    slateToolsPosition = null;
  } else {
    slatePlacementTarget = id;
    slateEditMode = true;
  }
  persistPlannerState();
  renderCandidateViews();
}
// The end of a drag: `placement` is the grid position under the slate (null off the grid), `parked` its stage position
// beside the grid (null on the grid or off the stage), both measured by the board.
function dropSlate(id, { placement, parked }) {
  const slate = slatesForBoard().find((item) => item.id === id);
  if (slate && placement && canPlaceSlate(slate, placement, slatePlacements, slatesForBoard())) {
    slatePlacements = { ...slatePlacements, [id]: placement };
    equippedSlateIds.add(id);
    delete parkedSlates[id];
    persistPlannerState();
    showToast("Slate placed on grid");
  } else if (slate && parked) {
    parkedSlates = { ...parkedSlates, [id]: parked };
    equippedSlateIds.delete(id);
    const next = { ...slatePlacements };
    delete next[id];
    slatePlacements = next;
    persistPlannerState();
    showToast("Slate parked beside the grid");
  } else {
    renderSlates();
    showToast("That slate does not fit there");
  }
}
// Right-click on a slate: takes an equipped or parked slate off the board; false for any other (the browser menu opens).
function rightClickRemoveSlate(id) {
  if (!equippedSlateIds.has(id) && !parkedSlates[id]) return false;
  equippedSlateIds.delete(id);
  delete parkedSlates[id];
  const placements = { ...slatePlacements };
  delete placements[id];
  slatePlacements = placements;
  persistPlannerState();
  renderCandidateViews();
  showToast("Slate removed");
  return true;
}
function editSlate(id) {
  const crafted = (plannerState.slates.inventory || []).find((item) => item.id === id);
  if (crafted) {
    openCraftedSlateEditor(crafted);
    if (!$("#slate-inventory").open) $("#slate-inventory").showModal();
  } else {
    const slate = slatesForBoard().find((item) => item.id === id);
    if (slate) {
      renderSlateEditor(slate);
      $("#slate-editor").showModal();
    }
  }
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
  $("#skill-selector").showModal();
  $("#skill-selector-search").focus();
}
// Right-click on a skill: false when the row holds none of the user's skills (the browser menu opens instead).
function removeBoardSkill(row) {
  const board = selectorBoardSetups();
  const setup = board[row];
  if (!setup) return false;
  plannerState.skills.boardSlots = assignSkillBoardSlot(
    plannerState.skills.boardSlots,
    activeSkillBoardTab,
    board,
    row,
    "",
  );
  const setupKey = setupStateKey(setup),
    customIndex = plannerState.skills.customSetups.findIndex((item) => (item.instanceId || item.name) === setupKey);
  if (customIndex >= 0) plannerState.skills.customSetups.splice(customIndex, 1);
  else plannerState.skills.setupEnabled[setupKey] = false;
  delete plannerState.skills.customSupports[setupKey];
  delete plannerState.skills.supportOrder[setupKey];
  delete plannerState.skills.skillLevels[setupKey];
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(setup.name)} removed`);
  return true;
}
// Right-click on a support: false when the socket holds none of the user's supports.
function removeBoardSupport(row, slot) {
  const setup = selectorBoardSetups(true)[row];
  if (!setup) return false;
  const setupKey = setupStateKey(setup),
    order = [
      ...(plannerState.skills.supportOrder[setupKey] || userInstalledSupports(setup).map((support) => support.name)),
    ];
  const name = order[slot];
  const support = setup.supports.find((item) => item.enabled && item.name === name);
  if (!support) return false;
  if (support.custom)
    plannerState.skills.customSupports[setupKey] = (plannerState.skills.customSupports[setupKey] || []).filter(
      (item) => item.name !== support.name,
    );
  else plannerState.skills.supportEnabled[supportStateKey(setupKey, support.name)] = false;
  while (order.length < 5) order.push("");
  order[slot] = "";
  plannerState.skills.supportOrder[setupKey] = order.slice(0, 5);
  persistPlannerState();
  renderCandidateViews();
  showToast(`${escapeHtml(support.name)} removed`);
  return true;
}
// A skill dropped on another row of its tab: the two swap places (or the skill moves to the empty row).
function moveBoardSkill(tab, from, to) {
  if (tab !== activeSkillBoardTab) {
    showToast("Invalid drop · skill returned to its original slot");
    return;
  }
  if (to === from) return;
  const rows = selectorBoardSetups();
  plannerState.skills.boardSlots = moveSkillBoardSlot(plannerState.skills.boardSlots, tab, rows, from, to);
  persistPlannerState();
  renderCandidateViews();
  const label = tab === "auras" ? "Auras" : "Active skills";
  showToast(rows[to] ? `${label} swapped` : `${label} moved`);
}
// A support dropped on a socket of its tab: moved, swapped with the support there, or (duplicate) copied.
function moveBoardSupport({ tab, fromRow, fromSlot, setupKey, toRow, toSlot, duplicate }) {
  if (tab !== activeSkillBoardTab) {
    showToast("Invalid drop · support returned to its slot");
    return;
  }
  const rows = selectorBoardSetups(true),
    fromSetup = rows[fromRow],
    toSetup = rows[toRow];
  if (!fromSetup || !toSetup || setupStateKey(fromSetup) !== setupKey) {
    showToast("The skill board changed during the drag");
    return;
  }
  const result = transferSupportSlot(plannerState.skills, fromSetup, fromSlot, toSetup, toSlot, { duplicate });
  if (result.error) {
    showToast(result.error);
    return;
  }
  if (result.action === "unchanged") return;
  plannerState.skills = result.skills;
  persistPlannerState();
  renderCandidateViews();
  showToast(
    `${duplicate ? "Support duplicated" : result.action === "swapped" ? "Supports swapped" : "Support moved"} to ${escapeHtml(toSetup.name)}`,
  );
}
function resetSkills() {
  for (const setup of currentEditedSetups()) plannerState.skills.setupEnabled[setupStateKey(setup)] = false;
  plannerState.skills.customSetups = [];
  plannerState.skills.customSupports = {};
  plannerState.skills.supportOrder = {};
  plannerState.skills.skillLevels = {};
  plannerState.skills.supportLevels = {};
  plannerState.skills.specialSupportConfigs = {};
  plannerState.skills.supportEnabled = {};
  plannerState.skills.setupOrder = null;
  plannerState.skills.boardSlots = { skills: [], auras: [] };
  disabledSupportNames.clear();
  persistPlannerState();
  renderCandidateViews();
  showToast("Skills reset to empty");
}
// Moves (or copies) a Kismet dropped on another slot of its kind (apps/web/src/features/pacts/use-kismet-drag.ts).
function moveKismet(fromKey, toKey, kind, duplicate) {
  const result = transferKismetSlot(plannerState.pacts.kismetSlots, fromKey, toKey, { duplicate });
  if (result.error) {
    showToast(result.error);
    return;
  }
  if (result.action === "unchanged") return;
  const summary = equippedKismetSummary(selenaScorchingBeamPactsSs13, {
    ...plannerState.pacts,
    kismetSlotMode: true,
    kismetSlots: result.slots,
  });
  if (summary.microCount > summary.microMax || summary.mediumCount > summary.mediumMax) {
    showToast(`${kind === "micro" ? "Micro" : "Medium"} Kismet slots are full`);
    return;
  }
  plannerState.pacts.kismetSlots = result.slots;
  hidePlannerTooltip();
  refreshPactCandidate();
  showToast(`Kismet ${result.action}`);
}
document.addEventListener("dragstart", (event) => {
  if (event.target.closest(".pact-tree-node.has-kismet")) event.preventDefault();
});

$("#kismet-search").addEventListener("input", renderKismetChoices);
$("#kismet-roll-controls").addEventListener("input", (event) => {
  const target = event.target.closest("[data-kismet-roll-range],[data-kismet-roll-number]");
  if (!target) return;
  const index = Number(target.dataset.kismetRollRange ?? target.dataset.kismetRollNumber),
    entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName),
    control = entry && kismetRollControls(entry)[index];
  if (!control) return;
  const value = Number(target.value);
  if (!Number.isFinite(value) || value < control.min || value > control.max) return;
  selectedKismetRolls[index] = value;
  const companion = $(
    target.matches("[data-kismet-roll-range]")
      ? `[data-kismet-roll-number="${index}"]`
      : `[data-kismet-roll-range="${index}"]`,
  );
  if (companion) companion.value = value;
  const output = $(`[data-kismet-roll-output="${index}"]`);
  if (output) output.textContent = value;
  renderKismetPreview();
});
$("#kismet-roll-controls").addEventListener("change", (event) => {
  const target = event.target.closest("[data-kismet-roll-number]");
  if (!target) return;
  const entry = kismetCatalogSs13.find((item) => item.name === selectedKismetName);
  if (!entry) return;
  const index = Number(target.dataset.kismetRollNumber),
    rolls = [...selectedKismetRolls];
  rolls[index] = target.value;
  selectedKismetRolls = normalizeKismetRolls(entry, rolls);
  target.value = selectedKismetRolls[index];
  $(`[data-kismet-roll-range="${index}"]`).value = selectedKismetRolls[index];
  $(`[data-kismet-roll-output="${index}"]`).textContent = selectedKismetRolls[index];
  renderKismetPreview();
});
$("#kismet-crafter").addEventListener("close", () => {
  activeKismetSlot = null;
});

document.addEventListener("change", (event) => {
  if (event.target.checkValidity && !event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
  if (event.target.matches("[data-legendary-tier]")) {
    selectedLegendaryTierChoices.set(Number(event.target.dataset.legendaryTier), Number(event.target.value));
    renderEquipmentCrafter();
    return;
  }
  if (event.target.matches("[data-edit-legendary-tier]")) {
    const index = Number(event.target.dataset.editLegendaryTier);
    editingTierChoices.set(index, Number(event.target.value));
    editingLegendaryTexts.delete(index);
    renderInventoryItemDialog();
    return;
  }
  if (event.target.matches("[data-legendary-placeholder]")) {
    const index = Number(event.target.dataset.legendaryPlaceholder);
    if (event.target.value) selectedLegendaryPlaceholderChoices.set(index, event.target.value);
    else selectedLegendaryPlaceholderChoices.delete(index);
    renderEquipmentCrafter();
    return;
  }
  if (event.target.matches("[data-edit-legendary-placeholder]")) {
    const index = Number(event.target.dataset.editLegendaryPlaceholder);
    if (event.target.value) editingPlaceholderChoices.set(index, event.target.value);
    else editingPlaceholderChoices.delete(index);
    editingLegendaryTexts.delete(index);
    renderInventoryItemDialog();
    return;
  }
  if (event.target.matches("[data-legendary-ring-option]")) {
    selectedFolkloreRingOption = event.target.value;
    event.target
      .closest(".legendary-mod-control")
      ?.querySelector("[data-legendary-mod]")
      ?.replaceChildren(folkloreRingModifier(selectedFolkloreRingOption, selectedLegendaryCorrodedModifiers.has(2)));
    const selected = legendaryGearSs13[selectedLegendaryIndex],
      preview = $("#legendary-config-preview"),
      corrosion = configuredCorrosionModifier();
    if (selected && preview)
      preview.innerHTML = `<small>Preview</small>${equipmentPreview({ ...selected, base: selectedLegendaryBase, corrodedModifierIndices: [...selectedLegendaryCorrodedModifiers], modifiers: configuredLegendaryModifiersWithSpecials(), corrosionModifiers: corrosion ? [corrosion] : [] })}`;
    return;
  }
  if (event.target.matches("[data-edit-legendary-ring-option]")) {
    editingFolkloreRingOption = event.target.value;
    const text = folkloreRingModifier(editingFolkloreRingOption, editingCorrodedModifierIndices.has(2)),
      control = event.target.closest(".legendary-mod-control"),
      item = inventoryItems().find((entry) => entry.id === selectedInventoryItemId);
    control?.querySelector("[data-edit-modifier-text]")?.replaceChildren(text);
    if (control?.querySelector("[data-edit-modifier]")) control.querySelector("[data-edit-modifier]").value = text;
    editingLegendaryTexts.set(2, text);
    const preview = $("#inventory-item-body .gear-edit-layout aside");
    if (item && preview) preview.innerHTML = `<small>Preview</small>${equipmentPreview(inventoryEditingPreview(item))}`;
    return;
  }
});

const restoredWorkspaceLocation = readWorkspaceLocation();
if (restoredWorkspaceLocation) {
  activeStatsPanel = ["sheet", "damage-path"].includes(restoredWorkspaceLocation.statsPanel)
    ? restoredWorkspaceLocation.statsPanel
    : "sheet";
  selectedDamagePath = DAMAGE_PATH_KEY.test(restoredWorkspaceLocation.damagePath || "")
    ? restoredWorkspaceLocation.damagePath
    : "hit";
  if (typeof restoredWorkspaceLocation.statSheetSkill === "string")
    selectedStatSheetSkill = restoredWorkspaceLocation.statSheetSkill;
  const slot = plannerState.talents.selectedTrees.indexOf(restoredWorkspaceLocation.panel);
  if (slot >= 0) {
    activeTalentSlot = slot;
    activeTalentPanel = restoredWorkspaceLocation.panel;
  }
  talentSlateMode = restoredWorkspaceLocation.view === "slates";
}
function updateRangeFill(range) {
  const min = range.min === "" ? 0 : Number(range.min),
    max = range.max === "" ? 100 : Number(range.max),
    value = Number(range.value);
  const percent = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  range.style.setProperty("--range-fill", `${percent}%`);
}
const refreshRangeFills = () => document.querySelectorAll('input[type="range"]').forEach(updateRangeFill);
let rangeFillRefreshPending = false;
const scheduleRangeFillRefresh = () => {
  if (rangeFillRefreshPending) return;
  rangeFillRefreshPending = true;
  requestAnimationFrame(() => {
    rangeFillRefreshPending = false;
    refreshRangeFills();
  });
};
new MutationObserver((mutations) => {
  if (
    mutations.some(({ addedNodes }) =>
      [...addedNodes].some(
        (node) =>
          node.nodeType === 1 && (node.matches?.('input[type="range"]') || node.querySelector?.('input[type="range"]')),
      ),
    )
  )
    scheduleRangeFillRefresh();
}).observe(document.body, { childList: true, subtree: true });
document.addEventListener("input", scheduleRangeFillRefresh);
document.addEventListener("change", scheduleRangeFillRefresh);
function restoreSummaryText({ added, renamed, unchanged, skipped, saved }) {
  const parts = [`Restored ${added} build${added === 1 ? "" : "s"}`];
  if (renamed) parts.push(`${renamed} renamed (same id already in library)`);
  if (unchanged) parts.push(`${unchanged} already in library`);
  if (skipped) parts.push(`${skipped} skipped (invalid)`);
  if (added && !saved) parts.push("not saved: browser storage is full");
  return parts.join(" · ");
}
$("#restore-builds-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    showToast("That file is not a valid backup (not JSON)");
    return;
  }
  try {
    persistPlannerState();
    const summary = restoreBuildsFromBackup(backup);
    updateStorageStatus();
    showToast(restoreSummaryText(summary));
  } catch (error) {
    showToast(error?.message || "That backup could not be restored");
  }
});
// Stored data that could not be loaded is kept unchanged (build-library.ts); say so and offer a backup.
function renderLibraryNotice() {
  document.querySelector(".library-notice")?.remove();
  let issues;
  try {
    issues = libraryLoadIssues();
  } catch {
    return;
  }
  const backupButton =
    '<button class="button button-secondary" type="button" data-backup-builds>Download backup</button>';
  let html = "";
  if (issues.unreadable)
    html = `<span>Your saved builds couldn't be read. They are kept unchanged in this browser, and nothing is saved until you choose.</span><span class="library-notice-actions">${backupButton}<button class="button" type="button" data-start-new-library>Start a new library (your unreadable data stays backed up)</button></span>`;
  else if (issues.quarantinedBuilds.length) {
    const count = issues.quarantinedBuilds.length;
    html = `<span>${count} build${count === 1 ? "" : "s"} couldn't be loaded and ${count === 1 ? "is" : "are"} kept unchanged: ${issues.quarantinedBuilds.map((entry) => escapeHtml(entry.name)).join(", ")}.</span><span class="library-notice-actions">${backupButton}</span>`;
  }
  if (html)
    document
      .querySelector("main")
      ?.insertAdjacentHTML("afterbegin", `<div class="notice library-notice" role="status">${html}</div>`);
}
renderLibraryNotice();
if (calculationsPaused)
  $("#builds-view").insertAdjacentHTML(
    "afterbegin",
    '<div class="notice safe-mode-banner" role="status"><strong>Safe mode: calculations paused</strong><button class="button" type="button" data-resume-calculations>Resume calculations</button></div>',
  );
renderCandidateViews();
scheduleRangeFillRefresh();
updateStorageStatus();
const restoredView = [
  "talents",
  "slates",
  "skills",
  "equipment",
  "pacts",
  "builds",
  "character",
  "configuration",
].includes(restoredWorkspaceLocation?.view)
  ? restoredWorkspaceLocation.view
  : "talents";
runGuardedRender(() =>
  activateWorkspaceView(restoredView === "slates" ? "talents" : restoredView, { scroll: false, remember: false }),
);
if (restoredView === "slates") activeWorkspaceView = "talents";
if (restoredWorkspaceLocation && Number.isFinite(restoredWorkspaceLocation.scrollY))
  requestAnimationFrame(() => window.scrollTo(0, Math.max(0, restoredWorkspaceLocation.scrollY)));
window.addEventListener("pagehide", saveWorkspaceLocation);
// Each tab autosaves synchronously on every edit; this also writes anything
// still unsaved when the tab is hidden, closed or reloaded.
function flushPlannerState() {
  try {
    const state = capturePlannerState();
    upgradeExistingCorrodedItems(state);
    savePlannerState(state);
  } catch {}
}
window.addEventListener("pagehide", flushPlannerState);
window.addEventListener("beforeunload", flushPlannerState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPlannerState();
});
// Another tab changed the shared build library. Policy (build-library.ts,
// reconcileExternalLibraryChange): this tab keeps its own build and its own
// in-memory state; only the Build Library list and names refresh. When another
// tab saved a different version of the build open here, a notice offers to
// reload it (never automatic); otherwise this tab's next edit wins. A build
// deleted elsewhere is not recreated: this tab moves to another build.
// A hidden tab keeps its state in sync (cheap) but recalculates and redraws only
// when it becomes visible again, so a save in one tab does not run the
// calculator in every background tab.
let deferredExternalChange = null;
function showExternalChange(change) {
  if (change.recalculate) renderCandidateViews();
  if (change.deleted && !loadBuildLibrary().builds.length) activateWorkspaceView("builds", { scroll: false });
  else if (!change.recalculate && activeWorkspaceView === "builds") updateStorageStatus();
  if (change.message) showToast(change.message);
}
function hideOtherTabNotice() {
  document.getElementById("other-tab-notice")?.remove();
}
// Same look as the toast, but it stays (with a Reload action) until used or dismissed.
function showOtherTabNotice() {
  if (document.getElementById("other-tab-notice")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div id="other-tab-notice" class="toast toast-action visible" role="status" aria-live="polite"><span>This build was changed in another tab · </span><button type="button" data-reload-other-tab>Reload it</button><button type="button" class="toast-dismiss" data-dismiss-other-tab aria-label="Dismiss">×</button></div>',
  );
  const notice = document.getElementById("other-tab-notice");
  notice.querySelector("[data-reload-other-tab]").addEventListener("click", () => {
    hideOtherTabNotice();
    applyPlannerState(loadPlannerState());
    pendingCandidateRender = false;
    renderCandidateViews();
    updateStorageStatus();
    showToast("Build reloaded");
  });
  notice.querySelector("[data-dismiss-other-tab]").addEventListener("click", () => {
    dismissOpenBuildChange();
    hideOtherTabNotice();
  });
}
window.addEventListener("storage", (event) => {
  if (event.key !== null && event.key !== plannerLibraryStorageKey) return;
  const result = reconcileExternalLibraryChange(capturePlannerState());
  const hidden = document.visibilityState === "hidden";
  if (result.kind === "deleted") {
    hideOtherTabNotice();
    applyPlannerState(result.state);
    renderLibraryNotice();
    const change = { recalculate: true, deleted: true, message: "The open build was deleted in another tab" };
    // applyPlannerState queued a render; a hidden tab skips it until it is shown.
    if (hidden) {
      pendingCandidateRender = false;
      deferredExternalChange = change;
      return;
    }
    deferredExternalChange = null;
    showExternalChange(change);
    return;
  }
  // "dismissed": the user already closed the notice for this version.
  if (result.kind === "changed") showOtherTabNotice();
  else if (result.kind === "none") hideOtherTabNotice();
  updateStorageStatus();
  renderLibraryNotice();
  if (hidden) {
    if (!deferredExternalChange) deferredExternalChange = { recalculate: false, deleted: false, message: "" };
    return;
  }
  if (activeWorkspaceView === "builds") updateStorageStatus();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !deferredExternalChange) return;
  const change = deferredExternalChange;
  deferredExternalChange = null;
  showExternalChange(change);
});
markLoadedStateClean();
