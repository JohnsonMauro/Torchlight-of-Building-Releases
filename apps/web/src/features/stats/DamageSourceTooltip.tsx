import { plannerQueries } from "@legacy/app/bridge/planner-queries.js";
import { GearTooltipCard } from "../gear/GearTooltip";
import { MemoryCard } from "../hero/MemoryTooltip";
import * as memoryClasses from "../hero/memory-tooltip-classes";
import { TraitCard } from "../hero/TraitTooltip";
import * as traitClasses from "../hero/trait-tooltip-classes";
import { PactCard } from "../pacts/PactTooltip";
import * as pactClasses from "../pacts/pact-tooltip-classes";
import { SkillCard } from "../skills/SkillTooltip";
import * as skillClasses from "../skills/skill-tooltip-classes";
import { SlateCard } from "../slates/SlateTooltip";
import * as slateClasses from "../slates/slate-tooltip-classes";
import { Tooltip, type TooltipAnchor } from "../../ui/tooltip/Tooltip";
import type { TooltipBody } from "../../ui/tooltip/tooltip-store";
import * as classes from "./damage-source-tooltip-classes";

type DamageSourceView = ReturnType<ReturnType<typeof plannerQueries>["damageSourceTooltip"]>;

/**
 * A damage path source's tooltip: the card of the gear, slate, Kismet, hero trait, memory, skill or support it names
 * (each domain's own), else the breakdown of what feeds it. It stays while the pointer moves into it, to scroll.
 */
export function DamageSourceTooltip({
  source,
  category,
  children,
}: {
  source: string;
  category: string;
  children: TooltipAnchor;
}) {
  return (
    <Tooltip sticky content={() => sourceBody(plannerQueries().damageSourceTooltip({ source, category }))}>
      {children}
    </Tooltip>
  );
}

function sourceBody(source: DamageSourceView): TooltipBody {
  const framed = (body: TooltipBody): TooltipBody => ({ ...body, kind: `${body.kind} ${classes.FRAME}` });
  switch (source.kind) {
    case "gear":
      return framed({
        body: <GearTooltipCard view={source.view} />,
        kind: source.view.frame,
        rarity: source.view.rarity,
      });
    case "pact":
      return framed({
        body: <PactCard view={source.view} />,
        kind: pactClasses.FRAME,
        rarity: source.view.rarity ?? undefined,
      });
    case "slate":
      return framed({ body: <SlateCard view={source.view} />, kind: slateClasses.FRAME });
    case "trait":
      return framed({
        body: <TraitCard view={source.view} />,
        kind: traitClasses.traitFrame(source.view.follower),
        rarity: source.view.rarity ?? undefined,
      });
    case "memory":
      return framed({
        body: <MemoryCard view={source.view} />,
        kind: memoryClasses.MEMORY_FRAME,
        rarity: source.view.rarity,
      });
    case "skill":
      return framed({ body: <SkillCard view={source.view} />, kind: skillClasses.FRAMES[source.view.look] });
    default:
      return {
        body: (
          <>
            <strong className={classes.SUMMARY_TITLE}>{source.title}</strong>
            <span className={classes.SUMMARY_BODY}>{source.body}</span>
            <small className={classes.SUMMARY_FOOT}>Source breakdown · scroll for more</small>
          </>
        ),
        kind: classes.SUMMARY_FRAME,
      };
  }
}
