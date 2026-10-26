import type { ReactNode } from "react";
import { StrokeIcon } from "./StrokeIcon";

// The button laid over the picture: it darkens on hover or keyboard focus.
const overlay =
  "absolute inset-0 cursor-pointer border-0 bg-transparent transition-colors hover:bg-overlay focus-visible:bg-overlay focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";
// Its swap badge, in the corner: always shown (no hover on touch), larger while hovered.
const badge =
  "absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full border border-line-strong bg-surface text-accent transition-transform group-hover/portrait:scale-125";

/**
 * A portrait that is also its Change control (the hero at the head of the character column, the follower card): a
 * button laid over the picture, so the picture stays an image to assistive tech. `className` sizes and frames it.
 */
export function ChangePortrait({
  id,
  className,
  label,
  onChange,
  children,
}: {
  id?: string;
  className: string;
  label: string;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <div id={id} className={`group/portrait relative shrink-0 overflow-hidden ${className}`}>
      {children}
      <button type="button" className={overlay} aria-label={label} title={label} onClick={onChange}>
        <span className={badge}>
          <StrokeIcon className="size-3">
            <path d="M4 8h13l-3-3M20 16H7l3 3" />
          </StrokeIcon>
        </span>
      </button>
    </div>
  );
}
