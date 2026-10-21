import { EquippedCount, GearWorkbench } from "../../features/gear/GearWorkbench";
import { sectionCardClass } from "../../ui/section-card";
import { SectionHeading } from "../../ui/SectionHeading";

export function EquipmentView() {
  return (
    <section
      id="equipment-view"
      className={`${sectionCardClass} order-2 col-start-2 max-[900px]:col-start-1 min-[901px]:flex min-[901px]:flex-col`}
      hidden
    >
      <SectionHeading
        title="Gear"
        help="gear"
        total={{ label: "Equipped slots", id: "equipment-count", value: <EquippedCount /> }}
      />
      <GearWorkbench />
    </section>
  );
}
