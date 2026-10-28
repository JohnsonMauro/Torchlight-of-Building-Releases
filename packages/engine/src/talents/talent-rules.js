export const MAX_TALENT_POINTS = 115;
// The talent points a character has (owner, 2026-10-28): 1 per level from level 3 (100 at level 100), up to 6 from the
// maps' Treasure Troves and up to 9 from the Path of Progression (3 + 1 × 6): 115 in all, 112 at level 97 with both done.
// Below level 3 the level gives none (provisional: the owner's recollection).
export const TREASURE_TROVE_TALENT_POINTS = 6;
export const PATH_OF_PROGRESSION_TALENT_POINTS = 9;
const clampPoints = (value, max) => Math.max(0, Math.min(max, Math.trunc(Number.isFinite(value) ? value : max)));
/** The points the build may spend: { fromLevel, treasureTroves, pathOfProgression, total }. Unset troves and progression count as done. */
export function talentPointBudget(state) {
  const level = Number(state?.hero?.characterLevel);
  const fromLevel = Number.isInteger(level) && level >= 1 ? (level >= 3 ? Math.min(100, level) : 0) : 100;
  const treasureTroves = clampPoints(state?.talents?.treasureTrovePoints, TREASURE_TROVE_TALENT_POINTS);
  const pathOfProgression = clampPoints(state?.talents?.pathOfProgressionPoints, PATH_OF_PROGRESSION_TALENT_POINTS);
  return { fromLevel, treasureTroves, pathOfProgression, total: fromLevel + treasureTroves + pathOfProgression };
}
export const TALENT_THRESHOLDS = [0, 3, 6, 9, 12, 15, 18];

const key = (panel, coordinate) => `${panel}:${Array.isArray(coordinate) ? coordinate.join(",") : coordinate}`;
const rank = (ranks, panel, coordinate) => Number(ranks[key(panel, coordinate)] || 0);

export function talentPointTotals(layouts, ranks) {
  const panels = Object.fromEntries(
    Object.entries(layouts).map(([panel, graph]) => [
      panel,
      graph.nodes.reduce((sum, node) => sum + rank(ranks, panel, node.coordinate), 0),
    ]),
  );
  return { panels, total: Object.values(panels).reduce((sum, value) => sum + value, 0), maximum: MAX_TALENT_POINTS };
}

export function talentPredecessors(graph, coordinate) {
  const [x, y] = coordinate;
  return graph.edges.flatMap(([x1, y1, x2, y2]) => {
    if (x2 === x && y2 === y && x1 < x) return [[x1, y1]];
    if (x1 === x && y1 === y && x2 < x) return [[x2, y2]];
    return [];
  });
}

export function talentSuccessors(graph, coordinate) {
  const [x, y] = coordinate;
  return graph.edges.flatMap(([x1, y1, x2, y2]) => {
    if (x1 === x && y1 === y && x2 > x) return [[x2, y2]];
    if (x2 === x && y2 === y && x1 > x) return [[x1, y1]];
    return [];
  });
}

// A node opens the next one only when it is full (owner, 2026-10-28: in game a 1/1 node after a 1/3 one cannot be taken;
// the 3 points come first).
const filled = (graph, ranks, panel, coordinate) => {
  const node = graph.nodes.find((entry) => entry.coordinate.join(",") === coordinate.join(","));
  return rank(ranks, panel, coordinate) >= (node?.maxRank || 1);
};

const connectedPredecessors = (graph, coordinate, prerequisiteFreeCoordinates) =>
  talentPredecessors(graph, coordinate).filter((before) => !prerequisiteFreeCoordinates?.has(before.join(",")));

export function canAllocateTalent({
  panel,
  node,
  graph,
  layouts,
  ranks,
  prismCoordinate,
  prerequisiteFreeCoordinates,
  maximum = MAX_TALENT_POINTS,
}) {
  if (node.coordinate.join(",") === prismCoordinate)
    return { allowed: false, reason: "Prism replaces this talent node" };
  const totals = talentPointTotals(layouts, ranks);
  const current = rank(ranks, panel, node.coordinate);
  if (current >= node.maxRank) return { allowed: false, reason: "Maximum rank reached" };
  if (totals.total >= maximum) return { allowed: false, reason: `All ${maximum} talent points spent` };
  if (prerequisiteFreeCoordinates?.has(node.coordinate.join(",")))
    return { allowed: true, reason: "Talent in reflected area has no prerequisites" };
  const threshold = TALENT_THRESHOLDS[node.coordinate[0]] || 0;
  if (totals.panels[panel] < threshold) return { allowed: false, reason: `Requires ${threshold} points in ${panel}` };
  const connected = connectedPredecessors(graph, node.coordinate, prerequisiteFreeCoordinates);
  if (
    connected.length &&
    !connected.some((coordinate) => coordinate.join(",") === prismCoordinate || filled(graph, ranks, panel, coordinate))
  )
    return { allowed: false, reason: "Requires the connected talent to the left at full rank" };
  return { allowed: true, reason: "Available" };
}

export function allocateTalentWithPrerequisites({
  panel,
  node,
  graph,
  layouts,
  ranks,
  prismCoordinate,
  prerequisiteFreeCoordinates,
  maximum = MAX_TALENT_POINTS,
}) {
  const nextRanks = { ...ranks };
  const nodeByCoordinate = new Map(graph.nodes.map((entry) => [entry.coordinate.join(","), entry]));
  const added = [];
  const addPoint = (entry) => {
    const rule = canAllocateTalent({
      panel,
      node: entry,
      graph,
      layouts,
      ranks: nextRanks,
      prismCoordinate,
      prerequisiteFreeCoordinates,
      maximum,
    });
    if (!rule.allowed) return rule;
    const entryKey = key(panel, entry.coordinate);
    nextRanks[entryKey] = rank(nextRanks, panel, entry.coordinate) + 1;
    added.push(entryKey);
    return { allowed: true, reason: "Available" };
  };
  const fillRequiredPath = (entry, visiting = new Set()) => {
    const entryKey = entry.coordinate.join(",");
    if (visiting.has(entryKey)) return { allowed: false, reason: "Talent path contains a cycle" };
    if (prerequisiteFreeCoordinates?.has(entryKey)) return { allowed: true, reason: "Reflected area starts this path" };
    const predecessors = connectedPredecessors(graph, entry.coordinate, prerequisiteFreeCoordinates)
      .map((coordinate) => nodeByCoordinate.get(coordinate.join(",")))
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(b.coordinate.join(",") === prismCoordinate) - Number(a.coordinate.join(",") === prismCoordinate) ||
          rank(nextRanks, panel, b.coordinate) - rank(nextRanks, panel, a.coordinate) ||
          Number(prerequisiteFreeCoordinates?.has(b.coordinate.join(","))) -
            Number(prerequisiteFreeCoordinates?.has(a.coordinate.join(","))),
      );
    if (!predecessors.length) return { allowed: true, reason: "Available" };
    const predecessor = predecessors[0];
    if (predecessor.coordinate.join(",") === prismCoordinate)
      return { allowed: true, reason: "Prism connects this path" };
    const nextVisiting = new Set(visiting).add(entryKey);
    const earlier = fillRequiredPath(predecessor, nextVisiting);
    if (!earlier.allowed) return earlier;
    while (rank(nextRanks, panel, predecessor.coordinate) < predecessor.maxRank) {
      const result = addPoint(predecessor);
      if (!result.allowed) return result;
    }
    return { allowed: true, reason: "Available" };
  };
  if (rank(nextRanks, panel, node.coordinate) === 0 && !prerequisiteFreeCoordinates?.has(node.coordinate.join(","))) {
    const path = fillRequiredPath(node);
    if (!path.allowed) return { ...path, ranks, added: [] };
  }
  const result = addPoint(node);
  return result.allowed
    ? { allowed: true, reason: "Allocated", ranks: nextRanks, added }
    : { ...result, ranks, added: [] };
}

export function allocateTalentToMaxWithPrerequisites({
  panel,
  node,
  graph,
  layouts,
  ranks,
  prismCoordinate,
  prerequisiteFreeCoordinates,
  maximum = MAX_TALENT_POINTS,
}) {
  const nodeMax = node.maxRank || (node.effectsPerRank ? 3 : 1);
  let nextRanks = ranks;
  const added = [];
  while (rank(nextRanks, panel, node.coordinate) < nodeMax) {
    const result = allocateTalentWithPrerequisites({
      panel,
      node,
      graph,
      layouts,
      ranks: nextRanks,
      prismCoordinate,
      prerequisiteFreeCoordinates,
      maximum,
    });
    if (!result.allowed) return { allowed: false, reason: result.reason, ranks, added: [] };
    nextRanks = result.ranks;
    added.push(...result.added);
  }
  return { allowed: true, reason: "Allocated to maximum", ranks: nextRanks, added };
}

export function pruneInvalidTalentRanks({
  panel,
  graph,
  layouts,
  ranks,
  prismCoordinate,
  prerequisiteFreeCoordinates,
}) {
  const nextRanks = { ...ranks },
    removed = [];
  let changed = true;
  while (changed) {
    changed = false;
    const points = talentPointTotals(layouts, nextRanks).panels[panel];
    for (const node of graph.nodes) {
      const coordinate = node.coordinate.join(",");
      if (!rank(nextRanks, panel, node.coordinate)) continue;
      const free = prerequisiteFreeCoordinates?.has(coordinate);
      const connected = connectedPredecessors(graph, node.coordinate, prerequisiteFreeCoordinates);
      const invalid =
        coordinate === prismCoordinate ||
        (!free &&
          (points < (TALENT_THRESHOLDS[node.coordinate[0]] || 0) ||
            (connected.length > 0 &&
              !connected.some(
                (before) => before.join(",") === prismCoordinate || filled(graph, nextRanks, panel, before),
              ))));
      if (!invalid) continue;
      nextRanks[key(panel, node.coordinate)] = 0;
      removed.push(key(panel, node.coordinate));
      changed = true;
    }
  }
  return { ranks: nextRanks, removed };
}

export function canRemoveTalent({ panel, node, graph, layouts, ranks, prismCoordinate, prerequisiteFreeCoordinates }) {
  const current = rank(ranks, panel, node.coordinate);
  if (!current) return { allowed: false, reason: "No points allocated" };
  const nextRanks = { ...ranks, [key(panel, node.coordinate)]: current - 1 };
  const totals = talentPointTotals(layouts, nextRanks);
  const gated = graph.nodes.find(
    (candidate) =>
      rank(nextRanks, panel, candidate.coordinate) > 0 &&
      !prerequisiteFreeCoordinates?.has(candidate.coordinate.join(",")) &&
      totals.panels[panel] < (TALENT_THRESHOLDS[candidate.coordinate[0]] || 0),
  );
  if (gated)
    return {
      allowed: false,
      reason: `A later talent still requires ${TALENT_THRESHOLDS[gated.coordinate[0]]} panel points`,
    };
  if (
    current === (node.maxRank || 1) &&
    talentSuccessors(graph, node.coordinate).some(
      (coordinate) =>
        rank(nextRanks, panel, coordinate) > 0 &&
        !prerequisiteFreeCoordinates?.has(coordinate.join(",")) &&
        !connectedPredecessors(graph, coordinate, prerequisiteFreeCoordinates).some(
          (predecessor) => predecessor.join(",") === prismCoordinate || filled(graph, nextRanks, panel, predecessor),
        ),
    )
  )
    return { allowed: false, reason: "A connected talent to the right still depends on this node" };
  return { allowed: true, reason: "Removable" };
}

export function removeTalentWithDependents({
  panel,
  node,
  graph,
  layouts,
  ranks,
  prismCoordinate,
  prerequisiteFreeCoordinates,
}) {
  const current = rank(ranks, panel, node.coordinate);
  if (!current) return { allowed: false, reason: "No points allocated", ranks };
  const nextRanks = { ...ranks, [key(panel, node.coordinate)]: current - 1 };
  const removed = [];
  const clearDependents = (pending) => {
    while (pending.length) {
      const coordinate = pending.shift();
      for (const successor of talentSuccessors(graph, coordinate)) {
        const successorKey = key(panel, successor);
        if (!rank(nextRanks, panel, successor) || prerequisiteFreeCoordinates?.has(successor.join(","))) continue;
        if (
          connectedPredecessors(graph, successor, prerequisiteFreeCoordinates).some(
            (predecessor) => predecessor.join(",") === prismCoordinate || filled(graph, nextRanks, panel, predecessor),
          )
        )
          continue;
        nextRanks[successorKey] = 0;
        removed.push(successorKey);
        pending.push(successor);
      }
    }
  };
  const connected = talentSuccessors(graph, node.coordinate).filter(
    (coordinate) =>
      rank(nextRanks, panel, coordinate) > 0 &&
      !prerequisiteFreeCoordinates?.has(coordinate.join(",")) &&
      !connectedPredecessors(graph, coordinate, prerequisiteFreeCoordinates).some(
        (predecessor) => predecessor.join(",") === prismCoordinate,
      ),
  );
  for (const coordinate of connected) {
    const connectedKey = key(panel, coordinate);
    nextRanks[connectedKey] = 0;
    removed.push(connectedKey);
  }
  clearDependents(connected);
  while (true) {
    const totals = talentPointTotals(layouts, nextRanks);
    const gated = graph.nodes.filter(
      (candidate) =>
        rank(nextRanks, panel, candidate.coordinate) > 0 &&
        !prerequisiteFreeCoordinates?.has(candidate.coordinate.join(",")) &&
        totals.panels[panel] < (TALENT_THRESHOLDS[candidate.coordinate[0]] || 0),
    );
    if (!gated.length) break;
    for (const candidate of gated) {
      const candidateKey = key(panel, candidate.coordinate);
      nextRanks[candidateKey] = 0;
      removed.push(candidateKey);
    }
    clearDependents(gated.map((candidate) => candidate.coordinate));
  }
  return { allowed: true, reason: "Removed", ranks: nextRanks, removed };
}

// A talent's effect text at its allocated rank, with an Inverse Image roll on a reflected node
// (user report 2026-10-13: a reflected 3/3 "+8% Frostbite Effect" Medium Talent under a +80% Medium roll
// reads "+43.2% Frostbite Effect" in game, i.e. 8 × 3 points × 1.8). The calculation already applies
// rank × roll per point (packages/engine/src/candidate-sources.js, packages/engine/src/text/modifier-texts.js); this is the same value as text.
// An unallocated node shows one point's worth. Only the effect values scale: in each " | " clause the signed
// or percentage numbers that do not follow "per", "every" or "up to", both ends of "Adds A - B", or else the
// first number. Durations, intervals and per-unit amounts ("per 12 Strength", "Interval: 0.1s") stay.
const TALENT_NUMBER = /(?<![\w.])([+-]?)(\d+(?:\.\d+)?)(%?)/g;
const formatScaled = (value) => String(Number(value.toFixed(4)));

export function scaleTalentEffectText(text, factor) {
  if (!Number.isFinite(factor) || factor === 1) return String(text ?? "");
  return String(text ?? "")
    .split(" | ")
    .map((clause) => {
      const numbers = [...clause.matchAll(TALENT_NUMBER)];
      if (!numbers.length) return clause;
      const range = /^Adds\s/i.test(clause) ? numbers.slice(0, 2) : [];
      const values = numbers.filter(
        (match) => (match[1] || match[3]) && !/(?:\bper|\bevery|\bup to)\s*$/i.test(clause.slice(0, match.index)),
      );
      const scaled = new Set(range.length ? range : values.length ? values : numbers.slice(0, 1));
      let out = "",
        offset = 0;
      for (const match of numbers) {
        if (!scaled.has(match)) continue;
        out += clause.slice(offset, match.index) + `${match[1]}${formatScaled(Number(match[2]) * factor)}${match[3]}`;
        offset = match.index + match[0].length;
      }
      return out + clause.slice(offset);
    })
    .join(" | ");
}

export function talentEffectText(description, rank, inverseMultiplier = 1) {
  return scaleTalentEffectText(description, Math.max(1, Number(rank) || 0) * inverseMultiplier);
}
