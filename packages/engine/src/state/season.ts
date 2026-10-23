// The game's seasons the planner knows, oldest first. The engine and its data follow the last one: a build records the
// season its contents follow and the one it was made in, and a build from an earlier season is carried forward when it is
// read (packages/engine/src/state/season-migration.js). A new season is a new entry here and a step in season-migration.js.

export interface Season {
  /** Stored in builds ("ss14"); the data's names carry no season (the package's major version does). */
  id: string;
  /** As the page prints it ("SS14"). */
  label: string;
  /** The season's name ("" when the planner never had it). */
  name: string;
}

export const seasons: readonly Season[] = [
  { id: "ss13", label: "SS13", name: "" },
  { id: "ss14", label: "SS14", name: "Tartarus" },
];

/** The season the engine calculates. */
export const currentSeason: Season = seasons[seasons.length - 1];

/** The season stored as `id`, or null for one the planner does not know (a build from a newer version of it). */
export const seasonById = (id: string): Season | null => seasons.find((season) => season.id === id) ?? null;

/** "SS13" for "ss13"; an unknown id as it is, upper-cased. */
export const seasonLabel = (id: string): string => seasonById(id)?.label ?? id.toUpperCase();
