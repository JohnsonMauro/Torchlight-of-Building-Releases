import type { BoostedTextView, PactTooltipBlock, PactTooltipView } from "@legacy/app/bridge/pact-tooltip-view.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import * as classes from "./pact-tooltip-classes";
import { PORTRAIT_STRIP } from "./pact-classes";

type PactNodeTarget = Parameters<ReturnType<typeof plannerQueries>["pactNodeTooltip"]>[0];

const body = (view: PactTooltipView) => ({
  body: <PactCard view={view} />,
  kind: classes.FRAME,
  rarity: view.rarity ?? undefined,
});

/** A tree node's tooltip (its Kismet's when one is installed): the planner's pactNodeTooltip query for it. */
export function PactNodeTooltip({ target, children }: { target: PactNodeTarget; children: TooltipAnchor }) {
  return <Tooltip content={() => body(plannerQueries().pactNodeTooltip(target))}>{children}</Tooltip>;
}

/**
 * A Pactspirit's tooltip, grouped as the game's Pactspirit page (overview, effect at its level, upgrade rewards): on a
 * pact slot's portrait, or on a choice of the Pactspirit selector (`place`).
 */
export function PactspiritTooltip({
  name,
  place = "slot",
  children,
}: {
  name: string;
  place?: "slot" | "selector";
  children: TooltipAnchor;
}) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().pactspiritTooltip(name, place);
        return view ? body(view) : null;
      }}
    >
      {children}
    </Tooltip>
  );
}

/** A node's, Kismet's or Pactspirit's card (its tooltip, and a damage path source naming a Kismet). */
export function PactCard({ view }: { view: PactTooltipView }) {
  return (
    <>
      {view.portrait && view.icon ? (
        <div className={classes.HEAD_PORTRAIT}>
          <img className={`${PORTRAIT_STRIP} ${classes.HEAD_PORTRAIT_ART}`} src={view.icon} alt="" />
          <HeadText view={view} className={classes.HEAD_PORTRAIT_TEXT} />
        </div>
      ) : (
        <div className={classes.HEAD}>
          {view.icon ? <img className={classes.HEAD_ICON} src={view.icon} alt="" /> : null}
          <HeadText view={view} />
        </div>
      )}
      {view.blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
      <footer className={classes.FOOTER}>{view.footer}</footer>
    </>
  );
}

function HeadText({ view, className }: { view: PactTooltipView; className?: string }) {
  return (
    <div className={className}>
      <strong className={classes.TITLE}>{view.title}</strong>
      <small className={classes.KICKER}>{view.kicker}</small>
    </div>
  );
}

function Block({ block }: { block: PactTooltipBlock }) {
  if (block.kind === "heading") return <h4 className={classes.HEADING}>{block.text}</h4>;
  if (block.kind === "feature")
    return (
      <section className={classes.FEATURE}>
        <img className={classes.FEATURE_ICON} src={block.icon} alt="" />
        <strong className={classes.FEATURE_NAME}>{block.name}</strong>
      </section>
    );
  if (block.kind === "text")
    return (
      <p className={classes.TEXT}>
        {block.text}
        {block.coverage ? <CoverageBadge coverage={block.coverage} className={classes.INLINE_COVERAGE} /> : null}
      </p>
    );
  return (
    <ul className={classes.LIST}>
      {block.items.map((item, index) => (
        <li key={index} className={item.dimmed ? classes.ITEM_DIMMED : classes.ITEM}>
          <BoostedText text={item.text} />
          {item.coverage ? <CoverageBadge coverage={item.coverage} className={classes.INLINE_COVERAGE} /> : null}
        </li>
      ))}
    </ul>
  );
}

function BoostedText({ text }: { text: BoostedTextView }) {
  if (text.effective === null) return <>{text.before}</>;
  return (
    <>
      {text.before}
      <span className={classes.BOOSTED} title={text.title}>
        {text.effective}
      </span>
      {text.after}
    </>
  );
}
