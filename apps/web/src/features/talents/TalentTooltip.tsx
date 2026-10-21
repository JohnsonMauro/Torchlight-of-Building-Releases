import type {
  CoreTalentTooltipView,
  PrismTooltipView,
  TalentNodeTooltipView,
} from "@legacy/app/bridge/talent-tooltip-view.ts";
import type { TalentNodeView } from "@legacy/app/bridge/talents-view-model.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { PrismSections } from "./PrismSections";
import * as classes from "./talent-tooltip-classes";

/** A node's tooltip (or the installed prism's, on its node): the planner's talentNodeTooltip query for this node. */
export function TalentNodeTooltip({ node, children }: { node: TalentNodeView; children: TooltipAnchor }) {
  return (
    <Tooltip
      content={() => {
        const tooltip = plannerQueries().talentNodeTooltip({
          coordinate: node.coordinate,
          art: node.art,
          locked: node.locked,
          prismAffected: node.prismAffected,
        });
        if (!tooltip) return null;
        if (tooltip.kind === "prism") return { body: <PrismCard view={tooltip.view} />, kind: "prism-tooltip" };
        return {
          body: <NodeCard view={tooltip.view} />,
          kind: "basic-talent-tooltip",
          talentType: tooltip.view.talentType,
        };
      }}
    >
      {children}
    </Tooltip>
  );
}

/** A core slot's tooltip (`threshold`, `locked`), or the prism's shown among the cores (`prism`). */
export function CoreTalentTooltip({
  target,
  children,
}: {
  target: { threshold: number; locked: boolean } | { prism: true };
  children: TooltipAnchor;
}) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().coreTalentTooltip(target);
        if (!view) return null;
        return { body: <CoreCard view={view} />, kind: "basic-talent-tooltip", talentType: view.talentType };
      }}
    >
      {children}
    </Tooltip>
  );
}

function Head({ icon, kicker, title, badge }: { icon: string | null; kicker: string; title: string; badge: string }) {
  return (
    <div className={classes.HEAD}>
      <span className={classes.ICON}>{icon ? <img className={classes.ICON_ART} src={icon} alt="" /> : "✦"}</span>
      <div>
        <small className={classes.KICKER}>{kicker}</small>
        <strong className={classes.TITLE}>{title}</strong>
      </div>
      <b className={classes.BADGE}>{badge}</b>
    </div>
  );
}

function NodeCard({ view }: { view: TalentNodeTooltipView }) {
  return (
    <>
      <Head icon={view.icon} kicker={view.kicker} title={view.title} badge={view.badge} />
      <div className={classes.BODY}>
        {view.effects.map((effect) => (
          <div key={effect.label} className={classes.EFFECT}>
            <span className={classes.EFFECT_LABEL}>{effect.label}</span>
            <strong className={classes.EFFECT_VALUE}>{effect.value}</strong>
            <CoverageBadge coverage={effect.coverage} />
          </div>
        ))}
        {view.description ? (
          <>
            <p className={classes.BODY_TEXT}>{view.description.text}</p>
            <CoverageBadge coverage={view.description.coverage} className={classes.INLINE_COVERAGE} />
          </>
        ) : null}
      </div>
      {view.prism ? (
        <section className={classes.PRISM}>
          <h4 className={classes.PRISM_HEADING}>
            {view.prism.heading} <span className={classes.PRISM_HEADING_NOTE}>{view.prism.note}</span>
          </h4>
          {view.prism.affixes.length ? (
            view.prism.affixes.map((affix, index) => (
              <div key={index} className={`${classes.AFFIX} ${affix.active ? classes.AFFIX_ON : classes.AFFIX_OFF}`}>
                <b className={classes.AFFIX_TIER}>{affix.tier}</b>
                <p className={classes.AFFIX_TEXT}>
                  {affix.text}
                  {affix.coverage ? (
                    <CoverageBadge coverage={affix.coverage} className={classes.INLINE_COVERAGE} />
                  ) : null}
                </p>
                <small className={affix.active ? classes.AFFIX_REASON_ON : classes.AFFIX_REASON_OFF}>
                  {affix.reason}
                </small>
              </div>
            ))
          ) : (
            <p className={classes.PRISM_NONE}>No node-specific affix applies to this talent.</p>
          )}
        </section>
      ) : null}
      <footer className={classes.FOOTER}>{view.footer}</footer>
    </>
  );
}

function CoreCard({ view }: { view: CoreTalentTooltipView }) {
  return (
    <>
      <Head icon={view.icon} kicker={view.kicker} title={view.title} badge={view.badge} />
      <div className={classes.BODY}>
        {view.lines.map((line, index) => (
          <p key={index} className={classes.CORE_LINE}>
            {line}
          </p>
        ))}
        <CoverageBadge coverage={view.coverage} className="my-0.75 inline-block px-1.5 py-0.5" />
        {view.note ? <p className={classes.CORE_LINE}>{view.note}</p> : null}
      </div>
      <footer className={classes.FOOTER}>{view.footer}</footer>
    </>
  );
}

function PrismCard({ view }: { view: PrismTooltipView }) {
  return (
    <>
      <div className={classes.PRISM_HEAD}>
        {view.icon ? <img className={classes.PRISM_ICON} src={view.icon} alt="" /> : null}
        <strong className={classes.PRISM_TITLE}>{view.name}</strong>
        <small className={classes.PRISM_KICKER}>{view.kind}</small>
      </div>
      <div className={classes.PRISM_BODY}>
        <p className={classes.PRISM_AREA}>
          Effect Area: <strong className={classes.PRISM_AREA_VALUE}>{view.area}</strong>{" "}
          <CoverageBadge coverage={view.areaCoverage} className={classes.INLINE_COVERAGE} />
        </p>
        <PrismSections sections={view.sections} inverse={view.kind === "Inverse Image"} />
      </div>
      <footer className={classes.PRISM_FOOTER}>{view.footer}</footer>
    </>
  );
}
