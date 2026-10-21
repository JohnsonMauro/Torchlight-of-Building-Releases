// The Builds view's shared class lists: the empty states (the library's "No saved builds", the details' "Nothing
// selected") and the build summary that both a library card and the details' "Currently open" strip show.

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
