// fillTemplate (src/game-log/game-log-import.js): how an affix's logged rolls fill its catalog template.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillTemplate } from "../../src/game-log/game-log-import.js";

const CAST_SPEED = "+(26–36)% Cast Speed\n+(26–36)% Minion Cast Speed";

test("lines that share a range take the one roll the game logs for them", () => {
  // Headless Cleric Wand, suffix 110320101: the game shows +29% on both lines and logs DynArgs [29].
  assert.deepEqual(fillTemplate(CAST_SPEED, [29]), { ok: true, text: "+29% Cast Speed\n+29% Minion Cast Speed" });
  assert.deepEqual(fillTemplate("+(18–24)% Attack and Cast Speed\n+(18–24)% Minion Attack and Cast Speed", [19]), {
    ok: true,
    text: "+19% Attack and Cast Speed\n+19% Minion Attack and Cast Speed",
  });
});

test("a roll per range still fills each line with its own", () => {
  assert.deepEqual(fillTemplate(CAST_SPEED, [29, 31]), { ok: true, text: "+29% Cast Speed\n+31% Minion Cast Speed" });
  assert.deepEqual(fillTemplate("+(14–18)% Armor\n+(78–110) Max Life", [100, 16]), {
    ok: true,
    text: "+16% Armor\n+100 Max Life",
  });
});

test("different ranges still need a roll each", () => {
  assert.deepEqual(fillTemplate("+(14–18)% Armor\n+(78–110) Max Life", [16]), {
    ok: false,
    reason: "2 rolled values expected, 1 logged",
  });
});

test("a shared roll outside the range is kept and flagged", () => {
  assert.deepEqual(fillTemplate(CAST_SPEED, [40]), {
    ok: true,
    text: "+40% Cast Speed\n+40% Minion Cast Speed",
    note: "roll outside the catalog range",
  });
});
