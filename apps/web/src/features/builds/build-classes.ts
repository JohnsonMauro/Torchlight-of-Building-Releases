// The Builds view's shared class lists: the empty states (the library's "No saved builds", the details' "Nothing
// selected") and the build summary that both a library card and the details' "Currently open" strip show; and the
// open build's name in the build strip (ActiveBuildTab).

/** An empty state: a dashed round glyph, a title, a line of text and (in the library) a button. */
export const BUILD_EMPTY = "grid min-h-62 content-center justify-items-center p-7 text-center";

export const BUILD_EMPTY_ICON =
  "grid size-14 place-items-center rounded-full border border-dashed border-line-strong text-3xl text-accent-strong";

export const BUILD_EMPTY_TITLE = "mt-4 mb-1 text-lg/[normal] font-bold text-text";

export const BUILD_EMPTY_TEXT = "mb-4 max-w-80 text-xs/normal text-muted";

/** A build's hero portrait (or the ✦ stand-in when the build has no hero). */
export const BUILD_HERO_ART = "size-11.5 shrink-0 rounded-md border border-line-strong bg-sunken object-cover";

/** The ✦ stand-in's glyph, added to BUILD_HERO_ART. */
export const BUILD_HERO_GLYPH = "grid place-items-center text-2xl/[normal] text-accent-strong";

/** The summary beside the portrait: a small caps caption, the build's name and a muted line. */
export const BUILD_SUMMARY = "grid min-w-0 gap-0.5 text-xs text-muted";
export const BUILD_SUMMARY_CAPTION = "truncate text-[10px] font-bold tracking-wider text-accent uppercase";
export const BUILD_SUMMARY_NAME = "truncate text-sm/[normal] font-bold text-text";
export const BUILD_SUMMARY_META = "truncate text-xs text-muted not-italic";

/** The build strip's block with the open build's name (`loadout-tab` is the tests' hook). */
export const ACTIVE_BUILD_TAB =
  "loadout-tab min-w-[275px] self-center py-2 pr-3.5 max-sm:min-w-0 max-sm:flex-[0_1_275px]";
/** The name (or its field) and the pencil that renames it. */
export const ACTIVE_BUILD_ROW = "mt-0.5 flex min-w-0 items-center gap-1.5";
/** A borderless icon button (the build name's pencil, a log folder's copy): muted, accent on hover or focus. */
export const ICON_BUTTON =
  "grid size-6 shrink-0 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-muted hover:bg-raised hover:text-accent focus-visible:bg-raised focus-visible:text-accent focus-visible:outline-none";
export const ACTIVE_BUILD_CAPTION = "block text-[10px] font-bold tracking-widest text-muted uppercase";
export const ACTIVE_BUILD_NAME = "block max-w-[245px] truncate text-sm font-bold tracking-wider text-accent uppercase";
/** The name's field while renaming: the name's type over a bottom line. */
export const ACTIVE_BUILD_RENAME =
  "block w-full max-w-[245px] border-0 border-b border-line-strong bg-transparent p-0 text-sm font-bold tracking-wider text-accent uppercase caret-accent outline-none focus:border-accent";
