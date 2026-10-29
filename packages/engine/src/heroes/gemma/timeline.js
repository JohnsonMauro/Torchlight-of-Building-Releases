// Gemma's timed traits (hero trait audit batch B3, 2026-10-19): the horizon and the step series packages/engine/src/combat/timed-effects.js
// reads for the 5 s / 20 s windows and the recount (Frostfire Rampage, Cold Pulse, Purgatory).

export const HORIZON_SECONDS = 120;
const round = (value) => Math.round(value * 10000) / 10000;

/** Piecewise-constant steps for a level function (midpoint of each step), from 0 to the horizon. */
export function stepsOf(levelAt, edges, horizon = HORIZON_SECONDS, step = 0.25) {
  const times = new Set([0]);
  for (const edge of edges) if (edge > 0 && edge < horizon) times.add(round(edge));
  for (let t = step; t < horizon; t += step) times.add(round(t));
  const sorted = [...times].sort((a, b) => a - b);
  const points = [];
  for (let index = 0; index < sorted.length; index++) {
    const next = sorted[index + 1] ?? horizon;
    const level = round(levelAt((sorted[index] + next) / 2));
    if (!points.length || points[points.length - 1][1] !== level) points.push([sorted[index], level]);
  }
  return points;
}
