// Guard on a channeled skill grants Barrier. User-confirmed 2026-10-10: in the SS21 Selena build the
// Barrier from Guard is permanent, so it is treated as always available (no uptime factor). The planner
// lists it as an automatic condition in dummyRecount.assumptions (planner.js barrierAssumption).
export function guardBarrierSources(setups = []) {
  return setups
    .filter(
      (setup) =>
        setup.enabled !== false &&
        setup.tags?.includes("Channeled") &&
        setup.supports?.some((support) => support.name === "Guard" && support.enabled !== false),
    )
    .map((setup) => ({
      source: `Guard support · ${setup.name}`,
      trigger: "Every 5 uses of the supported skill",
      available: true,
    }));
}
