import { EnergyPanel, SkillBoard, SkillSetupCount } from "../../features/skills/SkillsSection";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { SectionHeading } from "../../ui/SectionHeading";
import { useViewOpen } from "../../ui/use-workspace";

export function SkillsView() {
  const open = useViewOpen("skills");
  return (
    <section id="skills-view" className={`${sectionCardClass} ${buildSectionPlace}`} hidden={!open}>
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
