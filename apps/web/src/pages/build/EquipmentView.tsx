import { GearWorkbench } from "../../features/gear/GearWorkbench";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { BuildTabs } from "../../ui/BuildTabs";
import { useViewOpen } from "../../ui/use-workspace";

export function EquipmentView() {
  const open = useViewOpen("equipment");
  return (
    <section
      id="equipment-view"
      className={`${sectionCardClass} ${buildSectionPlace} min-[901px]:flex min-[901px]:flex-col`}
      hidden={!open}
    >
      <BuildTabs />
      <GearWorkbench />
    </section>
  );
}
