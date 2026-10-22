import type { ReactNode } from "react";

interface CraftColumnProps {
  /**
   * The path (a Breadcrumb; the prism picker's tabs and search) over the content: it stays put, the scrollbar starts
   * under it.
   */
  path?: ReactNode;
  /** The column's own classes (flex-1, a border, its narrow-screen layout). */
  className?: string;
  /** The scrolling content's own classes (its narrow-screen overflow). */
  bodyClassName?: string;
  children: ReactNode;
}

/** A crafter's column (the equipment's and the prism's pickers and forms): its path on top, its content scrolling below. */
export function CraftColumn({ path, className = "", bodyClassName = "", children }: CraftColumnProps) {
  return (
    <section className={`flex min-h-0 flex-col ${className}`}>
      {path ? <div className="shrink-0 px-4 pt-4 pb-3">{path}</div> : null}
      <div
        className={`grid min-h-0 flex-1 content-start gap-3 overflow-auto px-4 pb-4 ${path ? "" : "pt-4"} ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
