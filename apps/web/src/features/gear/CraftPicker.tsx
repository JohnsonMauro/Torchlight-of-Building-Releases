// The rare item picker (Craft Rare Item): the item groups, then a group's types, then a type's bases, as cards; a base
// opens the form. Its path, also at the top of the form, opens any step taken again.
import { useEffect, useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { CraftCrumbView, CraftPickView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { CRAFT_ASIDE, CRAFT_ASIDE_LABEL, CRAFT_FORM, CRAFT_LAYOUT, PICK_CARD, PICK_CARDS } from "./crafter-classes";

const CHANGE = {
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
    <div className={CRAFT_LAYOUT}>
      <section className={CRAFT_FORM}>
        <CraftPath path={pick.path} />
        <h3 ref={heading} tabIndex={-1} className="text-sm font-bold outline-none">
          {pick.heading}
        </h3>
        <div className={PICK_CARDS}>
          {pick.cards.map((card) => (
            <button
              key={card.value}
              type="button"
              className={PICK_CARD}
              data-craft-pick={card.value}
              onClick={() => plannerCommands().changeEquipmentCraft({ kind: CHANGE[pick.step], value: card.value })}
            >
              {card.icon ? <img src={card.icon} alt="" className="size-12 object-contain" /> : null}
              <span className="text-sm font-bold">{card.label}</span>
              <small className="text-xs text-muted">{card.detail}</small>
            </button>
          ))}
        </div>
      </section>
      <aside className={CRAFT_ASIDE}>
        <small className={CRAFT_ASIDE_LABEL}>Preview</small>
        <div className="grid min-h-50 place-items-center rounded-md border border-dashed border-line-strong text-center text-dim">
          Select a base to preview item
        </div>
      </aside>
    </div>
  );
}

/** Where the picker or the form stands: each step taken opens it again. */
export function CraftPath({ path }: { path: CraftCrumbView[] }) {
  return (
    <nav aria-label="Item" data-craft-path="">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {path.map(({ label, step }, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index ? <span aria-hidden="true">›</span> : null}
            {step ? (
              <button
                type="button"
                className="cursor-pointer rounded-sm text-info underline-offset-2 hover:underline"
                onClick={() => plannerCommands().changeEquipmentCraft({ kind: "repick", step })}
              >
                {label}
              </button>
            ) : (
              <span className="font-bold text-text" aria-current="step">
                {label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
