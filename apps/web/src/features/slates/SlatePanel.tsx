import { SlateBoard } from "./SlateBoard";
import { SLATE_PANEL_ART } from "./slate-classes";

/** The Divinity Slates board's panel, laid over the talent tree it replaces (TalentsView): it covers its positioned parent. */
export function SlatePanel() {
  return (
    <div className="slate-layout absolute inset-0 overflow-hidden">
      <section
        className={`slate-board-panel relative h-full overflow-hidden rounded-md border border-line ${SLATE_PANEL_ART}`}
      >
        <div
          id="slate-board"
          className="slate-board @container grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-auto p-3"
          role="grid"
          aria-label="Equipped Divinity Slates"
        >
          <SlateBoard />
        </div>
      </section>
    </div>
  );
}
