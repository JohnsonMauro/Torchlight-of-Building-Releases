import type { MemoryLineView, MemoryTooltipView, ScentTooltipView } from "@legacy/app/bridge/memory-tooltip-view.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { RevivedEffect } from "./RevivedEffect";
import * as classes from "./memory-tooltip-classes";
import { KeywordText } from "../../ui/KeywordText";

/** A hero memory's tooltip: one in the inventory (`inventoryId`) or the one in a slot (`tier`). */
export function MemoryTooltip({
  target,
  children,
}: {
  target: { inventoryId: string } | { tier: string };
  children: TooltipAnchor;
}) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().heroMemoryTooltip(target);
        return view ? { body: <MemoryCard view={view} />, kind: classes.MEMORY_FRAME, rarity: view.rarity } : null;
      }}
    >
      {children}
    </Tooltip>
  );
}

/** The scent ingredient's or elixir's tooltip in a slot (`kind`: "elixir", or the ingredient kind). */
export function ScentTooltip({ kind, children }: { kind: string; children: TooltipAnchor }) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().sageScentTooltip(kind);
        return view ? { body: <ScentCard view={view} />, kind: "sage-scent-tooltip" } : null;
      }}
    >
      {children}
    </Tooltip>
  );
}

/** A memory's card (its tooltip, and a damage path source naming it). */
export function MemoryCard({ view }: { view: MemoryTooltipView }) {
  return (
    <>
      <div className={classes.HEAD}>
        <img className={classes.HEAD_ICON} src={view.icon} alt="" />
        <div>
          <strong className={classes.TITLE}>{view.name}</strong>
          <small className={classes.KICKER}>{view.kicker}</small>
        </div>
      </div>
      {view.revived ? (
        <span className={classes.REVIVED_BADGE}>
          <span className="text-sm leading-none" aria-hidden="true">
            ☾
          </span>{" "}
          Revived
        </span>
      ) : null}
      <div className={classes.BODY}>
        <p className={classes.STAT}>
          Enhancement Level <b className={classes.STAT_VALUE}>{view.enhancement}</b>
        </p>
        <p className={classes.STAT}>
          Trait Level <b className={classes.STAT_GOOD}>+{view.traitBonus}</b>
        </p>
        {view.reduction !== null ? (
          <p className={classes.STAT}>
            Base Trait Slot <b className={classes.STAT_VALUE}>{view.reduction}% to base stats and random affixes</b>
          </p>
        ) : null}
        {view.sections.map((section) => (
          <section key={section.heading} className={classes.SECTION}>
            <h4 className={classes.HEADING}>{section.heading}</h4>
            {section.kind === "revived" ? (
              <>
                <RevivedEffect effect={section.effect} />
                {section.note ? <p className={classes.LINE}>{section.note}</p> : null}
                <CoverageBadge coverage={section.coverage} className="inline-block px-1.5 py-0.5" />
              </>
            ) : (
              section.lines.map((line, index) =>
                line.tier === null && section.heading === "Implicit" ? (
                  <p key={index} className={section.wax ? classes.LINE_WAX : classes.LINE}>
                    <KeywordText text={line.text} />
                    <CoverageBadge coverage={line.coverage} className={classes.INLINE_COVERAGE} />
                  </p>
                ) : (
                  <MemoryAffix key={index} line={line} />
                ),
              )
            )}
          </section>
        ))}
      </div>
      <small className={classes.FOOTER}>{view.footer}</small>
    </>
  );
}

function MemoryAffix({ line }: { line: MemoryLineView }) {
  const badge = line.tier === null ? null : `T${line.tier}`;
  return (
    <div className={classes.AFFIX}>
      {badge ? <i className={tierBadgeClasses(tierBadgeKey(badge))}>{badge}</i> : null}
      <span className={classes.AFFIX_TEXT}>
        <KeywordText text={line.text} />
      </span>
      <CoverageBadge coverage={line.coverage} className={classes.AFFIX_COVERAGE} />
    </div>
  );
}

function ScentCard({ view }: { view: ScentTooltipView }) {
  return (
    <>
      <div className={classes.SCENT_HEAD}>
        <img className={classes.SCENT_ICON} src={view.icon} alt="" />
        <div>
          <small className={classes.SCENT_KICKER}>{view.kicker}</small>
          <strong className={classes.SCENT_TITLE}>{view.title}</strong>
        </div>
      </div>
      {view.tags.length ? (
        <div className={classes.SCENT_TAGS}>
          {view.tags.map((tag) => (
            <span key={tag} className={classes.SCENT_TAG}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className={classes.SCENT_EFFECTS}>
        {view.lines.map((line, index) => (
          <p key={index} className={classes.SCENT_LINE}>
            <KeywordText text={line} />
          </p>
        ))}
      </div>
      <small className={classes.SCENT_HINT}>Click to change</small>
    </>
  );
}
