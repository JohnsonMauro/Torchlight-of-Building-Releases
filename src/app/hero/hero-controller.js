// The HERO tab and its dialogs (hero, scent, Special Ammo), the HERO / FOLLOWER switch and follower edits.
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../../data/catalogs/tlidb-ss13.js";
import { heroById } from "../../data/heroes/hero-catalog-ss13.js";
import { carinoSpecialAmmoOptions } from "../../engine/heroes/carino-special-ammo.js";
import { switchHeroLoadout } from "../../engine/heroes/hero-loadouts.js";
import { heroTraitTree, heroTreeRules, heroTreeSelections } from "../../engine/heroes/hero-trait-tree.js";
import { carinoAmmoSelectorView, sageScentSelectorView } from "../bridge/hero-dialogs-view-model.ts";
import { heroTraitsView } from "../bridge/hero-traits-view-model.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { renderConfiguration } from "../configuration/configuration-controller.js";
import { readHeroPanelTab } from "./follower-panel.js";
import { escapeHtml } from "../html.js";
import { $, activeBuildViewId, showToast } from "../planner/page.js";
import { currentEditedSetups, persistPlannerState, plannerState, renderCandidateViews } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";

let heroSelectorSession = 0; // the hero selector's openings (apps/web/src/shell/dialogs/HeroSelectorDialog.tsx)
let activeHeroDetailTab = "traits";
let sageScentSelectorKind = "elixir";
let sageScentSelectorSession = 0; // its openings (apps/web/src/shell/dialogs/SageScentSelectorDialog.tsx)
let activeCarinoAmmoSlot = 0;
let carinoAmmoSelectorSession = 0; // its openings (apps/web/src/shell/dialogs/CarinoAmmoSelectorDialog.tsx)
export const heroCommands = {
  // HERO tab (apps/web/src/features/hero).
  setHeroDetailTab: (tab) => {
    activeHeroDetailTab = tab;
    renderHeroTraitTree();
  },
  openHeroSelector,
  selectHero,
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
  removeHeroTraitSupport,
};
export const heroViewSources = {
  // The HERO tab's data (src/app/bridge/hero-traits-view-model.ts).
  heroTraits: () => heroTraitsView(plannerState.hero, activeHeroDetailTab),
  // The HERO tab's scent and Special Ammo selectors (src/app/bridge/hero-dialogs-view-model.ts).
  sageScentSelector: () => ({
    session: sageScentSelectorSession,
    ...sageScentSelectorView(sageScentSelectorKind),
  }),
  carinoAmmoSelector: () => ({
    session: carinoAmmoSelectorSession,
    ...carinoAmmoSelectorView(
      activeCarinoAmmoSlot,
      carinoProjectileSupportOptions(),
      plannerState.hero.carinoSpecialAmmoSupports || [],
      plannerState.hero.selectedTraits["carino-ranger-of-glory:level75"] === "Well Prepared",
    ),
  }),
  // The hero selector's data (apps/web/src/shell/dialogs/HeroSelectorDialog.tsx).
  heroSelector: () => ({
    session: heroSelectorSession,
    selectedHeroId: plannerState.hero.selectedHeroId,
  }),
};

const carinoProjectileSupportOptions = () => {
  const installed = currentEditedSetups()
    .flatMap((setup) => setup.supports || [])
    .map((support) => support.name);
  const wellPrepared = plannerState.hero.selectedTraits["carino-ranger-of-glory:level75"] === "Well Prepared";
  return carinoSpecialAmmoOptions(tlidbSupportCatalogSs13, tlidbSkillCatalogSs13, installed, wellPrepared);
};

export function heroTraitSupportOptions() {
  return tlidbSupportCatalogSs13.filter(
    (support) => !support.passiveOnly && ["regular", "magnificent", "noble", "activation"].includes(support.category),
  );
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
export function renderHeroTraitTree() {
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
  ui.activeHeroTraitSupportId = "";
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
function removeHeroTraitSupport(heroId) {
  const name = plannerState.hero.heroTraitSupports?.[heroId];
  delete plannerState.hero.heroTraitSupports[heroId];
  delete plannerState.hero.heroTraitSupportLevels[heroId];
  delete plannerState.hero.heroTraitSupportConfigs[heroId];
  persistPlannerState();
  renderHeroTraitTree();
  showToast(`${escapeHtml(name || "Trait support")} removed`);
}
export function renderHeroPanel() {
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
export function commitFollower(next, message) {
  plannerState.followers = next;
  persistPlannerState();
  renderHeroPanel();
  renderConfiguration();
  if (message) showToast(message);
}
