// Range inputs show their filled part through the --range-fill custom property.

function updateRangeFill(range) {
  const min = range.min === "" ? 0 : Number(range.min),
    max = range.max === "" ? 100 : Number(range.max),
    value = Number(range.value);
  const percent = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  range.style.setProperty("--range-fill", `${percent}%`);
}
const refreshRangeFills = () => document.querySelectorAll('input[type="range"]').forEach(updateRangeFill);
let rangeFillRefreshPending = false;
export const scheduleRangeFillRefresh = () => {
  if (rangeFillRefreshPending) return;
  rangeFillRefreshPending = true;
  requestAnimationFrame(() => {
    rangeFillRefreshPending = false;
    refreshRangeFills();
  });
};
// Range inputs added to the page, and every input or change, refresh the range fills.
export function installRangeFills() {
  new MutationObserver((mutations) => {
    if (
      mutations.some(({ addedNodes }) =>
        [...addedNodes].some(
          (node) =>
            node.nodeType === 1 &&
            (node.matches?.('input[type="range"]') || node.querySelector?.('input[type="range"]')),
        ),
      )
    )
      scheduleRangeFillRefresh();
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("input", scheduleRangeFillRefresh);
  document.addEventListener("change", scheduleRangeFillRefresh);
}
