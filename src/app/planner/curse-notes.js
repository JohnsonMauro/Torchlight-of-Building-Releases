// Curse limit notes: which skill bar curses and triggered curse lines the calculation left out, and why.
import { curseSlotSummary } from "../../engine/index.ts";
import { equippedSlotForInventoryItem } from "../gear/gear-items.js";
import { currentPlanner } from "./session.js";

// Curse limit (user-confirmed 2026-10-19: slots go in skill bar order, then gear, then pacts): the skill bar curses and the
// triggered curse lines not applied (past the limit, or a duplicate of a curse already applied: user decision 2026-10-19),
// for the red outline and the "Not applied" note. Each triggered entry carries its own reason.
export function curseLimitState() {
  try {
    return curseSlotSummary(currentPlanner());
  } catch {
    return null;
  }
}
export function curseSkillLeftOut(name) {
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
export function curseLineLeftOutReason(text, item = null) {
  const key = curseLineKey(text);
  if (!key) return "";
  const hit = curseLinesLeftOut().find((curse) => curseOnItem(curse, item) && key.includes(curseLineKey(curse.text)));
  return hit ? hit.reason || curseLimitState()?.reason || "" : "";
}
export function curseItemOffReason(item) {
  if (!item) return "";
  const hit = curseLinesLeftOut().find((curse) => curseOnItem(curse, item));
  return hit ? hit.reason || curseLimitState()?.reason || "curse limit reached" : "";
}
