export function SlateEditorDialog() {
  return (
    <dialog id="slate-editor" className="slate-inventory slate-editor" aria-labelledby="slate-editor-title">
      <div className="slate-inventory-tabs">
        <strong id="slate-editor-title">Edit Divinity Slate</strong>
        <button type="button" className="picker-close" data-close-slate-editor="" aria-label="Close slate editor">
          ×
        </button>
      </div>
      <div id="slate-editor-content" />
    </dialog>
  );
}
