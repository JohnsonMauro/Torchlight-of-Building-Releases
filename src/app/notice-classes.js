// The look of the notices the planner writes as HTML (Tailwind utility lists; Tailwind scans src/): the slate-blue
// strip over a page (safe mode, a build that could not be calculated, builds that could not be loaded), its buttons, and
// the toast-styled notice that stays (another tab changed the open build). Kept apart from the strings that use them
// so a utility never sits right before a `${` (Tailwind would not see it there).

/** The notice's strip: a slate-blue band with a steel edge on the left. */
export const NOTICE_STRIP_CLASS =
  "border-l-3 border-[#718ca6] bg-[rgb(38_54_72/0.6)] px-3.75 py-2.75 text-[0.87rem] text-[#c5d5e3]";

/** A notice at the top of a page or view: text on the left, its buttons on the right. */
export const NOTICE_CLASS = `col-span-full mb-4.5 flex flex-wrap items-center justify-between gap-3 ${NOTICE_STRIP_CLASS}`;

/** The notice's row of buttons. */
export const NOTICE_ACTIONS_CLASS = "flex flex-wrap gap-2";

/** The notice's main button: ember gradient, dark uppercase lettering, chamfered corners. */
export const NOTICE_BUTTON_CLASS =
  "cursor-pointer border border-[#f08a38] bg-[linear-gradient(180deg,#ffa24e,#e87527)] px-3.5 py-2.25 text-[0.68rem] font-bold tracking-[0.06em] text-[#1a0d05] uppercase shadow-[inset_0_1px_rgb(255_255_255/0.28),0_4px_12px_rgb(184_72_18/0.18)] clip-chamfer-7 hover:brightness-108 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** The notice's other buttons: dark slate, ember on hover. */
export const NOTICE_SECONDARY_BUTTON_CLASS =
  "cursor-pointer rounded-[3px] border border-[#465363] bg-[linear-gradient(180deg,#1a2330,#10161e)] px-3.5 py-2.25 text-[0.68rem] font-bold tracking-[0.06em] text-[#dce3e9] uppercase hover:border-[#bd6a32] hover:text-[#ffab61] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** A toast-styled notice that stays on screen (the toast itself is apps/web/src/shell/Toast.tsx). */
export const STICKY_TOAST_CLASS =
  "fixed bottom-16 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-1.5 bg-[#f3973d] px-4 py-2.5 font-[750] text-[#17100b]";

/** A text-like button inside that notice (Reload it, ×). */
export const STICKY_TOAST_BUTTON_CLASS = "cursor-pointer underline";
