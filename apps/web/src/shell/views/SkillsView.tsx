import { EnergyPanel, SkillBoard, SkillSetupCount } from "../../features/skills/SkillsSection";

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
          <strong id="skill-setup-count">
            <SkillSetupCount />
          </strong>
        </div>
      </div>
      <EnergyPanel />
      <SkillBoard />
    </section>
  );
}
