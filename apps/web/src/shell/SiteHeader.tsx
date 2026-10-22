import { toggleTheme } from "../ui/theme";
import { ShellAction } from "./ShellAction";

// The page header: the planner's name (a click goes back to the Workspace, through the planner's data-view handler,
// without reloading the page) and the theme switch, over a bottom line. The open build's state and actions sit
// in the build strip under it (LoadoutStrip), the views (Build, Stats, Config, and back to the Workspace) in the rail beside the page
// (ViewRail), which starts under the header, so the header keeps a fixed height of 66px. `site-header` is the find
// bar's anchor (src/app/planner/find-bar.js).

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-20 flex h-[66px] items-center gap-x-3 border-b border-line bg-surface px-6 max-sm:px-3">
      <a
        className="flex min-w-0 items-baseline gap-3 no-underline"
        href="./"
        aria-label="Torchlight of Building home"
        data-view="builds"
        onClick={(event) => event.preventDefault()}
      >
        <span className="truncate font-display text-xl font-bold tracking-wider text-accent uppercase max-sm:text-lg">
          Torchlight of Building
        </span>
        <span className="text-xs font-semibold tracking-widest text-muted uppercase max-md:hidden">
          SS14 · Tartarus
        </span>
      </a>
      <div className="header-actions ml-auto flex gap-1.5">
        <ShellAction
          id="theme-toggle"
          label="Theme"
          iconOnly
          title="Switch between the light and dark theme"
          onClick={() => toggleTheme()}
          icon={<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />}
        />
      </div>
    </header>
  );
}
