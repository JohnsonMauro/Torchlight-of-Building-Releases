import { EnergyPanel, SkillBoard, SkillSetupCount } from "../../features/skills/SkillsSection";
import { sectionCardClass } from "../../ui/section-card";
import { SectionHeading } from "../../ui/SectionHeading";

export function SkillsView() {
  return (
    <section id="skills-view" className={`${sectionCardClass} order-2 col-start-1`} hidden>
      <SectionHeading
        title="Skills"
        help="skills"
        total={{ label: "Skill setups", id: "skill-setup-count", value: <SkillSetupCount /> }}
      />
      <EnergyPanel />
      <SkillBoard />
    </section>
  );
}
