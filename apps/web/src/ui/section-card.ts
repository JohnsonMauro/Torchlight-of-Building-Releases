/**
 * The frame of a Build view section (Skills, Gear, Pactspirits): a panel. `app-view` is how
 * src/app/planner/workspace.js finds the views to show and hide; the grid placement is the caller's.
 */
/**
 * Where a build tab's section sits: right of the character column (CharacterColumn, apps/web/src/shell/AppShell.tsx),
 * under it on narrow screens. Each tab shows one section, so they all share the cell.
 */
export const buildSectionPlace = "col-start-2 row-start-1 max-[900px]:col-start-1 max-[900px]:row-start-2";

export const sectionCardClass = "app-view panel relative min-w-0 scroll-mt-[82px]";

/** The type of a build tab's label (Hero Trait, Skills, Gear…) and of a dialog's title; the colour is the caller's. */
export const sectionTitleClass = "text-base font-bold tracking-wider uppercase";
