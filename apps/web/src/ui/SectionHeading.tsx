import type { ReactNode } from "react";
import { HelpButton } from "./HelpButton";
import { sectionTitleClass } from "./section-card";

interface SectionHeadingProps {
  title: string;
  /** The controls help topic for the "?" beside the title (apps/web/src/ui/help-topics.ts). */
  help?: string;
  /** The figure on the right: a small caption over a large value. */
  total?: { label: string; id: string; value: ReactNode };
  /** The section's buttons on the right (the Gear section's Craft). */
  actions?: ReactNode;
}

/** A section's heading strip: the accent title and its "?", and the section's headline figure or buttons on the right. */
export function SectionHeading({ title, help, total, actions }: SectionHeadingProps) {
  return (
    <div className="flex min-h-[50px] items-center justify-between gap-5 border-b border-line bg-raised px-4 py-3">
      <h1 className="m-0 flex items-center">
        <span className={sectionTitleClass}>{title}</span>
        {help ? <HelpButton topic={help} label={title} /> : null}
      </h1>
      {total ? (
        <div className="text-right">
          <span className="block text-xs text-muted uppercase">{total.label}</span>
          <strong id={total.id} className="block text-4xl leading-tight font-bold text-text">
            {total.value}
          </strong>
        </div>
      ) : null}
      {actions ? <div className="flex flex-wrap justify-end gap-1.75">{actions}</div> : null}
    </div>
  );
}
