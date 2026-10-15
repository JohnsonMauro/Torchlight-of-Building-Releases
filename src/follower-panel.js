import { escapeHtml } from "./html.js";
import { coverageBadge } from "./calculation-coverage.js";
import { combineStatuses, plannerEngines, refineCoverage } from "./line-coverage.js";
import {
  followers, followerRarities, followerById, followerRarityById, followerSelection, followerSkillSlots,
  followerSlotUnlockRarity, eligibleTartarusSkills, tartarusSkillByName, tartarusSkillDisplayName, tartarusKeyword, normalizeFollowerState,
  followerLineStatus, plainFollowerLine, missingFollowerEngine, FOLLOWER_BUFFS, FOLLOWER_MAX_SLOTS, FOLLOWER_RARITY_SCHEME
} from "./follower-model.js";

// The Hero panel's FOLLOWER tab (2026-10-15; design: the orchestrator's brief). The panel header is a HERO | FOLLOWER tab strip
// in the Hero Trait / Trait Path tab style; the FOLLOWER tab shows a card mirroring the hero card (portrait, name, a rarity line
// in rarity colour, "Change Follower" opening a picker styled like the hero picker) and one row per skill slot like the trait
// rows (icon, name, coverage badge; locked slots name the rarity that opens them). A slot opens the skill board's skill picker
// (#skill-selector, src/app.js selectorKind "follower-skill"; followerSkillSelectorView below fills it with the follower's
// Tartarus / Origin Tartarus Skills, 2026-10-15 user request); right-click clears it. Tooltips use the planner tooltip's
// hero-trait layout tinted with the follower's rarity (followerTooltipRarity; the hero-memory rarity colours), and the card
// portrait and the picker cards take the gear-tile rarity tint (follower-tint-<rarity>). The active tab is remembered per build
// in localStorage (UI only).

const KIND_LABEL = { tartarus: "Tartarus Skill", origin: "Origin Tartarus Skill" };
const TAB_STORAGE_KEY = "tli-builder:hero-panel-tab:v1";

/** The remembered Hero panel tab ("hero" | "follower") of a build view; "hero" when none is stored or storage fails. */
export function readHeroPanelTab(buildId) {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(TAB_STORAGE_KEY) || "{}");
    return stored && stored[buildId] === "follower" ? "follower" : "hero";
  } catch { return "hero"; }
}

/** Remembers a build view's Hero panel tab (UI state only; failures are ignored). */
export function writeHeroPanelTab(buildId, tab) {
  try {
    const storage = globalThis.localStorage;
    if (!storage || !buildId) return;
    const stored = JSON.parse(storage.getItem(TAB_STORAGE_KEY) || "{}");
    const next = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    if (tab === "follower") next[buildId] = "follower"; else delete next[buildId];
    storage.setItem(TAB_STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

const rarityClass = (rarity) => `follower-rarity follower-rarity-${escapeHtml(rarity?.id || "rare")}`;
const tintClass = (rarity) => rarity?.id ? ` follower-tint-${escapeHtml(rarity.id)}` : "";
const skillTitle = (skill, rarityId) => `${skill.shortName}${followerRarityById(rarityId)?.skillTier ? ` ${followerRarityById(rarityId).skillTier}` : ""}`;

// ---- Line coverage ---------------------------------------------------------------------------------------------------
// One follower line's badge: the planner's reading (src/follower-model.js resolveFollowerEffects) when the line is equipped,
// else the same rules on the text. A modeled buff in calc is refined by the engine layer (a build without its engine reads
// Inactive); a plain player line reads like the same gear line.
export function followerLineCoverage(text, { skill = null, kind = "skill", planner = null } = {}) {
  const entry = (planner?.follower?.lines || []).find((line) => line.text === text && (line.skill || null) === (skill?.name || null));
  const buff = skill ? FOLLOWER_BUFFS.find((item) => item.skill === skill.name && item.pattern.test(text)) : null;
  if (entry?.toggle) {
    if (!entry.active) return { status: "Inactive", reason: entry.reason };
    // src/planner.js settles a buff the build cannot use (no damage over time, no Spell damage, no Steep Strike hit); a planner
    // that was not settled is checked here the same way.
    const missing = buff ? missingFollowerEngine(buff.engine, planner, plannerEngines(planner)) : "";
    return missing ? { status: "Inactive", reason: `${entry.derivedText}: ${missing}` } : { status: "In calc", reason: `${entry.derivedText}: ${entry.reason}` };
  }
  if (buff) {
    const derived = buff.derive(text.match(buff.pattern));
    return { status: "In calc", reason: `${derived.summary} (best case when equipped; switch: Config tab, best-case assumptions)` };
  }
  const plain = plainFollowerLine(text);
  if (plain) return { status: refineCoverage("Not modeled", plain, planner || undefined), reason: `read as "${plain}" for you` };
  return followerLineStatus(text, kind);
}

const skillCoverage = (skill, planner) => {
  const lines = skill.lines.map((text) => followerLineCoverage(text, { skill, planner }));
  const status = combineStatuses(lines.map((line) => line.status));
  const reasons = [...new Set(lines.filter((line) => line.status !== "In calc" && line.status !== "No DPS effect").map((line) => `${line.status}: ${line.reason}`))];
  return { status, reason: reasons.join("; ") };
};

// ---- Panel ----------------------------------------------------------------------------------------------------------
function cardMarkup(selection, artwork) {
  if (!selection) {
    return `<div class="hero-showcase follower-showcase"><div class="hero-portrait follower-portrait"><span class="hero-avatar-fallback" aria-hidden="true">+</span></div><div class="hero-identity follower-identity"><strong>No follower selected</strong><small class="follower-rarity">Choose a follower</small><button type="button" class="change-hero-button" data-change-follower>Change Follower</button></div></div>`;
  }
  const { follower, rarity } = selection;
  return `<div class="hero-showcase follower-showcase"><div class="hero-portrait follower-portrait${tintClass(rarity)}" data-follower-tooltip="${escapeHtml(follower.id)}">${follower.portrait ? `<img src="${escapeHtml(follower.portrait)}" alt="${escapeHtml(follower.displayName)}">` : `<span class="hero-avatar-fallback" aria-hidden="true">${escapeHtml(follower.name.slice(0, 2).toUpperCase())}</span>`}</div><div class="hero-identity follower-identity" data-follower-tooltip="${escapeHtml(follower.id)}"><strong id="selected-follower-name">${escapeHtml(follower.displayName)}</strong><small class="${rarityClass(rarity)}" id="selected-follower-rarity">${escapeHtml(rarity?.name || "")} · ${escapeHtml(follower.species)}</small><button type="button" class="change-hero-button" data-change-follower>Change Follower</button></div></div>`;
}

// The hidden select a slot's searchable dropdown reads: the empty choice, then the eligible skills by kind; a skill in another
// slot is disabled (each skill once), so the dropdown leaves it out.
function slotRowsMarkup(selection, state, planner, artwork) {
  if (!selection) return `<div class="hero-traits-pending follower-pending"><strong>Select a follower</strong><span>Choose a follower to equip its Tartarus Skills.</span><button type="button" class="button" data-change-follower>Choose Follower</button></div>`;
  const { follower, rarity } = selection;
  const chosen = normalizeFollowerState(state?.followers).skills;
  const rows = Array.from({ length: FOLLOWER_MAX_SLOTS }, (_, index) => {
    const label = `<span class="tier-level"><small>SLOT</small><strong>${index + 1}</strong></span>`;
    if (index >= selection.slots) {
      const unlock = followerSlotUnlockRarity(index);
      return `<div class="follower-skill-slot-wrap"><button type="button" class="hero-tier follower-skill-slot locked" data-follower-skill-slot="${index}" disabled aria-label="Skill slot ${index + 1}: unlocked at ${escapeHtml(unlock?.name || "a higher rarity")}">${label}<span class="follower-skill-art"><b aria-hidden="true">–</b></span><span class="tier-divider"></span><span class="follower-skill-info"><small>Locked</small><strong>Unlocked at ${escapeHtml(unlock?.name || "a higher rarity")}</strong></span></button></div>`;
    }
    const skill = tartarusSkillByName(chosen[index]);
    if (!skill) return `<div class="follower-skill-slot-wrap"><button type="button" class="hero-tier follower-skill-slot empty" data-follower-skill-slot="${index}" aria-label="Choose a Tartarus Skill for slot ${index + 1}">${label}<span class="follower-skill-art"><b aria-hidden="true">+</b></span><span class="tier-divider"></span><span class="follower-skill-info"><small>Empty slot</small><strong>Choose a Tartarus Skill</strong></span></button></div>`;
    const coverage = skillCoverage(skill, planner);
    return `<div class="follower-skill-slot-wrap"><button type="button" class="hero-tier follower-skill-slot filled" data-follower-skill-slot="${index}" data-follower-skill-tooltip="${escapeHtml(skill.name)}" aria-label="${escapeHtml(tartarusSkillDisplayName(skill, rarity?.id))}, slot ${index + 1}; right-click to clear">${label}<span class="follower-skill-art">${artwork(skill.icon, skill.name, "hero-choice-art follower-skill-icon")}</span><span class="tier-divider"></span><span class="follower-skill-info"><small>${escapeHtml(KIND_LABEL[skill.kind] || "Tartarus Skill")}</small><strong>${escapeHtml(skillTitle(skill, rarity?.id))}</strong>${coverageBadge(coverage.status, coverage.reason)}</span></button></div>`;
  });
  return `<div class="hero-trait-tree follower-skill-slots" aria-label="${escapeHtml(follower.displayName)} Tartarus Skills">${rows.join("")}</div>`;
}

/** The FOLLOWER tab's content: the follower card and the skill slot rows. */
export function followerPanelMarkup({ state, planner = null, artwork }) {
  const selection = followerSelection(state);
  return `${cardMarkup(selection, artwork)}${slotRowsMarkup(selection, state, planner, artwork)}`;
}

// ---- Picker ---------------------------------------------------------------------------------------------------------
// One card per follower and rarity (a species follower in each of its rarities, a named follower in Origin), as TLIDB lists
// the Recommendation Letters.
export function followerPickerOptions(query = "") {
  const needle = String(query || "").trim().toLowerCase();
  return followers.flatMap((follower) => follower.rarities.map((rarityId) => ({ follower, rarity: followerRarityById(rarityId) })))
    .filter(({ follower, rarity }) => !needle || `${follower.displayName} ${follower.species} ${follower.title} ${follower.traitName} ${rarity.name}`.toLowerCase().includes(needle));
}

export function followerPickerMarkup(query, state) {
  const current = normalizeFollowerState(state?.followers);
  const options = followerPickerOptions(query);
  if (!options.length) return '<p class="hero-selector-empty">No followers match that search.</p>';
  return options.map(({ follower, rarity }) => {
    const selected = current.followerId === follower.id && current.rarity === rarity.id;
    return `<button type="button" class="hero-selector-card follower-selector-card${tintClass(rarity)} ${selected ? "selected" : ""}" data-select-follower="${escapeHtml(follower.id)}" data-follower-rarity="${escapeHtml(rarity.id)}" data-follower-tooltip="${escapeHtml(follower.id)}" data-follower-tooltip-rarity="${escapeHtml(rarity.id)}" aria-pressed="${selected}">${follower.portrait ? `<img src="${escapeHtml(follower.portrait)}" alt="">` : `<span class="hero-card-fallback" aria-hidden="true">${escapeHtml(follower.name.slice(0, 2).toUpperCase())}</span>`}<strong>${escapeHtml(follower.displayName)}</strong><small class="${rarityClass(rarity)}">${escapeHtml(rarity.name)} · ${followerSkillSlots(follower, rarity.id)} skill slot${followerSkillSlots(follower, rarity.id) === 1 ? "" : "s"}</small></button>`;
  }).join("");
}

/** The state after picking `followerId` at `rarity`: the equipped skills stay where the new follower can use them. */
export function pickFollower(state, followerId, rarity) {
  const follower = followerById(followerId);
  if (!follower) return normalizeFollowerState(state?.followers);
  const previous = Array.isArray(state?.followers?.skills) ? state.followers.skills : [];
  const kept = previous.filter(Boolean);
  return normalizeFollowerState({ followerId, rarity, rarityScheme: FOLLOWER_RARITY_SCHEME, skills: Array.from({ length: followerSkillSlots(follower, rarity) }, (_, index) => kept[index] ?? null) });
}

/** The state with slot `index` set to `name` (null clears it). */
export function setFollowerSkill(state, index, name) {
  const current = normalizeFollowerState(state?.followers);
  const skills = current.skills.map((entry, slot) => slot === index ? (name || null) : entry === name ? null : entry);
  return normalizeFollowerState({ ...current, skills });
}

// ---- Tooltips -------------------------------------------------------------------------------------------------------
const lineMarkup = (text, coverage) => `<p>${escapeHtml(text)} ${coverageBadge(coverage.status, coverage.reason)}</p>`;

/** Tooltip (hero-trait layout) of an equipped Tartarus Skill. */
export function followerSkillTooltipHtml(skillName, { state, planner = null } = {}) {
  const skill = tartarusSkillByName(skillName);
  if (!skill) return null;
  const selection = followerSelection(state);
  const rarityId = selection?.rarity?.id || null;
  const coverage = skillCoverage(skill, planner);
  const tier = followerRarityById(rarityId)?.skillTier;
  const slots = tier ? skill.tiers?.[tier] : null;
  const supportText = !slots || !(slots.randomSupports + slots.optionalSupports) ? "no support affix slots" : `${slots.randomSupports} random support affix slot${slots.randomSupports === 1 ? "" : "s"}${slots.optionalSupports ? ` and ${slots.optionalSupports} that may be empty` : ""} (not modeled)`;
  const timing = [skill.castTime ? `Cast ${skill.castTime} s` : "", skill.cooldown ? `Cooldown ${skill.cooldown} s` : "", skill.level ? `Lv. ${skill.level}` : ""].filter(Boolean).join(" · ");
  const keywords = (skill.keywords || []).map((name) => tartarusKeyword(name)).filter(Boolean);
  return `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(tartarusSkillDisplayName(skill, rarityId))}</strong>${coverageBadge(coverage.status, coverage.reason)}<em>${escapeHtml(KIND_LABEL[skill.kind] || "Tartarus Skill")}</em></div><small class="hero-trait-unlock">${escapeHtml([skill.tags.join(", "), `Followers: ${skill.species.join(", ")}`].filter(Boolean).join(" · "))}</small><div class="hero-trait-effects">${skill.lines.map((text) => lineMarkup(text, followerLineCoverage(text, { skill, planner }))).join("")}${keywords.map((keyword) => `<p class="follower-keyword"><b>${escapeHtml(keyword.name)}:</b> ${escapeHtml(keyword.text.join(" "))}</p>`).join("")}</div><small class="hero-trait-source">${escapeHtml([timing, tier ? `Tier ${tier}: ${supportText}` : ""].filter(Boolean).join(" · "))}</small>`;
}

/** Tooltip (hero-trait layout) of the follower card: rarity, slots, flavor and a named follower's trait. */
export function followerTooltipHtml(followerId, { state, planner = null, rarityId = null } = {}) {
  const selection = followerSelection(state);
  const follower = selection?.follower?.id === followerId ? selection.follower : followerById(followerId);
  if (!follower) return null;
  const rarity = rarityId && follower.rarities.includes(rarityId) ? followerRarityById(rarityId) : selection?.follower?.id === follower.id ? selection.rarity : followerRarityById(follower.rarities[follower.rarities.length - 1]);
  const lines = follower.traitLines.map((text) => ({ text, coverage: followerLineCoverage(text, { kind: "trait", planner }) }));
  const badge = lines.length ? coverageBadge(combineStatuses(lines.map((line) => line.coverage.status))) : "";
  const slots = followerSkillSlots(follower, rarity?.id);
  return `<div class="hero-trait-tooltip-head"><strong>${escapeHtml(follower.displayName)}</strong>${badge}<em>${escapeHtml(rarity?.name || "")}</em></div><small class="hero-trait-unlock">${escapeHtml(`${follower.species} follower · ${slots} skill slot${slots === 1 ? "" : "s"} · Tartarus Skills tier ${rarity?.skillTier || ""}`)}</small><div class="hero-trait-effects">${follower.traitName ? `<p><b>${escapeHtml(follower.traitName)}</b></p>${lines.map((line) => lineMarkup(line.text, line.coverage)).join("")}` : ""}<p class="follower-flavor">${escapeHtml(follower.flavor)}</p></div><small class="hero-trait-source">${escapeHtml(`Skill slots by rarity: ${followerRarities.map((item) => `${item.name} ${item.skillSlots}`).join(", ")} (the game's rarities; TLIDB's Normal and Magic letters are Rare, its Rare letters Epic, its Ultimate Origin).`)}</small>`;
}

// Tier → rarity background for a Tartarus Skill (2026-10-15 user request): tier I Rare, II Epic, III Legendary (the tier the
// follower's rarity rolls); an Origin Tartarus Skill takes the Origin (Ultimate) background.
const TIER_RARITY = { I: "rare", II: "epic", III: "legendary" };
/** The rarity background of a Tartarus Skill on a follower of `followerRarityId` ("origin" for Origin Tartarus Skills). */
export function tartarusSkillRarity(skill, followerRarityId) {
  if (!skill) return null;
  if (skill.kind === "origin") return "origin";
  return TIER_RARITY[followerRarityById(followerRarityId)?.skillTier] || null;
}

/**
 * The rarity id a follower tooltip is tinted with (data-rarity on the planner tooltip, src/styles.css .follower-tooltip): the
 * explicit one (a picker card's), else the build's follower's when it is that follower, else the follower's highest. A skill
 * tooltip (no followerId) takes the build's follower's rarity.
 */
export function followerTooltipRarity({ state, followerId = null, rarityId = null, skillName = null } = {}) {
  const selection = followerSelection(state);
  if (skillName) return tartarusSkillRarity(tartarusSkillByName(skillName), selection?.rarity?.id);
  if (!followerId) return selection?.rarity?.id || null;
  const follower = followerById(followerId);
  if (!follower) return null;
  if (rarityId && follower.rarities.includes(rarityId)) return rarityId;
  return selection?.follower?.id === follower.id ? selection.rarity?.id || null : follower.rarities[follower.rarities.length - 1];
}

// ---- Skill picker ---------------------------------------------------------------------------------------------------
// A follower skill slot opens the skill board's picker dialog (#skill-selector) with this content: the same result rows
// (.selector-result: icon, name, tag chips), grouped Tartarus Skills / Origin Tartarus Skills, and the same detail card
// (.selector-preview: icon, name, level, tags, stat rows with the cast time and cooldown, the skill text, the TLIDB link). A
// skill equipped in another slot reads "Installed" with Confirm disabled, as the skill picker does.

/** The skills the build's follower can equip, in picker order (Tartarus, then Origin Tartarus). */
export function followerSelectorEntries(state) {
  const selection = followerSelection(state);
  if (!selection) return [];
  const eligible = eligibleTartarusSkills(selection.follower);
  return ["tartarus", "origin"].flatMap((kind) => eligible.filter((skill) => skill.kind === kind));
}

/** The picker's starting choice for a slot: the equipped skill's index, or -1. */
export function followerSelectorInitialIndex(state, slot) {
  const current = normalizeFollowerState(state?.followers).skills[slot] || null;
  return current ? followerSelectorEntries(state).findIndex((skill) => skill.name === current) : -1;
}

/**
 * The picker's content for follower slot `slot`: { title, resultsHtml, detailHtml, confirmDisabled, confirmLabel }.
 * @param {{ state: object, slot: number, query?: string, choiceIndex?: number, artwork: Function }} p
 */
export function followerSkillSelectorView({ state, slot, query = "", choiceIndex = -1, artwork }) {
  const selection = followerSelection(state);
  const entries = followerSelectorEntries(state);
  const chosen = normalizeFollowerState(state?.followers).skills;
  const others = new Set(chosen.filter((name, index) => name && index !== slot));
  const needle = String(query || "").trim().toLowerCase();
  const matches = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => !needle || [entry.name, entry.shortName, ...entry.tags, ...entry.lines].join(" ").toLowerCase().includes(needle));
  const row = ({ entry, index }) => `<button type="button" class="selector-result${tintClass({ id: tartarusSkillRarity(entry, selection?.rarity?.id) })} ${index === choiceIndex ? "selected" : ""}" data-selector-choice="${index}">${artwork(entry.icon, entry.name, "support-art")}<span><strong>${escapeHtml(entry.name)}</strong><small>${entry.tags.map((tag) => `<em>${escapeHtml(tag)}</em>`).join("")}</small></span></button>`;
  const resultsHtml = ["tartarus", "origin"].map((kind) => {
    const group = matches.filter(({ entry }) => entry.kind === kind);
    return group.length ? `<h4 class="follower-selector-group">${escapeHtml(KIND_LABEL[kind])}s</h4>${group.map(row).join("")}` : "";
  }).join("") || `<p class="muted">No matching entries.</p>`;
  const title = `Select ${selection ? `${selection.follower.displayName} skill ${slot + 1}` : "Tartarus Skill"} · ${entries.length} available`;
  const entry = entries[choiceIndex];
  if (!entry) return { title, resultsHtml, detailHtml: `<p>Select a skill to configure</p>`, confirmDisabled: true, confirmLabel: "Confirm" };
  const installed = others.has(entry.name);
  const tier = selection?.rarity?.skillTier || "";
  const facts = [["Tier", tier ? `${tier} (${selection.rarity.name})` : ""], ["Cast Time", Number.isFinite(entry.castTime) ? `${entry.castTime} s` : ""], ["Cooldown", Number.isFinite(entry.cooldown) ? `${entry.cooldown} s` : ""]].filter(([, value]) => value);
  const effects = entry.lines.filter((line) => !/:$/.test(line));
  const detailHtml = `<article class="selector-preview${tintClass({ id: tartarusSkillRarity(entry, selection?.rarity?.id) })}"><div class="selector-preview-head">${artwork(entry.icon, entry.name, "support-art")}<h3>${escapeHtml(tartarusSkillDisplayName(entry, selection?.rarity?.id))}</h3><small>Lv. ${escapeHtml(String(entry.level ?? 20))}</small><div class="selector-tags">${entry.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div></div><div class="selector-facts"><div class="selector-stat-rows">${facts.map(([label, value]) => `<div><span>${escapeHtml(label)}:</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><div class="selector-effect-list"><h4>${escapeHtml(entry.name)}:</h4>${effects.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>${entry.source ? `<a href="${escapeHtml(entry.source)}" target="_blank" rel="noreferrer">Open TLIDB source</a>` : ""}${installed ? `<p class="comparison-warning">${escapeHtml(entry.shortName || entry.name)} is already in another skill slot.</p>` : ""}</div></article>`;
  return { title, resultsHtml, detailHtml, confirmDisabled: installed, confirmLabel: installed ? "Installed" : "Confirm" };
}
