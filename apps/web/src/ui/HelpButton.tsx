/**
 * The small round "?" beside a section title: hovering or focusing it shows that section's controls (the planner's
 * tooltips find it by data-qol-help, src/app/tooltips/planner-tooltips.js).
 */
export function HelpButton({ topic, label, className }: { topic: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      className={`ml-2 inline-grid size-[18px] shrink-0 cursor-help place-items-center rounded-full border border-ember/55 bg-[rgb(16_20_27/0.65)] p-0 align-middle font-serif text-[0.68rem] leading-none font-bold tracking-normal text-ember normal-case [-webkit-text-fill-color:currentColor] [filter:none] hover:border-ember hover:text-[#ffd29a] hover:shadow-[0_0_6px_rgb(240_154_66/0.35)] focus-visible:border-ember focus-visible:text-[#ffd29a] focus-visible:shadow-[0_0_6px_rgb(240_154_66/0.35)] focus-visible:outline-none ${className ?? ""}`}
      data-qol-help={topic}
      aria-label={`${label} controls`}
    >
      ?
    </button>
  );
}
