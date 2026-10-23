import { recountSourceShares } from "./dummy-recount-panel.js";
import { skillHitPathModel } from "./skill-hit-path.js";
import { minionPathModel } from "./minion-path.js";
import { ailmentPathModel, combinedPathModel, damagePathOptions, reapingPathModel } from "./damage-path-views.js";

// Damage path page (Character → Damage path): the build's damage paths as tabs (grouped by skill when
// more than one skill deals damage). The spell hit and Minion models live in skill-hit-path.js and minion-path.js, the
// ailment, Reaping and combined models in damage-path-views.js; this picks the model for each tab.
// Presentation only: every figure is the planner's; nothing is recomputed here.

/** Item / slate / skill names, so ledger lines named after an item land in the right group. */
export function sourceNames(planner) {
  const names = (list, pick) => new Set((list || []).map(pick).filter(Boolean));
  return {
    gear: names(planner?.equipment?.allItems, (item) => item?.name || item?.displayName || item?.base),
    slates: names(planner?.resolvedSlates, (item) => item?.name),
    skills: names([...(planner?.activation?.setups || []), ...(planner?.damageSources || [])], (item) => item?.name),
    pacts: names([...(planner?.state?.pacts?.selectedSpirits || [])], (name) => name),
  };
}

/** The recount's per-source DPS over its fixed 10 s span, keyed by timeline source key. */
function recountByKey(planner) {
  const shares = recountSourceShares(planner?.dummyRecount);
  const byKey = new Map(shares.map((item) => [item.key, item]));
  const reapingDps = shares.filter((item) => /^reap:/.test(item.key)).reduce((sum, item) => sum + item.dps, 0);
  const total = shares.reduce((sum, item) => sum + item.dps, 0);
  return {
    shares,
    byKey,
    reapingDps: shares.some((item) => /^reap:/.test(item.key)) ? reapingDps : null,
    total: shares.length ? total : null,
  };
}

// The "hit" tab of a build with no modeled hit skill and no Minion: it says so and points at the paths it has.
function unmodeledHitPathModel(planner) {
  const main = planner.mainSkill?.name;
  return {
    key: "hit",
    title: main ? `${main} hits` : "Spell hits",
    subtitle: "not modeled",
    ariaLabel: "Spell hits",
    final: { label: "Hit DPS", raw: 0, unit: "DPS" },
    stages: [],
    empty: true,
    intro: main
      ? `${main} has no hit model yet. Its damage over time, Reaping and combined windows have their own paths above.`
      : "No skill in this build has a hit model yet.",
  };
}

/** Every path the build has, in option order, with its model and the tab group (skill) it belongs to. */
export function damagePathModels(planner, { format }) {
  const recount = recountByKey(planner);
  const mainName = planner.mainSkill?.name || "Build";
  const dotSkillName = (key) => {
    const dot = planner.skillDots?.find((item) => item.key === key);
    return (
      planner.damageSources?.find((source) => source.setupKey && source.setupKey === dot?.setupKey)?.name ||
      dot?.name ||
      mainName
    );
  };
  return damagePathOptions(planner).map((option) => {
    if (option.value === "hit") return { ...option, group: mainName, model: unmodeledHitPathModel(planner) };
    if (option.value === "reaping")
      return {
        ...option,
        group: "Build",
        model: reapingPathModel(planner.damagePaths.twentySeconds, { format, recountDps: recount.reapingDps }),
      };
    if (option.value === "combined")
      return {
        ...option,
        group: "Build",
        model: combinedPathModel(planner.damagePaths, {
          format,
          recountTotalDps: recount.total,
          recountShares: recount.shares,
          illOmen: planner.illOmen,
        }),
      };
    if (option.value.startsWith("hit:")) {
      // Generic spell hit (packages/engine/src/skills/skill-hit-model.js / src/app/stats/skill-hit-path.js), grouped under its own skill.
      const hit = (planner.skillHits || []).find((item) => `hit:${item.setupKey || item.name}` === option.value);
      return {
        ...option,
        group: hit?.name || mainName,
        model: skillHitPathModel(hit, { format, recountDps: recount.byKey.get(hit?.key)?.dps ?? null }),
      };
    }
    if (option.value.startsWith("minion:")) {
      // Minion (packages/engine/src/minions/minion-damage-model.js / src/app/stats/minion-path.js), grouped under its summon skill.
      const minion = (planner.minions || []).find((item) => `minion:${item.minionKey}` === option.value);
      return {
        ...option,
        group: minion?.summon || mainName,
        model: minionPathModel(minion, { format, recountDps: recount.byKey.get(minion?.key)?.dps ?? null }),
      };
    }
    const key = option.value.slice("ailment:".length);
    const ailment = planner.ailments?.[key];
    const skillDot = ailment?.skillDot;
    return {
      ...option,
      group: skillDot ? dotSkillName(key) : mainName,
      model: ailmentPathModel(ailment, {
        format,
        recountDps:
          recount.byKey.get(key)?.dps ?? recount.byKey.get(`skill:${key.replace(/^skill:/, "")}`)?.dps ?? null,
      }),
    };
  });
}
