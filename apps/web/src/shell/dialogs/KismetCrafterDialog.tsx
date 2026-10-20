export function KismetCrafterDialog() {
  return (
    <dialog id="kismet-crafter" className="kismet-crafter-dialog" aria-labelledby="kismet-crafter-title">
      <header>
        <h2 id="kismet-crafter-title">Select Kismet</h2>
        <button type="button" data-close-kismet-crafter="" aria-label="Close Kismet crafter">
          ×
        </button>
      </header>
      <div className="kismet-crafter-layout">
        <div className="kismet-choice-pane">
          <input id="kismet-search" type="search" placeholder="Search kismets…" aria-label="Search kismets" />
          <div id="kismet-choice-list" />
        </div>
        <div className="kismet-detail-pane">
          <div id="kismet-roll-controls" />
          <div id="kismet-preview" />
        </div>
      </div>
      <footer>
        <button type="button" data-clear-kismet-slot="">
          Clear Slot
        </button>
        <button type="button" data-confirm-kismet="">
          Confirm
        </button>
        <button type="button" data-close-kismet-crafter="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}
