// The planner tooltip element: where it sits, and hiding it.
import { $ } from "../planner/page.js";

let tooltipAnchorX = 0,
  tooltipAnchorY = 0;
export let tooltipAnchorElement = null;
export function positionPlannerTooltip(x, y) {
  tooltipAnchorX = x;
  tooltipAnchorY = y;
  const tooltip = $("#planner-tooltip");
  const left = Math.min(window.innerWidth - 370, x + 18);
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - 12, y + 18);
  tooltip.style.left = Math.max(10, left) + "px";
  tooltip.style.top = Math.max(10, top) + "px";
}
let tooltipPositionFrame = 0;
let pendingTooltipX = 0,
  pendingTooltipY = 0;
export function scheduleTooltipPosition(x, y) {
  pendingTooltipX = x;
  pendingTooltipY = y;
  if (tooltipPositionFrame) return;
  tooltipPositionFrame = requestAnimationFrame(() => {
    tooltipPositionFrame = 0;
    if (tooltipAnchorElement) positionPlannerTooltip(pendingTooltipX, pendingTooltipY);
  });
}
let damageSourceTooltipHideTimer;
export function hidePlannerTooltip() {
  clearTimeout(damageSourceTooltipHideTimer);
  tooltipAnchorElement = null;
  $("#planner-tooltip").classList.remove("visible");
  $("#planner-tooltip").setAttribute("aria-hidden", "true");
}
// A damage source's tooltip stays a moment after the pointer leaves the source, so the pointer can reach it.
export function hidePlannerTooltipSoon() {
  damageSourceTooltipHideTimer = setTimeout(hidePlannerTooltip, 180);
}
export function cancelTooltipHide() {
  clearTimeout(damageSourceTooltipHideTimer);
}
export function setTooltipAnchor(element) {
  tooltipAnchorElement = element;
}
export function setRevivalAltDetails(visible) {
  document.body.classList.toggle("revival-alt-held", visible);
  if ($("#planner-tooltip").classList.contains("visible"))
    requestAnimationFrame(() => positionPlannerTooltip(tooltipAnchorX, tooltipAnchorY));
}
