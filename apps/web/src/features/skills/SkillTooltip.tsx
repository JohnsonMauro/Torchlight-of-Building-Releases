import { Fragment } from "react";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import type { SkillLevelView, SkillTooltipView } from "@legacy/app/bridge/skill-tooltip-view.ts";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import * as classes from "./skill-tooltip-classes";

type SkillTarget = Parameters<ReturnType<typeof plannerQueries>["skillTooltip"]>[0];

const FRAMES: Record<SkillTooltipView["look"], string> = {
  skill: "skill-tooltip",
  support: "skill-tooltip support-tooltip",
  aura: "skill-tooltip aura-tooltip",
};

/**
 * A skill's or a support's tooltip (`target`): the planner's skillTooltip query, read when it opens. `hint` says what
 * the element does on a click or a drag, under the content.
 */
export function SkillTooltip({
  target,
  hint = "",
  children,
}: {
  target: SkillTarget;
  hint?: string;
  children: TooltipAnchor;
}) {
  return (
    <Tooltip
      content={() => {
        const view = plannerQueries().skillTooltip(target);
        return view ? { body: <SkillCard view={view} hint={hint} />, kind: FRAMES[view.look] } : null;
      }}
    >
      {children}
    </Tooltip>
  );
}

function SkillCard({ view, hint }: { view: SkillTooltipView; hint: string }) {
  return (
    <>
      <div className={classes.HEAD}>
        {view.icon ? <img className={classes.ICON} src={view.icon} alt="" /> : <span />}
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <strong className={classes.NAME}>{view.name}</strong>
          {view.stars !== null ? (
            <small className={classes.STARS} aria-label={`${view.stars} stars`}>
              {`${"★".repeat(view.stars)}${"☆".repeat(5 - view.stars)} `}
              <em className={classes.STARS_COUNT}>{`${view.stars}/5`}</em>
            </small>
          ) : null}
          <small className={classes.LEVEL}>
            <Level level={view.level} />
          </small>
        </div>
      </div>
      <div className={classes.TAGS}>
        {view.tags.map((tag, index) => (
          <span key={index} className={classes.TAG}>
            {tag}
          </span>
        ))}
        <CoverageBadge coverage={view.coverage} className={classes.COVERAGE} />
      </div>
      {view.curseNote ? <p className={classes.CURSE_NOTE}>Not applied: {view.curseNote}</p> : null}
      {view.grantNote ? <p className={classes.GRANT_NOTE}>{view.grantNote}</p> : null}
      <div className={classes.FACTS}>
        {view.facts.map((fact, index) => (
          <div key={index} className={classes.FACT}>
            <span className="text-xs text-muted">{fact.label}</span>
            <b className={`${fact.addedDamage ? "text-accent" : "text-text"} text-right`}>{fact.value}</b>
          </div>
        ))}
      </div>
      {view.reference ? <p className={classes.REFERENCE}>{view.reference}</p> : null}
      <div className={classes.EFFECTS}>
        <h4 className={classes.EFFECTS_TITLE}>{`${view.name}:`}</h4>
        {view.effects.map((effect, index) => (
          <p key={index} className={classes.EFFECT}>
            {effect.lines.map((line, position) => (
              <Fragment key={position}>
                {position ? "\n" : null}
                {line.segments.map((segment, part) =>
                  segment.className ? (
                    <span key={part} className={segment.className}>
                      {segment.text}
                    </span>
                  ) : (
                    segment.text
                  ),
                )}
                {line.coverage ? <CoverageBadge coverage={line.coverage} className={classes.LINE_COVERAGE} /> : null}
              </Fragment>
            ))}
          </p>
        ))}
      </div>
      {view.source ? <small className={classes.SOURCE}>{view.source}</small> : null}
      {hint ? <small className={classes.HINT}>{hint}</small> : null}
    </>
  );
}

function Level({ level }: { level: SkillLevelView }) {
  if (!level.added) return <>{level.text}</>;
  return (
    <>
      {`${level.text} `}
      <span className={`${classes.ADDED_LEVELS} ${level.added < 0 ? "text-danger" : "text-ok"}`}>
        {`${level.added > 0 ? "+" : ""}${level.added}`}
      </span>
    </>
  );
}
