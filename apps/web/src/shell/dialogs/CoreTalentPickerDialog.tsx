export function CoreTalentPickerDialog() {
  return (
    <dialog
      id="core-talent-picker"
      className="talent-panel-picker core-talent-picker"
      aria-labelledby="core-picker-title"
    >
      <div className="talent-picker-heading">
        <div>
          <p className="eyebrow">Core talent</p>
          <h2 id="core-picker-title">Select a core talent</h2>
          <p id="core-picker-status" className="muted" />
        </div>
        <button
          type="button"
          className="picker-close"
          data-close-core-picker=""
          aria-label="Close core talent selector"
        >
          ×
        </button>
      </div>
      <div id="core-talent-picker-grid" className="core-talent-picker-grid" />
    </dialog>
  );
}
