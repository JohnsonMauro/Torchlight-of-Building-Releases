export function TalentPanelPickerDialog() {
  return (
    <dialog id="talent-panel-picker" className="talent-panel-picker" aria-labelledby="talent-picker-title">
      <div className="talent-picker-heading">
        <div>
          <p className="eyebrow">Talent trees</p>
          <h2 id="talent-picker-title">Select a talent tree</h2>
          <p className="muted">Choose one panel to view and edit.</p>
        </div>
        <button
          type="button"
          className="picker-close"
          data-close-talent-picker=""
          aria-label="Close talent tree selector"
        >
          ×
        </button>
      </div>
      <div id="talent-panel-picker-grid" className="talent-panel-picker-grid" />
    </dialog>
  );
}
