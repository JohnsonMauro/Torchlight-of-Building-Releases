import { SlateBoard } from "./SlateBoard";
import { SLATE_PANEL_ART } from "./slate-classes";

/** The Divinity Slates board's panel, shown in place of the talent tree (TalentsView); it fills the height it is given. */
export function SlatePanel() {
  return (
    <div className="slate-layout h-full w-full overflow-hidden">
      <section
        className={`slate-board-panel relative h-full overflow-hidden rounded-md border border-line ${SLATE_PANEL_ART}`}
      >
        <div
          id="slate-board"
          className="slate-board grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-auto px-5.5 py-4.5"
          role="grid"
          aria-label="Equipped Divinity Slates"
        >
          <SlateBoard />
        </div>
      </section>
    </div>
  );
}
