// What a build carried into a new season keeps (packages/engine/src/state/season-migration.js): each pass below removes
// the build's references to what the current season's data no longer has, lists each removal and counts the talent
// points it gives back. Only references by name or id are checked; texts copied into the build (an item's rolled lines, a
// support's text) are each season step's work. A build of the current season goes through untouched
// (tests/unit/season-migration.test.js runs every golden build through it).
import { allProfessionTalentCatalogue } from "../../data/talents/all-profession-trees.generated.js";
import { legendaryGear } from "../../data/gear/legendary-gear.generated.js";
import { tlidbSkillCatalog, tlidbSupportCatalog } from "../../data/catalogs/tlidb.js";
import { heroCatalog } from "../../data/heroes/hero-catalog.js";
import { allHeroTraits } from "../../data/heroes/all-hero-traits.generated.js";
import { pactspiritCatalog } from "../../data/pacts/pactspirit-catalog.js";
import { kismetCatalog } from "../../data/pacts/kismet-catalog.js";
import { inverseImageReflectedCoordinates } from "../talents/prism-crafting.js";
import { activeTalentTreeLayouts } from "../talents/talent-layouts.js";
import { pruneInvalidTalentRanks } from "../talents/talent-rules.js";

const names = (entries) => new Set(entries.map((entry) => entry.name));
const legendaryNames = names(legendaryGear),
  skillNames = names(tlidbSkillCatalog),
  supportNames = names(tlidbSupportCatalog),
  pactspiritNames = names(pactspiritCatalog),
  kismetNames = names(kismetCatalog),
  heroIds = new Set(heroCatalog.map((hero) => hero.id));
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const withoutKeys = (map = {}, drop) => Object.fromEntries(Object.entries(map).filter(([key]) => !drop(key)));

// Talent ranks on a tree or node that no longer exists (or above the node's max rank: the extra points go back), core
// talents a tree no longer offers, a prism on a node that no longer exists.
function talentPass(state, change, trees) {
  const nodeOf = (tree, coordinate) => trees[tree]?.nodes.find((node) => node.coordinate.join(",") === coordinate);
  const prismType = (id) => (state.talents?.prismInventory || []).find((item) => item.id === id)?.type;
  const talentRanks = {};
  for (const [key, rank] of Object.entries(state.talentRanks || {})) {
    const at = key.lastIndexOf(":");
    const [tree, coordinate] = [key.slice(0, at), key.slice(at + 1)];
    // An installed Inverse Image keeps ranks on its mirrored positions, which are not nodes of the tree: its tree's
    // ranks are checked only for the tree itself.
    const mirrored = prismType(state.talents?.installedPrisms?.[tree]) === "inverse" && trees[tree];
    const node = nodeOf(tree, coordinate);
    if (!node && !mirrored) {
      if (rank > 0) change.remove(`Talent ${tree} ${coordinate}`, rank);
      continue;
    }
    const kept = node ? Math.min(rank, node.maxRank) : rank;
    if (kept < rank) change.remove(`Talent ${tree} ${coordinate}: ${plural(rank - kept, "rank")}`, rank - kept);
    talentRanks[key] = kept;
  }
  const coreSelections = {};
  for (const [key, core] of Object.entries(state.talents?.coreSelections || {})) {
    const tree = key.slice(0, key.lastIndexOf(":"));
    if (!core || trees[tree]?.coreTalents.some((talent) => talent.name === core)) coreSelections[key] = core;
    else change.remove(`Core talent ${core} (${tree})`);
  }
  const installedPrisms = { ...(state.talents?.installedPrisms || {}) },
    installedPrismNodes = { ...(state.talents?.installedPrismNodes || {}) };
  for (const [tree, coordinate] of Object.entries(installedPrismNodes))
    if (!nodeOf(tree, coordinate)) {
      change.remove(`Prism on ${tree} ${coordinate} (back in the prism inventory)`);
      delete installedPrisms[tree];
      delete installedPrismNodes[tree];
    }
  return {
    ...state,
    talentRanks,
    ...(state.talents ? { talents: { ...state.talents, coreSelections, installedPrisms, installedPrismNodes } } : {}),
  };
}

// Ranks whose prerequisites went with a removal (a node earlier on their path, the points a column needs), as the talent
// tree prunes them after an edit.
function prerequisitePass(state, change) {
  const talents = state.talents,
    layouts = activeTalentTreeLayouts(talents);
  let ranks = { ...(state.talentRanks || {}) };
  const pruned = new Set();
  const trees = new Set(Object.keys(ranks).map((key) => key.slice(0, key.lastIndexOf(":"))));
  for (const panel of trees) {
    if (!layouts[panel]) continue;
    const prism = (talents.prismInventory || []).find((item) => item.id === talents.installedPrisms?.[panel]),
      prismCoordinate = talents.installedPrismNodes?.[panel];
    const before = ranks;
    const result = pruneInvalidTalentRanks({
      panel,
      graph: layouts[panel],
      layouts,
      ranks,
      prismCoordinate,
      prerequisiteFreeCoordinates: inverseImageReflectedCoordinates(prism, prismCoordinate),
    });
    ranks = result.ranks;
    for (const key of result.removed) pruned.add(key);
    for (const key of result.removed)
      change.remove(
        `Talent ${panel} ${key.slice(key.lastIndexOf(":") + 1)} (its prerequisites are gone)`,
        Number(before[key]) || 0,
      );
  }
  return { ...state, talentRanks: withoutKeys(ranks, (key) => pruned.has(key)) };
}

// Legendaries the current catalog no longer has, equipped or in the inventory; other items keep their bases between
// seasons.
function gearPass(state, change) {
  const missing = (item) => item?.rarity === "legendary" && !legendaryNames.has(item.name);
  const equipmentOverrides = {},
    disabledEquipmentSlots = [...(state.disabledEquipmentSlots || [])];
  for (const [slot, item] of Object.entries(state.equipmentOverrides || {})) {
    if (!missing(item)) {
      equipmentOverrides[slot] = item;
      continue;
    }
    change.remove(`${item.name} (${slot})`);
    if (!disabledEquipmentSlots.includes(slot)) disabledEquipmentSlots.push(slot);
  }
  const equipped = new Set(Object.values(state.equipmentOverrides || {}).map((item) => item?.sourceInventoryId));
  const equipmentInventory = (state.equipmentInventory || []).filter((item) => {
    if (!missing(item)) return true;
    // An equipped copy was listed above with its slot.
    if (!equipped.has(item.id)) change.remove(`${item.name} (inventory)`);
    return false;
  });
  return { ...state, disabledEquipmentSlots, equipmentOverrides, equipmentInventory };
}

// A hero the game no longer has (the default hero takes its place), traits the hero no longer offers, loadouts kept for a
// hero that is gone.
function heroPass(state, change) {
  if (!state.hero) return state;
  const hero = { ...state.hero };
  if (hero.selectedHeroId && !heroIds.has(hero.selectedHeroId)) {
    change.remove(`Hero ${hero.selectedHeroId} (the default hero takes its place)`);
    delete hero.selectedHeroId;
    delete hero.selectedTraits;
  } else if (hero.selectedHeroId) {
    const traits = names(allHeroTraits[hero.selectedHeroId]?.traits || []);
    hero.selectedTraits = withoutKeys(hero.selectedTraits, (level) => {
      const trait = hero.selectedTraits[level];
      if (!trait || traits.has(trait)) return false;
      change.remove(`Hero trait ${trait}`);
      return true;
    });
  }
  if (hero.heroLoadouts)
    hero.heroLoadouts = withoutKeys(hero.heroLoadouts, (id) => {
      if (heroIds.has(id)) return false;
      change.remove(`Loadout of hero ${id}`);
      return true;
    });
  return { ...state, hero };
}

// Skills the game no longer has (their board slot empties, their supports go with them) and supports it no longer has
// (their slot empties).
function skillPass(state, change) {
  if (!state.skills) return state;
  const skills = state.skills;
  const gone = new Map(
    (skills.customSetups || [])
      .filter((setup) => !skillNames.has(setup.name))
      .map((setup) => [setup.instanceId, setup.name]),
  );
  for (const name of gone.values()) change.remove(`Skill ${name}`);
  const skillOf = (id) => (skills.customSetups || []).find((setup) => setup.instanceId === id)?.name || id;
  const supportOrder = {};
  for (const [id, supports] of Object.entries(skills.supportOrder || {})) {
    if (gone.has(id)) continue;
    supportOrder[id] = supports.map((name) => {
      if (!name || supportNames.has(name)) return name;
      change.remove(`Support ${name} (${skillOf(id)})`);
      return "";
    });
  }
  const dropGone = (key) => gone.has(key);
  const emptyGone = (slots) => (Array.isArray(slots) ? slots.map((key) => (gone.has(key) ? "" : key)) : slots);
  return {
    ...state,
    skills: {
      ...skills,
      customSetups: (skills.customSetups || []).filter((setup) => !gone.has(setup.instanceId)),
      ...(skills.boardSlots
        ? {
            boardSlots: {
              ...skills.boardSlots,
              skills: emptyGone(skills.boardSlots.skills),
              auras: emptyGone(skills.boardSlots.auras),
            },
          }
        : {}),
      ...(Array.isArray(skills.setupOrder) ? { setupOrder: skills.setupOrder.filter((key) => !gone.has(key)) } : {}),
      supportOrder,
      ...(skills.setupEnabled ? { setupEnabled: withoutKeys(skills.setupEnabled, dropGone) } : {}),
      ...(skills.skillLevels ? { skillLevels: withoutKeys(skills.skillLevels, dropGone) } : {}),
    },
  };
}

// Pactspirits the game no longer has (their slot empties, their levels and nodes go) and Kismets it no longer has.
function pactPass(state, change) {
  if (!state.pacts) return state;
  const pacts = state.pacts;
  const gone = new Set((pacts.selectedSpirits || []).filter((name) => name && !pactspiritNames.has(name)));
  for (const name of gone) change.remove(`Pactspirit ${name}`);
  const ofGone = (key) => gone.has(key) || gone.has(key.slice(0, key.lastIndexOf(":")));
  const kismetSlots = withoutKeys(pacts.kismetSlots, (slot) => {
    const name = pacts.kismetSlots[slot]?.name;
    if (!name || kismetNames.has(name)) return false;
    change.remove(`Kismet ${name}`);
    return true;
  });
  return {
    ...state,
    pacts: {
      ...pacts,
      ...(pacts.selectedSpirits
        ? { selectedSpirits: pacts.selectedSpirits.map((name) => (gone.has(name) ? "" : name)) }
        : {}),
      ...(pacts.activeSpirits ? { activeSpirits: withoutKeys(pacts.activeSpirits, ofGone) } : {}),
      ...(pacts.spiritLevels ? { spiritLevels: withoutKeys(pacts.spiritLevels, ofGone) } : {}),
      ...(pacts.nativeNodeQuantities ? { nativeNodeQuantities: withoutKeys(pacts.nativeNodeQuantities, ofGone) } : {}),
      kismetSlots,
    },
  };
}

/** The build without what the current season lacks: { state, removed (one line each), talentPointsReturned }. */
export function removeIncompatible(state, trees = allProfessionTalentCatalogue) {
  const removed = [];
  let talentPointsReturned = 0;
  const change = {
    remove(line, points = 0) {
      removed.push(line);
      talentPointsReturned += points;
    },
  };
  let next = talentPass(state, change, trees);
  next = prerequisitePass(next, change);
  next = gearPass(next, change);
  next = heroPass(next, change);
  next = skillPass(next, change);
  next = pactPass(next, change);
  return { state: next, removed, talentPointsReturned };
}
