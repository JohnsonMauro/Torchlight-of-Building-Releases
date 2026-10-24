import type { GearTooltipRow, GearTooltipView } from "@legacy/app/bridge/gear-item-view.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { ModifierText } from "../../ui/ModifierText";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import * as classes from "./gear-tooltip-classes";

type GearTarget = { slot: string } | { inventoryId: string } | { legendary: string };

/**
 * An item's tooltip on its equipped slot or Inventory card (`target`), or a named legendary's (the item that grants a
 * skill): the planner's gearTooltip query, read when it opens. An Inventory card's sits beside the card; an empty slot
 * has none.
 */
export function GearTooltip({ target, children }: { target: GearTarget; children: TooltipAnchor }) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().gearTooltip(target);
        if (!view) return null;
        return {
          body: <GearTooltipCard view={view} />,
          kind: view.frame,
          rarity: view.rarity,
          placement: "inventoryId" in target ? "beside" : "pointer",
        };
      }}
    >
      {children}
    </Tooltip>
  );
}

/** An item's card (its tooltip, and a damage path source naming one item). */
export function GearTooltipCard({ view }: { view: GearTooltipView }) {
  return (
    <>
      <div className={classes.HEAD}>
        <img className={classes.ICON} src={view.icon} alt="" />
        <strong className={classes.NAME}>{view.name}</strong>
        <div className="col-start-2 flex flex-wrap gap-1">
          <span className={classes.BASE_CHIP}>{view.base}</span>
          <em className={classes.RARITY_CHIP}>{view.rarityLabel}</em>
        </div>
      </div>
      <div className={classes.BODY}>
        {view.curseNote ? <p className={classes.CURSE_NOTE}>Not applied: {view.curseNote}</p> : null}
        <span className={classes.LEVEL}>Require Lv {view.level}</span>
        {view.energy ? <span className={classes.ENERGY}>{view.energy} Equipment Energy</span> : null}
        <div className="mt-2.5 grid gap-2">
          {view.sections.length ? (
            view.sections.map((section, index) => (
              <section key={index} className={classes.SECTION}>
                <h4 className={classes.SECTION_TITLE}>
                  {section.label}
                  {section.detail ? (
                    <small className="ml-1.5 font-normal tracking-normal normal-case">{section.detail}</small>
                  ) : null}
                </h4>
                <ul className="grid gap-2">
                  {section.rows.map((row, position) => (
                    <GearTooltipLine key={position} row={row} />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p>No modifiers configured</p>
          )}
        </div>
      </div>
      <small className={classes.FOOT}>{view.footer}</small>
    </>
  );
}

function GearTooltipLine({ row }: { row: GearTooltipRow }) {
  const hooks = `${row.legendary ? "legendary-affix " : ""}${row.corroded ? "corrosion-affix " : ""}`;
  return (
    <li className={`${hooks}${classes.ROW}`}>
      {"tier" in row.mark ? (
        <i className={row.mark.tier.className}>{row.mark.tier.text}</i>
      ) : (
        <i className={row.corroded ? classes.KIND_MARK_CORRODED : classes.KIND_MARK}>{row.mark.kind}</i>
      )}
      <span className="min-w-0 whitespace-pre-line">
        <ModifierText text={row.text} />
      </span>
      <CoverageBadge coverage={row.coverage} className={classes.COVERAGE} />
    </li>
  );
}
