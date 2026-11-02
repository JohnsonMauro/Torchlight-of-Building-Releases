// Where the keywords' explanations sit beside a tooltip while Alt is held (apps/web/src/ui/tooltip/tooltip-place.ts):
// on the tooltip's side away from the pointer, else its other side, else as far that way as the window allows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { besideTooltipLeft } from "../../apps/web/src/ui/tooltip/tooltip-place.ts";

const WIDTH = 300,
  VIEWPORT = 1440;

test("a tooltip right of the pointer has the explanations on its right", () => {
  assert.equal(besideTooltipLeft({ left: 418, right: 768 }, WIDTH, 400, VIEWPORT), 780);
});

test("a tooltip left of the pointer has them on its left", () => {
  assert.equal(besideTooltipLeft({ left: 1000, right: 1350 }, WIDTH, 1368, VIEWPORT), 688);
});

test("when the far side has no room they go on the near side", () => {
  assert.equal(besideTooltipLeft({ left: 1000, right: 1350 }, WIDTH, 980, VIEWPORT), 688);
  assert.equal(besideTooltipLeft({ left: 100, right: 450 }, WIDTH, 470, VIEWPORT), 462);
});

test("with no room on either side they stay inside the window, as far to the far side as it allows", () => {
  assert.equal(besideTooltipLeft({ left: 100, right: 450 }, WIDTH, 80, 600), 290);
  assert.equal(besideTooltipLeft({ left: 100, right: 450 }, WIDTH, 470, 600), 10);
});
