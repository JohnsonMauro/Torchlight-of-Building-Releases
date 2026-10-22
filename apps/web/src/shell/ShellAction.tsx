import type { ReactNode } from "react";
import { StrokeIcon } from "../ui/StrokeIcon";

export interface ShellActionProps {
  id?: string;
  label: string;
  title?: string;
  icon: ReactNode;
  danger?: boolean;
  onClick?: () => void;
  /** A workspace view it opens through the planner's click handler (data-view). */
  view?: string;
  /** Shows the icon alone at every width; the label stays its accessible name. */
  iconOnly?: boolean;
}

/** An action button of the page frame (the header's, the build strip's): icon and label, the label hidden below lg. */
export function ShellAction({ id, label, title, icon, danger, onClick, view, iconOnly = false }: ShellActionProps) {
  return (
    <button
      id={id}
      className={`${danger ? "btn-danger" : "btn"} h-9 px-3 text-xs font-semibold uppercase`}
      type="button"
      title={title}
      data-view={view}
      onClick={onClick}
    >
      <StrokeIcon className="size-4">{icon}</StrokeIcon>
      <span className={iconOnly ? "sr-only" : "max-lg:sr-only"}>{label}</span>
    </button>
  );
}
