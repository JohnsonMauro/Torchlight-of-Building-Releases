import { normalizePercentageText } from "../engine/index.ts";
export function escapeHtml(value) {
  return normalizePercentageText(value).replace(
    /[&<>"']/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
}
