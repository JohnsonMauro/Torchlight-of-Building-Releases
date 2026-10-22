// FilterColumn's classes: the column (a wrapping row on top under 900px) and its buttons, a picked one picked in code
// (a utility may not spell a state word the e2e tests read). Its parent's grid gives it 11.5rem.
export const FILTER_COLUMN =
  "grid min-h-0 content-start gap-1 overflow-auto border-r border-line p-3 max-[900px]:col-span-full max-[900px]:flex max-[900px]:max-h-29 max-[900px]:flex-wrap max-[900px]:border-r-0 max-[900px]:border-b";
const FILTER_OPTION_BASE =
  "flex cursor-pointer items-center justify-between gap-2.5 rounded border px-2.5 py-1.25 text-left text-sm off:cursor-default off:opacity-40";
export const FILTER_OPTION = `${FILTER_OPTION_BASE} border-transparent text-muted enabled:hover:border-line enabled:hover:text-text`;
export const FILTER_OPTION_PICKED = `${FILTER_OPTION_BASE} border-accent bg-accent/15 text-accent`;
