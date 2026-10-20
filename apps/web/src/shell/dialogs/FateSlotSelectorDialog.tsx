export function FateSlotSelectorDialog() {
  return (
    <dialog id="fate-slot-selector" className="fate-slot-dialog" aria-labelledby="fate-slot-title">
      <header>
        <h2 id="fate-slot-title">Unlock Fate Slots</h2>
        <button type="button" data-close-fate-slot="" aria-label="Close Fate slot selector">
          ×
        </button>
      </header>
      <p>Select how to expand this Undetermined Fate slot:</p>
      <div id="fate-slot-options" />
      <button type="button" className="button button-secondary" data-clear-fate-slots="">
        Clear Fate slots
      </button>
    </dialog>
  );
}
