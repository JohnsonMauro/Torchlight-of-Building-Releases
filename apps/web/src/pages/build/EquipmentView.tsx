import { CraftButton, GearWorkbench } from "../../features/gear/GearWorkbench";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { SectionHeading } from "../../ui/SectionHeading";
import { useViewOpen } from "../../ui/use-workspace";

export function EquipmentView() {
  const open = useViewOpen("equipment");
  return (
    <section
      id="equipment-view"
      className={`${sectionCardClass} ${buildSectionPlace} min-[901px]:flex min-[901px]:flex-col`}
      hidden={!open}
    >
      <SectionHeading title="Gear" help="gear" actions={<CraftButton />} />
      <GearWorkbench />
    </section>
  );
}
