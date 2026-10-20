import { setAutofocusAttribute } from "../autofocus";

export function SkillSelectorDialog() {
  return (
    <dialog id="skill-selector" className="skill-selector-dialog" aria-labelledby="skill-selector-title">
      <header>
        <h2 id="skill-selector-title">Select Active Skill</h2>
        <button type="button" data-close-skill-selector="" aria-label="Close selector">
          ×
        </button>
      </header>
      <div className="skill-selector-body">
        <section className="skill-selector-list">
          <label>
            <span aria-hidden="true">⌕</span>
            <input id="skill-selector-search" type="search" placeholder="Search skills…" ref={setAutofocusAttribute} />
            <button type="button" data-clear-skill-search="" aria-label="Clear search">
              ×
            </button>
          </label>
          <div id="skill-selector-results" />
        </section>
        <section id="skill-selector-detail" className="skill-selector-detail">
          <p>Select a skill to configure</p>
        </section>
      </div>
      <footer>
        <button className="button button-secondary" type="button" data-clear-skill-slot="">
          Clear slot
        </button>
        <span />
        <button className="button" type="button" data-confirm-skill-selector="" disabled>
          Confirm
        </button>
        <button className="button button-secondary" type="button" data-close-skill-selector="">
          Cancel
        </button>
      </footer>
    </dialog>
  );
}
