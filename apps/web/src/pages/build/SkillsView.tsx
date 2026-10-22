import { SkillBoard } from "../../features/skills/SkillsSection";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { BuildTabs } from "../../ui/BuildTabs";
import { useViewOpen } from "../../ui/use-workspace";

export function SkillsView() {
  const open = useViewOpen("skills");
  return (
    <section id="skills-view" className={`${sectionCardClass} ${buildSectionPlace}`} hidden={!open}>
      <BuildTabs />
      <SkillBoard />
    </section>
  );
}
