import { effectiveGearModifierTexts } from "./engine.js";
import { activeKismetEffects } from "./kismet-effects.js";
import { pactspiritTreesSs13 } from "./data/pacts/pactspirit-trees-ss13.js";
import { orderedPactspiritNodes, pactspiritEffectsAtLevel, pactspiritLevel } from "./pactspirit-levels.js";
import { prismAreaBounds, prismNodeAffixes } from "./prism-crafting.js";

export function calculateCurseLimit({ equipment, talents = [], slates = [], talentState = {}, pactState = {}, setups = [], conditions = {} }) {
  const sources = [];
  const add = (text, source, multiplier = 1) => {
    if (multiplier <= 0) return;
    for (const clause of String(text || "").split(/\n|\||;| · /)) {
      const clean = clause.replace(/^.*:\s*/, "").trim();
      const match = clean.match(/^You can (?:cast|inflict) (\d+) additional Curses?$/i);
      if (match) {
        const value = Math.trunc(Number(match[1]) * multiplier);
        if (value) sources.push({ source, text: clean, value });
      }
    }
  };
  for (const item of equipment?.candidateItems || []) for (const text of effectiveGearModifierTexts(item)) add(text, item.name);
  for (const panel of talents) {
    for (const node of panel.allocatedNodes || []) if (node.rank > 0 && !node.replacedBy) add(node.description, `${panel.name} talent`, node.rank * (node.inverseEffectMultiplier ?? 1));
    for (const core of panel.activeCores || []) add(core.description, core.name);
    const prism = talentState.prismInventory?.find(item => item.id === talentState.installedPrisms?.[panel.name]);
    const coordinate = talentState.installedPrismNodes?.[panel.name];
    if (prism && coordinate && prism.type !== "inverse") {
      const bounds = prismAreaBounds(prism, coordinate);
      const nodes = (panel.allocatedNodes || []).filter(node => {
        const [column, row] = String(node.coordinate).split(",").map(Number);
        return node.rank > 0 && !node.replacedBy && String(node.coordinate) !== coordinate && column >= bounds.left && column < bounds.left + bounds.width && row >= bounds.top && row < bounds.top + bounds.height;
      });
      const count = nodes.filter(node => node.type === "legendary").length;
      const seen = new Set();
      for (const node of nodes) for (const affix of prismNodeAffixes(prism, node.type, node.rank, count)) {
        if (!affix.active) continue;
        if (/^When activating 2 Legendary/.test(affix.effect)) {
          if (seen.has(affix.effect)) continue;
          seen.add(affix.effect);
          add(affix.effect.replace(/^When activating 2 Legendary Medium Talent within the area,\s*/, ""), `${panel.name} · Prism`);
        } else add(affix.effect, `${panel.name} · Prism`, node.rank);
      }
    }
  }
  for (const slate of slates) for (const text of [...(slate.fixed || []), ...(slate.brands || []), ...(slate.copiedTalents || [])]) add(text, slate.name);
  for (const line of activeKismetEffects(pactState)) add(line.text, line.source);
  for (const spirit of pactState.selectedSpirits || []) {
    if (!spirit || pactState.activeSpirits?.[spirit] === false) continue;
    const nodes = orderedPactspiritNodes(pactspiritTreesSs13[spirit]);
    const outer = nodes.findIndex(node => node.ring === "outer");
    if (outer >= 0 && pactState.nativeNodeQuantities?.[`${spirit}:${outer}`] === 1) for (const text of pactspiritEffectsAtLevel(spirit, pactspiritLevel(spirit, pactState.spiritLevels))) add(text, spirit);
  }
  const maximum = 1 + sources.reduce((sum, source) => sum + source.value, 0);
  // Scorch is the default priority; toggling it off allows Entangled Pain instead.
  const candidates = ["Scorch", "Entangled Pain"].filter(name => setups.some(setup => setup.name === name && setup.enabled !== false) && conditions[name === "Scorch" ? "scorch" : "entangledPain"] !== false);
  return { maximum, sources, active: candidates.slice(0, maximum), excluded: candidates.slice(maximum) };
}
