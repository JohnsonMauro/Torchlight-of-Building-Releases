// importSnapshot (src/game-log/game-log-import.js): the supports of a logged skill row.
import { test } from "node:test";
import assert from "node:assert/strict";
import { importSnapshot, loadGameIdMap } from "../../src/game-log/game-log-import.js";

/** One dump whose skill board holds Frost Spike (7054) in Active slot 1 and `support` in its second socket (102). */
const scanWith = (support) => ({
  dumps: [
    {
      id: "d1",
      stamp: "2026-10-19T12:00:00.000Z",
      character: 1,
      accountGroup: 1,
      tree: {
        player: { Level: "90", HeroId: "1001", HeroPurchaseId: "1001" },
        skillLayout: {
          slots: {
            a: { key: "1", value: { skillId: "7054_a" } },
            b: { key: "102", value: { skillId: `${support}_b` } },
          },
        },
        skills: { skills: { a: { Id: "7054_a", Level: "20" }, b: { Id: `${support}_b` } } },
      },
    },
  ],
});

test("Clockwork Core in a support socket is Youga's trait grant, not an unknown support", async () => {
  const { report } = importSnapshot(scanWith("7658"), "d1", await loadGameIdMap());
  assert.deepEqual(report.sections.skills.unresolved, []);
  assert.ok(
    report.sections.skills.imported.some(
      (entry) =>
        entry.item === "Frost Spike support 2: Clockwork Core (granted by the hero trait; the planner adds it itself)",
    ),
  );
});

test("a trait-granted skill in its slot keeps its supports on the granted skill and leaves the slot to the grant", async () => {
  // Youga's I Hold All in My Grasp (Spacetime Dictator) grants Stasis Vault (7355) in Active slot 2; the log shows it there
  // with Preparation (7534) in its first socket (202).
  const scan = {
    dumps: [
      {
        id: "d1",
        stamp: "2026-10-22T21:43:34.525Z",
        character: 1,
        accountGroup: 1,
        tree: {
          player: { Level: "94", HeroId: "8003", HeroPurchaseId: "8003" },
          skillLayout: {
            slots: {
              a: { key: "2", value: { skillId: "7355_a" } },
              b: { key: "201", value: { skillId: "7534_b" } },
            },
          },
          skills: { skills: { a: { Id: "7355_a", Level: "20" }, b: { Id: "7534_b", Level: "20" } } },
        },
      },
    ],
  };
  const { state, report } = importSnapshot(scan, "d1", await loadGameIdMap());
  assert.equal(state.skills.boardSlots.skills[1], "");
  assert.equal(state.skills.supportOrder["trait:Stasis Vault"][0], "Preparation");
  assert.equal(state.skills.supportEnabled["trait:Stasis Vault:Preparation"], true);
  assert.ok(!state.skills.customSetups.some((setup) => setup.name === "Stasis Vault"));
  assert.ok(
    report.sections.skills.imported.some((entry) =>
      entry.item.startsWith("Skill 2: Stasis Vault (granted by the hero trait"),
    ),
  );
});
