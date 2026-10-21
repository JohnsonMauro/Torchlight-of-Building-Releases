import type { ReactNode } from "react";
import { HelpButton } from "./HelpButton";

interface SectionHeadingProps {
  title: string;
  /** The controls help topic for the "?" beside the title (src/app/tooltips/qol-help.js). */
  help?: string;
  /** The figure on the right: a small caption over a large value. */
  total?: { label: string; id: string; value: ReactNode };
}

/** A section's heading strip: the gilded title and its "?", and the section's headline figure on the right. */
export function SectionHeading({ title, help, total }: SectionHeadingProps) {
  return (
    <div className="bg-heading relative flex min-h-[50px] items-center justify-between gap-5 border-b border-[#8b6333] px-4 py-3">
      <h1 className="m-0 flex items-center">
        <span className="text-gilded font-display text-[0.87rem] font-black tracking-[0.07em] uppercase">{title}</span>
        {help ? <HelpButton topic={help} label={title} /> : null}
      </h1>
      {total ? (
        <div className="text-right">
          <span className="block text-xs text-muted uppercase">{total.label}</span>
          <strong id={total.id} className="block text-[2.2rem] leading-tight font-bold text-[#c7def0]">
            {total.value}
          </strong>
        </div>
      ) : null}
      <span aria-hidden="true" className="rule-gold absolute inset-x-[18px] -bottom-px h-px" />
    </div>
  );
}
