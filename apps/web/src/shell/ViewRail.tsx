import type { ReactNode } from "react";
import { StrokeIcon } from "../ui/StrokeIcon";

// The workspace views, as a rail of icons fixed to the page's left edge under the header; hovering a view slides its
// name out beside the rail. The tabs keep the "view-tab" class and data-view: src/app/planner/workspace.js marks the
// active one, and the e2e page objects click them by it.

interface ViewTabProps {
  view: string;
  label: string;
  icon: ReactNode;
}

const viewTabs: ViewTabProps[] = [
  {
    view: "talents",
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
  return (
    <button
      className={`view-tab group relative h-16 w-full shrink-0 cursor-pointer border-0 border-l-2 border-transparent bg-transparent text-dim hover:bg-[linear-gradient(90deg,rgb(190_131_58/0.2),rgb(190_131_58/0.025)_82%,transparent)] focus-visible:bg-[linear-gradient(90deg,rgb(190_131_58/0.2),rgb(190_131_58/0.025)_82%,transparent)] focus-visible:outline-none on:border-l-[#d9a34e] on:bg-[linear-gradient(90deg,rgb(216_162_72/0.2),rgb(216_162_72/0.04)_75%,transparent)] on:text-[#ff9b45] on:shadow-[inset_-1px_0_#303945] ${view === "talents" ? "active" : ""}`}
      type="button"
      data-view={view}
      aria-label={label}
      title={label}
    >
      <StrokeIcon className="absolute top-[19px] left-1/2 size-[26px] -translate-x-1/2 stroke-[#b6a17e] transition-transform duration-150 group-hover:scale-112 group-hover:stroke-gold group-hover:drop-shadow-[0_0_5px_rgb(249_202_101/0.38)] group-focus-visible:scale-112 group-focus-visible:stroke-gold group-on:stroke-gold group-on:drop-shadow-[0_0_5px_rgb(249_202_101/0.38)]">
        {icon}
      </StrokeIcon>
      <span className="pointer-events-none absolute top-[15px] left-14 z-10 -translate-x-[5px] border border-[#96703d] bg-[linear-gradient(180deg,#332b22,#171d24)] px-3 py-2 text-[0.72rem] whitespace-nowrap text-[#f9d593] opacity-0 transition duration-150 group-hover:translate-x-0 group-hover:opacity-100 max-md:hidden">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-2.5 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#695338,transparent)]"
      />
    </button>
  );
}

export function ViewRail() {
  return (
    <nav
      className="fixed top-[66px] bottom-0 left-0 z-[6] flex w-16 flex-col border-r border-[#59462d] bg-[linear-gradient(180deg,#1d2227,#101720_55%,#0b1017)] shadow-[6px_0_20px_rgb(0_0_0/0.2)] max-sm:top-[108px]"
      aria-label="Builder sections"
    >
      {viewTabs.map((tab) => (
        <ViewTab key={tab.view} {...tab} />
      ))}
    </nav>
  );
}
