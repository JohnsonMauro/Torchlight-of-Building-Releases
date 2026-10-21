import { SlateBoard } from "../../features/slates/SlateBoard";
import { SLATE_PANEL_ART } from "../../features/slates/slate-classes";

// Holder of the Divinity Slates board while the talent tree is shown: the Slates button of the talent column moves
// .slate-layout into the talents view (src/app/talents/talent-trees.js setTalentSlateMode), and back here, hidden, when the tree returns.
// There it takes the height the talent tree had (--slate-panel-height, set on .talent-layout by setTalentSlateMode).
export function SlatesView() {
  return (
    <section id="slates-view" className="app-view" hidden>
      <div className="slate-layout h-(--slate-panel-height,650px) w-full overflow-hidden">
        <section
          className={`slate-board-panel relative h-full overflow-hidden border border-[#3a4655] shadow-[0_12px_28px_rgb(0_0_0/0.18)] ${SLATE_PANEL_ART}`}
        >
          <div className="hidden">
            <p>Statue layout</p>
            <h2>Statue of The New God</h2>
            <span>SS13 capture</span>
          </div>
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
    </section>
  );
}
