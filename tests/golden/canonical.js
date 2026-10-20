// Canonical form of a planner result for the golden master: key order, Map/Set, functions and non-finite numbers are
// normalised so two results compare equal exactly when their values are equal.
import { createHash } from "node:crypto";

export function canonicalValue(value) {
  if (typeof value === "function") return "[function]";
  if (typeof value === "number" && !Number.isFinite(value)) return `[number ${value}]`;
  if (typeof value === "bigint") return `[bigint ${value}]`;
  if (value === undefined) return "[undefined]";
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Map) return { "[Map]": [...value].map(([key, entry]) => [canonicalValue(key), canonicalValue(entry)]) };
  if (value instanceof Set) return { "[Set]": [...value].map(canonicalValue) };
  if (Array.isArray(value)) return value.map(canonicalValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

export const canonicalJson = (value) => JSON.stringify(canonicalValue(value));
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** Headline figures kept readable in expected.json, so a hash change shows at a glance what moved. */
export function resultSummary(result) {
  const recount = result?.dummyRecount || {};
  return {
    mainSkill: result?.mainSkill?.name ?? null,
    dps5s: recount.fiveSeconds?.dps ?? null,
    dps20s: recount.twentySeconds?.dps ?? null,
    dpsSteady: recount.steady?.dps ?? null,
    warnings: Array.isArray(result?.warnings) ? result.warnings.length : null
  };
}

/** Paths where two canonical values differ (depth-first, capped). */
export function differingPaths(left, right, path = "$", out = [], limit = 40) {
  if (out.length >= limit) return out;
  if (Object.is(left, right)) return out;
  const leftObject = left !== null && typeof left === "object";
  const rightObject = right !== null && typeof right === "object";
  if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
    out.push({ path, before: preview(left), after: preview(right) });
    return out;
  }
  const keys = Array.isArray(left)
    ? Array.from({ length: Math.max(left.length, right.length) }, (_, index) => index)
    : [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) differingPaths(left[key], right[key], Array.isArray(left) ? `${path}[${key}]` : `${path}.${key}`, out, limit);
  return out;
}

function preview(value) {
  const text = JSON.stringify(value);
  return text === undefined ? "(missing)" : text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
