// What a build tab warns about for the open build: the "!" BuildTabs shows beside a tab's "?" (apps/web/src/ui). Pure: it
// reads the library entry it is given.
import type { LibraryBuild } from "../storage/build-library.ts";

export const FOLLOWER_NOT_IN_LOG =
  "Imported from the game log, which does not record your active follower: choose it here to count it.";

/** The open build's notices by tab view ("follower"); none for a build made by hand or one already set. */
export function buildTabNotices(
  build: Pick<LibraryBuild, "origin" | "state"> | null | undefined,
): Record<string, string> {
  const notices: Record<string, string> = {};
  const followers = (build?.state as { followers?: { followerId?: string | null } } | undefined)?.followers;
  if (build?.origin === "game-log" && !followers?.followerId) notices.follower = FOLLOWER_NOT_IN_LOG;
  return notices;
}
