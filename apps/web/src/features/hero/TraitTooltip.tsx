import type { TextRun, TraitTooltipView } from "@legacy/app/bridge/trait-tooltip-view.ts";
import { treeExtraRowTooltipView } from "@legacy/app/bridge/trait-tooltip-view.ts";
import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { useAltHeld } from "../../ui/use-alt-held";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import type { TooltipBody } from "../../ui/tooltip/tooltip-store";
import * as classes from "./trait-tooltip-classes";

/** A hero trait card, framed: a follower's and a skill's take their rarity. */
const traitBody = (view: TraitTooltipView | null): TooltipBody | null =>
  view
    ? {
        body: <TraitCard view={view} />,
        kind: view.follower ? "hero-trait-tooltip follower-tooltip" : "hero-trait-tooltip",
        rarity: view.rarity ?? undefined,
      }
    : null;

/** A hero trait's tooltip at its level in this build (`levelKey`); `selected` when the build has picked it. */
export function HeroTraitTooltip({
  name,
  levelKey,
  selected,
  children,
}: {
  name: string;
  levelKey: string;
  selected: boolean;
  children: TooltipAnchor;
}) {
  return (
    <Tooltip content={() => traitBody(plannerQueries().heroTraitTooltip({ name, levelKey, selected }))}>
      {children}
    </Tooltip>
  );
}

/** A tree hero's fourth row: where it comes from. */
export function TreeExtraRowTooltip({ children }: { children: TooltipAnchor }) {
  return <Tooltip content={() => traitBody(treeExtraRowTooltipView())}>{children}</Tooltip>;
}

/** A follower's card (a selector card's rarity, else the build's). */
export function FollowerTooltip({
  followerId,
  rarityId = null,
  children,
}: {
  followerId: string;
  rarityId?: string | null;
  children: TooltipAnchor;
}) {
  return (
    <Tooltip content={() => traitBody(plannerQueries().followerTooltip({ followerId, rarityId }))}>{children}</Tooltip>
  );
}

/** A Tartarus Skill's card. */
export function FollowerSkillTooltip({ name, children }: { name: string; children: TooltipAnchor }) {
  return <Tooltip content={() => traitBody(plannerQueries().followerSkillTooltip(name))}>{children}</Tooltip>;
}

function TraitCard({ view }: { view: TraitTooltipView }) {
  const altHeld = useAltHeld();
  return (
    <>
      <div className={view.follower ? `${classes.HEAD} ${classes.HEAD_FOLLOWER}` : classes.HEAD}>
        <strong className={`${classes.TITLE} ${view.follower ? classes.TITLE_FOLLOWER : classes.TITLE_TRAIT}`}>
          {view.title}
        </strong>
        {view.coverage ? <CoverageBadge coverage={view.coverage} className={classes.HEAD_COVERAGE} /> : null}
        <em className={view.follower ? classes.CHIP_FOLLOWER : classes.CHIP_TRAIT}>{view.chip}</em>
      </div>
      {view.unlock ? <small className={classes.UNLOCK}>{view.unlock}</small> : null}
      <div className={classes.EFFECTS}>
        {view.paragraphs.map((paragraph, index) => (
          <p key={index} className={paragraph.flavor ? `${classes.PARAGRAPH} italic` : classes.PARAGRAPH}>
            <Runs runs={paragraph.runs} />
            {paragraph.coverage ? (
              <CoverageBadge coverage={paragraph.coverage} className={classes.INLINE_COVERAGE} />
            ) : null}
          </p>
        ))}
      </div>
      {view.keywords.length ? (
        altHeld ? (
          <div className={classes.DETAILS}>
            {view.keywords.map((keyword) => (
              <div key={keyword.name}>
                <span className={classes.DEFINITION_NAME}>{keyword.name}</span>
                <em className={classes.DEFINITION_KIND}>{keyword.kind}</em>
                {keyword.lines.map((line, index) => (
                  <span key={index} className={classes.DEFINITION_LINE}>
                    {line}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <small className={classes.HINT}>Hold Alt for details</small>
        )
      ) : null}
      {view.source ? <small className={classes.SOURCE}>{view.source}</small> : null}
    </>
  );
}

function Runs({ runs }: { runs: TextRun[] }) {
  return runs.map((run, index) =>
    run.look ? (
      <span key={index} className={classes.RUN_LOOKS[run.look]}>
        {run.text}
      </span>
    ) : (
      run.text
    ),
  );
}
