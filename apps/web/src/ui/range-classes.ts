// The one slider look of the page (RangeInput, and the sliders that stand alone: a corrosion roll, a memory line's
// tiers). Its accent fill follows --range-fill (RangeInput sets it; src/app/planner/range-fill.js refreshes it on every
// input), the knob is a ring on the surface.
const THUMB =
  "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-surface " +
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-surface";
const TRACK =
  "h-2 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export const RANGE_FIELD = `${TRACK} ${THUMB} bg-[linear-gradient(to_right,var(--color-accent)_var(--range-fill,0%),var(--color-sunken)_var(--range-fill,0%))]`;
/** A range of negative values: the accent runs from the left end to the roll's place (--roll-fill). */
export const RANGE_FIELD_NEGATIVE = `${TRACK} ${THUMB} bg-[linear-gradient(to_right,var(--color-accent)_0_var(--roll-fill,0%),var(--color-sunken)_var(--roll-fill,0%)_100%)]`;
/** The number field after a slider. */
export const RANGE_NUMBER = "field h-7.5 w-full min-w-0 px-1 text-center text-sm font-bold tabular-nums";
