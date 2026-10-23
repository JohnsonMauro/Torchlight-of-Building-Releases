// A hero's trait stage (hero-stages.ts): the game's Hero Trait screen as a decal (StageFrame), and for a tiers stage the base
// trait and each tier's trait choices (hexagons) above and below its memory, where the game draws them. A choice picks
// that trait; a memory socket works as in the rows. The tree stage is TraitTreeStage.
import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { ChoiceGroupView, TraitTiersView } from "@legacy/app/bridge/hero-traits-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { StrokeIcon } from "../../ui/StrokeIcon";
import { HeroTraitTooltip } from "./TraitTooltip";
import { MemorySocket } from "./MemorySocket";
import {
  STAGE_BASE,
  STAGE_CHECK,
  STAGE_CHOICE,
  STAGE_CHOICE_ART,
  STAGE_CHOICE_OTHER,
  STAGE_CHOICE_PICKED,
  STAGE_LEVEL,
  STAGE_MEMORY,
  STAGE_NODE,
  type HeroStage,
  type TierStage,
} from "./hero-stages";

/** A node on the decal, by its centre. */
export function Node({ x, y, size, children }: { x: number; y: number; size: number; children: ReactNode }) {
  const place: CSSProperties = { left: `${x}%`, top: `${y}%`, width: `${size}%` };
  return (
    <div className={STAGE_NODE} style={place}>
      {children}
    </div>
  );
}

/** The panel's bottom stays this far above the page's footer (px): the page's gutter, as between the menu and the panels. */
const FOOTER_GAP = 24;
const MIN_HEIGHT = 360;
/** The decal's size against covering the stage: smaller, its blurred copy shows around it. */
const SCALE = 0.85;

/**
 * The stage's height: from where it starts in the page down to the window's bottom without making the page scroll (the
 * panel's padding and border under it, the page's bottom padding), and with the panel ending FOOTER_GAP above the fixed
 * footer. Measured again on a resize and once the tab shows.
 */
function useStageHeight(stage: { current: HTMLDivElement | null }): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      if (!element.offsetWidth) return;
      const box = element.getBoundingClientRect(),
        top = box.top + window.scrollY;
      // What sits under the stage inside its panel (the tree's padding, the panel's border).
      const inPanel = (element.closest(".panel")?.getBoundingClientRect().bottom ?? box.bottom) - box.bottom;
      const main = element.closest("main"),
        pagePadding = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0,
        footer = document.querySelector("[data-site-footer]")?.getBoundingClientRect().height ?? 0;
      const noScroll = window.innerHeight - top - inPanel - pagePadding,
        clearOfFooter = window.innerHeight - footer - FOOTER_GAP - top - inPanel;
      setHeight(Math.max(MIN_HEIGHT, Math.floor(Math.min(noScroll, clearOfFooter))));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stage]);
  return height;
}

/**
 * A stage: as tall as the window allows; the decal covers it (centred up and down), from its left edge, slid left only
 * as far as its nodes need to stay inside the right edge (`right`, a fraction of the decal's width; the hero cut on the
 * left then). The children are placed on the decal.
 */
export function StageFrame({ stage, right, children }: { stage: HeroStage; right: number; children: ReactNode }) {
  const element = useRef<HTMLDivElement>(null);
  const height = useStageHeight(element);
  // Cover: as tall as the stage or as wide, whichever is larger.
  const decalHeight = `${SCALE} * max(100cqh, 100cqw / ${stage.ratio})`,
    width = `${decalHeight} * ${stage.ratio}`;
  const decal: CSSProperties = {
    height: `calc(${decalHeight})`,
    width: `calc(${width})`,
    top: `calc((100cqh - ${decalHeight}) / 2)`,
    // Centred when narrower than the stage; else from its left edge, as far left as its nodes need; then the stage's shift.
    left: `calc(max(min(0px, calc(100cqw - ${width})), min(max(0px, calc((100cqw - ${width}) / 2)), calc(100cqw - ${right} * ${width}))) - ${stage.shift ?? 0} * ${width})`,
  };
  return (
    <div
      ref={element}
      className="relative w-full overflow-hidden rounded [container-type:size]"
      style={height ? { height } : { aspectRatio: stage.ratio }}
      data-trait-stage=""
    >
      <img
        src={stage.image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-110 object-cover object-right opacity-70 blur-2xl"
      />
      <div className="absolute" style={decal}>
        <img src={stage.image} alt="" aria-hidden="true" className="absolute inset-0 size-full" />
        {children}
      </div>
    </div>
  );
}

/** A tiers stage (hero-stages.ts): the base trait, and per level a memory between its two trait choices. */
export function TraitStage({ stage, tiers }: { stage: TierStage; tiers: TraitTiersView }) {
  const right = (stage.columns[stage.columns.length - 1] + stage.node) / 100;
  return (
    <StageFrame stage={stage} right={right}>
      <StageNodes stage={stage} tiers={tiers} base={tiers.base.trait} />
    </StageFrame>
  );
}

/** The base trait, and each tier's memory and choices, on the decal. */
function StageNodes({
  stage,
  tiers,
  base,
}: {
  stage: TierStage;
  tiers: TraitTiersView;
  base: TraitTiersView["base"]["trait"];
}) {
  return (
    <>
      <Node {...stage.base}>
        <HeroTraitTooltip name={base.name} levelKey="base" selected>
          <button
            type="button"
            className="selected size-full cursor-pointer border-0 bg-transparent p-0"
            aria-label={base.name}
            aria-pressed="true"
          >
            <Artwork src={base.art} alt={base.name} className={STAGE_BASE} />
          </button>
        </HeroTraitTooltip>
      </Node>
      {tiers.tiers.map((tier, column) => {
        const x = stage.columns[column];
        const group = tier.groups[0];
        return (
          <Fragment key={tier.level}>
            <span className={STAGE_LEVEL} style={{ left: `${x}%`, top: `${stage.rows.level}%` }}>
              {`Lv ${tier.level}`}
            </span>
            <Node x={x} y={stage.rows.memory} size={stage.node}>
              <MemorySocket socket={tier.memory} look={STAGE_MEMORY} />
            </Node>
            {group.choices.map((choice, index) => (
              <Node key={choice.name} x={x} y={index ? stage.rows.bottom : stage.rows.top} size={stage.node}>
                <StageChoice choice={choice} selectionKey={group.selectionKey} />
                {choice.selected ? <PickedCheck /> : null}
              </Node>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

/** A tier's trait choice: a hexagon, in the accent once picked. */
function StageChoice({ choice, selectionKey }: { choice: ChoiceGroupView["choices"][number]; selectionKey: string }) {
  return (
    <HeroTraitTooltip name={choice.name} levelKey={choice.levelKey} selected={choice.selected}>
      <button
        type="button"
        className={`${choice.selected ? "selected " : ""}${STAGE_CHOICE} ${choice.selected ? STAGE_CHOICE_PICKED : STAGE_CHOICE_OTHER}`}
        aria-label={choice.name}
        aria-pressed={choice.selected}
        onClick={() => plannerCommands().pickHeroTrait(selectionKey, choice.name)}
      >
        <Artwork src={choice.art} alt={choice.name} className={STAGE_CHOICE_ART} />
      </button>
    </HeroTraitTooltip>
  );
}

/** The check under a picked trait, as the game marks it (outside the hexagon, which clips its own content). */
export function PickedCheck() {
  return (
    <span className={STAGE_CHECK} aria-hidden="true">
      <StrokeIcon className="size-[70%] stroke-[3]">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </StrokeIcon>
    </span>
  );
}
