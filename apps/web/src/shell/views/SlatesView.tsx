import { SlateBoard } from "../../features/slates/SlateBoard";

// Holder of the Divinity Slates board while the talent tree is shown: the Slates button of the talent column moves
// .slate-layout into the talents view (src/app/app.js setTalentSlateMode), and back here, hidden, when the tree returns.
export function SlatesView() {
  return (
    <section id="slates-view" className="app-view" hidden>
      <div className="slate-layout">
        <section className="panel slate-board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Statue layout</p>
              <h2>Statue of The New God</h2>
            </div>
            <span className="count">SS13 capture</span>
          </div>
          <div id="slate-board" className="slate-board" role="grid" aria-label="Equipped Divinity Slates">
            <SlateBoard />
          </div>
        </section>
      </div>
    </section>
  );
}
