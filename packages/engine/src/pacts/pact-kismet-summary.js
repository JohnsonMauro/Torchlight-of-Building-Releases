import { kismetCatalog } from "../../data/pacts/kismet-catalog.js";
import { kismetAffixesWithRolls } from "./kismet-crafting.js";
import { boostedKismetAffixText, microFateEffectScale } from "./kismet-effects.js";
import { fateExtraSlots, fateSlotBonuses } from "./fate-slot-unlocks.js";
import { orderedPactspiritNodes } from "./pactspirit-levels.js";
import { pactspiritTrees } from "../../data/pacts/pactspirit-trees.js";

export function equippedKismetSummary(state = {}) {
  const activeNames = state.selectedSpirits?.filter(Boolean);
  const activeUnlocks = Object.fromEntries(
    (activeNames || [])
      .filter((name) => {
        const index = orderedPactspiritNodes(pactspiritTrees[name]).findIndex((node) => node.ring === "destiny");
        return index >= 0 && state.nativeNodeQuantities?.[`${name}:${index}`] === 1;
      })
      .map((name) => [name, state.fateUnlocks?.[name]]),
  );
  const bonuses = fateSlotBonuses(activeNames, activeUnlocks);
  const activeExtraKeys = new Set(
    (activeNames || []).flatMap((name) => fateExtraSlots(name, activeUnlocks[name]).map((slot) => slot.key)),
  );
  const equipped = Object.entries(state.kismetSlots || {})
    .filter(
      ([key]) =>
        (!activeNames || activeNames.some((name) => key.startsWith(`${name}:`))) &&
        !activeNames?.some((name) => key === `${name}:10`) &&
        (key.includes(":extra:") ? activeExtraKeys.has(key) : state.nativeNodeQuantities?.[key] === 1),
    )
    .map(([key, slot]) => ({
      key,
      entry: kismetCatalog.find((item) => item.name === slot.name),
      rolls: slot.rolls,
    }))
    .filter(({ entry }) => entry);
  const stats = (kind) =>
    equipped
      .filter(({ entry }) => entry.kind === kind)
      .map(({ key, entry, rolls }) => {
        const boost = microFateEffectScale(state, key);
        return {
          label: entry.name.replace(/^(?:Micro Fate|Medium Fate|Kismet|Dual Kismet):\s*/, ""),
          value: kismetAffixesWithRolls(entry, rolls)
            .map((text) => boostedKismetAffixText(text, boost))
            .join(" · "),
        };
      });
  const microStats = stats("micro"),
    mediumStats = stats("medium");
  return {
    microCount: microStats.length,
    microMax: 9 + bonuses.micro,
    mediumCount: mediumStats.length,
    mediumMax: 4 + bonuses.medium,
    microStats,
    mediumStats,
  };
}
