import type { ReactNode } from "react";
import { StrokeIcon } from "./StrokeIcon";

/**
 * A crafter's section folded by its heading (open at first), the equipment's and the prism's; `summary` beside the
 * heading says what it holds, cut to the column (a long one must not widen the column it sits in).
 */
export function CraftSection({
  heading,
  summary,
  open = true,
  children,
}: {
  heading: string;
  summary?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group/section min-w-0 border-t border-line pt-3" data-craft-section="">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold [&::-webkit-details-marker]:hidden">
        <StrokeIcon className="size-3.5 text-muted transition-transform group-open/section:rotate-90">
          <polyline points="9 6 15 12 9 18" />
        </StrokeIcon>
        <h3 className="shrink-0">{heading}</h3>
        {summary ? <span className="min-w-0 truncate text-xs font-normal text-muted">{summary}</span> : null}
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}
