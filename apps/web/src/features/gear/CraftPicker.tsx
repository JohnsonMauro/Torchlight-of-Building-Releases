// The item picker: first the kind of item (rare, legendary, Vorax); then, for a rare item, the item groups, a group's
// types and a type's bases, as cards across the dialog (the preview comes with the form); a base opens the form. A Vorax
// item: the groups that hold limbs, then a group's limbs; a limb opens the form. Its path, also at the top of the form,
// opens any step taken again. The legendary list browses with its cards and path.
import { useEffect, useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CraftCrumbView, CraftPickView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { Breadcrumb } from "../../ui/Breadcrumb";
import { GearSlotIcon } from "../../ui/GearSlotIcon";
import { CraftColumn } from "../../ui/CraftColumn";
import { PICK_CARD, PICK_CARDS } from "../../ui/craft-classes";

const CHANGE = {
  mode: "craftMode",
  group: "pickGroup",
  type: "pickType",
  base: "pickBase",
} as const;

export function CraftPicker({ pick }: { pick: CraftPickView }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const where = pick.path.map((crumb) => crumb.label).join("/");
  // A card picked leaves the page: the next step's heading takes the focus.
  useEffect(() => heading.current?.focus(), [where]);
  return (
    <div className="flex min-h-0 flex-1">
      <CraftColumn path={<CraftPath path={pick.path} />} className="flex-1">
        <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">
          {pick.heading}
        </h3>
        <PickCards step={pick.step} cards={pick.cards} />
      </CraftColumn>
    </div>
  );
}

/** A step's cards: picking one takes the next step. */
export function PickCards({ step, cards }: Pick<CraftPickView, "step" | "cards">) {
  return (
    <div className={PICK_CARDS}>
      {cards.map((card) => (
        <button
          key={card.value}
          type="button"
          className={PICK_CARD}
          data-craft-pick={card.value}
          onClick={() => plannerCommands().changeEquipmentCraft({ kind: CHANGE[step], value: card.value })}
        >
          {card.slotIcon ? (
            <GearSlotIcon kind={card.slotIcon} className="size-12 text-dim" />
          ) : card.icon ? (
            <img src={card.icon} alt="" className="size-12 object-contain" />
          ) : null}
          <span className="text-sm font-bold">{card.label}</span>
          {card.detail ? <small className="text-xs text-muted">{card.detail}</small> : null}
        </button>
      ))}
    </div>
  );
}

/** Where the picker or the form stands: each step taken opens it again. */
export function CraftPath({ path }: { path: CraftCrumbView[] }) {
  return (
    <Breadcrumb
      label="Item"
      steps={path.map(({ label, step }) => ({
        label,
        onSelect: step ? () => plannerCommands().changeEquipmentCraft({ kind: "repick", step }) : undefined,
      }))}
    />
  );
}
