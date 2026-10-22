import type { ReactNode } from "react";
import { StrokeIcon } from "../ui/StrokeIcon";
import { useWorkspace } from "../ui/use-workspace";

// The workspace views, as a rail of icons fixed to the page's left edge under the header; hovering a view slides its
// name out beside the rail. A tab is lit (`active`) for its focused view; Build stays lit on every build tab. The
// "view-tab" class and data-view are what the e2e page objects click (and the planner's click handler reads).

interface ViewTabProps {
  view: string;
  label: string;
  icon: ReactNode;
}

const viewTabs: ViewTabProps[] = [
  {
    view: "hero",
    label: "Build",
    icon: (
      <>
        <path d="m13 3 8 8-3 3-8-8z" />
        <path d="m11 8-7 7a2 2 0 0 0 3 3l7-7" />
      </>
    ),
  },
  {
    view: "character",
    label: "Stats",
    icon: (
      <>
        <path d="M3 20h18M5 17v3m5-7v7m5-5v5m5-10v10" />
        <path d="m4 11 5-4 5 3 6-6m-4 0h4v4" />
      </>
    ),
  },
  {
    view: "configuration",
    label: "Config",
    icon: (
      <>
        <path
          d="M10 2h4l.6 2.3 1.8.8 2.1-1.2 2.8 2.8-1.2 2.1.8 1.8L23 11v4l-2.3.6-.8 1.8 1.2 2.1-2.8 2.8-2.1-1.2-1.8.8L14 24h-4l-.6-2.3-1.8-.8-2.1 1.2-2.8-2.8 1.2-2.1-.8-1.8L1 15v-4l2.3-.6.8-1.8-1.2-2.1 2.8-2.8 2.1 1.2 1.8-.8z"
          transform="translate(0 -1) scale(.92) translate(1 1)"
        />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    view: "builds",
    label: "Notes",
    icon: (
      <>
        <path d="M5 3h12v13M8 7h6M8 10h4M5 3v18h11" />
        <path d="m12 17 7-7 2 2-7 7-3 1z" />
      </>
    ),
  },
];

function ViewTab({ view, label, icon }: ViewTabProps) {
  const open = useWorkspace();
  const lit = open.focused ? open.view === view : view === "hero";
  return (
    <button
      className={`view-tab group relative h-16 w-full shrink-0 cursor-pointer border-0 border-l-2 border-transparent bg-transparent hover:bg-raised focus-visible:bg-raised focus-visible:outline-none on:border-l-accent on:bg-accent/10 ${lit ? "active" : ""}`}
      type="button"
      data-view={view}
      aria-label={label}
      title={label}
    >
      <StrokeIcon className="absolute top-1/2 left-1/2 size-6.5 -translate-1/2 stroke-muted transition-transform duration-150 group-hover:scale-112 group-hover:stroke-accent group-focus-visible:scale-112 group-focus-visible:stroke-accent group-on:stroke-accent">
        {icon}
      </StrokeIcon>
      <span className="pointer-events-none absolute top-4 left-14 z-10 -translate-x-1.25 rounded-sm border border-line-strong bg-raised px-3 py-2 text-xs whitespace-nowrap text-text opacity-0 shadow-lg shadow-shadow transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 max-md:hidden">
        {label}
      </span>
    </button>
  );
}

export function ViewRail() {
  return (
    <nav
      className="fixed top-[66px] bottom-0 left-0 z-15 flex w-16 flex-col border-r border-line bg-surface max-sm:top-[108px]"
      aria-label="Builder sections"
    >
      {viewTabs.map((tab) => (
        <ViewTab key={tab.view} {...tab} />
      ))}
    </nav>
  );
}
