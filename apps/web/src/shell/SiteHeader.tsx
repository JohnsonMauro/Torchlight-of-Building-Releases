import { toggleTheme } from "../ui/theme";
import { ShellAction } from "./ShellAction";

// The page header: the planner's name, Builds and the theme switch, over a bottom line. The open build's
// state and actions sit in the build strip under it (LoadoutStrip). `site-header` is the find bar's anchor
// (src/app/planner/find-bar.js); the workspace views sit in the rail beside the page (ViewRail), which starts under the
// header, so the header keeps a fixed height: 66px, or 108px on phones, where the actions wrap under the name.

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-20 flex h-[66px] flex-wrap content-center items-center gap-x-3 gap-y-1.5 border-b border-line bg-surface px-6 max-sm:h-[108px] max-sm:px-3">
      <a
        className="flex shrink-0 items-baseline gap-3 no-underline max-sm:h-13 max-sm:items-center"
        href="./"
        aria-label="Torchlight of Building home"
      >
        <span className="font-display text-xl font-bold tracking-wider text-accent uppercase max-sm:text-lg">
          Torchlight of Building
        </span>
        <span className="text-xs font-semibold tracking-widest text-muted uppercase max-md:hidden">
          SS14 · Tartarus
        </span>
      </a>
      <div className="header-actions ml-auto flex gap-1.5 max-sm:mr-auto max-sm:ml-0">
        <ShellAction
          label="Builds"
          view="builds"
          icon={
            <>
              <rect x="3" y="4" width="8" height="7" rx="1" />
              <rect x="13" y="4" width="8" height="7" rx="1" />
              <rect x="3" y="13" width="8" height="7" rx="1" />
              <rect x="13" y="13" width="8" height="7" rx="1" />
            </>
          }
        />
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
