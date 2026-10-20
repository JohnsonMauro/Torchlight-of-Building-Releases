export function SkillsView() {
  return (
    <section id="skills-view" className="app-view" hidden>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Captured build</p>
          <h1>
            Skills
            <button type="button" className="qol-help" data-qol-help="skills" aria-label="Skills controls">
              ?
            </button>
          </h1>
          <p className="muted">
            Active skills, supports, effective levels, and observed in-game values for Selena's Scorching Beam setup.
          </p>
        </div>
        <div className="talent-total">
          <span>Skill setups</span>
          <strong id="skill-setup-count">—</strong>
        </div>
      </div>
      <section className="panel energy-panel compact-energy-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Activation budget</p>
            <h2>Energy allocator</h2>
          </div>
          <div className="energy-total">
            <strong id="energy-total">—</strong>
            <span>used / available</span>
          </div>
        </div>
        <div id="energy-meter" className="energy-meter">
          <i />
        </div>
      </section>
      <section className="panel compendium-skill-panel">
        <div className="compendium-tabs">
          <button type="button" className="active" data-skill-board-tab="skills">
            Skills
          </button>
          <button type="button" data-skill-board-tab="auras">
            Auras
          </button>
        </div>
        <div className="skill-energy-scale">
          <span />
          <span />
          <span>0</span>
          <span>10</span>
          <span>15</span>
          <span>50</span>
          <span>100</span>
          <strong>Energy</strong>
        </div>
        <div id="skill-groups" className="compendium-skill-rows" />
        <section id="aura-reservation-summary" className="aura-reservation-summary" hidden aria-live="polite">
          <div className="aura-resource-card mana">
            <span>Sealed Mana</span>
            <strong id="aura-sealed-mana">0 / 0</strong>
            <small id="aura-mana-percent">0% sealed</small>
            <i>
              <b id="aura-mana-meter" />
            </i>
          </div>
          <div className="aura-resource-card life">
            <span>Sealed Life</span>
            <strong id="aura-sealed-life">0 / 0</strong>
            <small id="aura-life-percent">0% sealed</small>
            <i>
              <b id="aura-life-meter" />
            </i>
          </div>
          <div id="aura-reservation-status" className="aura-reservation-status" />
        </section>
        <footer>
          <button className="button button-secondary" type="button" data-reset-skills="">
            Reset Skills
          </button>
        </footer>
      </section>
    </section>
  );
}
