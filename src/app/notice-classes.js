// The look of the notices the planner writes as HTML (Tailwind utility lists; Tailwind scans src/): the info
// strip over a page (safe mode, a build that could not be calculated, builds that could not be loaded), its buttons, and
// the toast-styled notice that stays (another tab changed the open build). Kept apart from the strings that use them
// so a utility never sits right before a `${` (Tailwind would not see it there).

/** The notice's strip: an info-tinted band with an info edge on the left. */
export const NOTICE_STRIP_CLASS = "border-l-3 border-info bg-info/10 px-4 py-3 text-sm text-text";

/** A notice at the top of a page or view: text on the left, its buttons on the right. */
export const NOTICE_CLASS = `col-span-full mb-4 flex flex-wrap items-center justify-between gap-3 ${NOTICE_STRIP_CLASS}`;

/** The notice's row of buttons. */
export const NOTICE_ACTIONS_CLASS = "flex flex-wrap gap-2";

/** The notice's main button: the accent fill. */
export const NOTICE_BUTTON_CLASS = "btn-primary px-3.5 py-2 text-xs font-bold tracking-wide uppercase";

/** The notice's other buttons: neutral. */
export const NOTICE_SECONDARY_BUTTON_CLASS = "btn px-3.5 py-2 text-xs font-bold tracking-wide uppercase";

/** A toast-styled notice that stays on screen (the toast itself is apps/web/src/shell/Toast.tsx). */
export const STICKY_TOAST_CLASS =
  "fixed bottom-16 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-1.5 rounded-sm bg-accent-strong px-4 py-2.5 font-bold text-on-accent shadow-lg shadow-shadow";

/** A text-like button inside that notice (Reload it, ×). */
export const STICKY_TOAST_BUTTON_CLASS = "cursor-pointer underline";
