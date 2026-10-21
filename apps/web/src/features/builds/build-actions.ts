import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";

/** New Build: an empty build opens, and the hero selector with it, since a build starts from its hero. */
export function newBuildWithHero() {
  plannerCommands().newBuild();
  plannerCommands().openHeroSelector();
}
