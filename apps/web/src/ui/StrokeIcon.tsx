import type { ReactNode } from "react";

/** A line icon on a 24-unit grid, stroked in the current color (the header actions and the view rail). */
export function StrokeIcon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={`shrink-0 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round] ${className ?? ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
