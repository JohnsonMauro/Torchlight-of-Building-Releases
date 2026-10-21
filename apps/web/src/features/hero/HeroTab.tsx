// The hero: its showcase (portrait, name, main trait, Change Hero) heads the character column beside the build's tabs,
// and the Hero Trait tab holds the Hero Trait / Trait Path (or Scent Bottle) tabs and the open one: the trait tiers with
// their memory sockets and the base trait's support slots, a tree hero's Trait Path board, or Sage's Scent Bottle. A
// tree hero's picks are dragged between rows. The hero is picked when a build is created, and changed from the showcase
// or from the build's details (Builds view). The data is the planner's "heroTraits" source
// (src/app/bridge/hero-traits-view-model.ts); every edit is a planner command, and the hero, memory, scent, ammo and
// support dialogs stay legacy. The legacy hover tooltip
// reads data-hero-trait-tooltip with data-hero-trait-level-key, .hero-memory-socket.filled with data-memory-tier,
// data-support-tooltip with data-parent-skill and data-carino-support-slot, data-hero-trait-support-id,
// data-tree-extra-row-tooltip and data-sage-scent-tooltip, so they stay.
import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  ChoiceGroupView,
  HeroTraitsView,
  MemorySocketView,
  ScentBottleView,
  SupportSlotsView,
  TraitPathView,
  TraitTiersView,
  TraitView,
} from "@legacy/app/bridge/hero-traits-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { KISMET_DRAG_GHOST, KISMET_DRAG_GHOST_IMAGE } from "../pacts/pact-classes";
import {
  changeButton,
  choiceArt,
  choiceButton,
  choicesClass,
  chooseButton,
  dropBlocked,
  dropEligible,
  dropTarget,
  detailTab,
  identityClass,
  identityName,
  identityTitle,
  memoryArt,
  memoryEmpty,
  memoryOnlyRow,
  memorySocket,
  pathNodeArt,
  pendingClass,
  portraitClass,
  portraitFallback,
  portraitImage,
  showcaseClass,
  supportArt,
  supportSlot,
  supportSlots,
  tierDivider,
  tierLevelClass,
  tierRow,
} from "./hero-classes";

/** A right-click that acted (the command says so) keeps the browser's menu closed. */
const rightClick = (event: MouseEvent, act: () => boolean) => {
  if (act()) event.preventDefault();
};

export function HeroShowcase() {
  const view = useViewSource("heroTraits");
  const hero = view?.hero;
  return (
    <div className={showcaseClass}>
      <div className={portraitClass} id="selected-hero-portrait">
        {!view ? null : hero?.image ? (
          <img className={portraitImage()} src={hero.image} alt={hero.name} />
        ) : (
          <span className={portraitFallback} aria-hidden="true">
            {hero ? hero.name.slice(0, 2).toUpperCase() : "+"}
          </span>
        )}
      </div>
      <div className={identityClass}>
        <span id="selected-hero-name" className={identityName}>
          {view ? (hero?.name ?? "No hero selected") : "Selena"}
        </span>
        <strong id="selected-hero-trait" className={identityTitle}>
          {view ? (hero?.trait ?? "Choose a hero trait") : "Sing with the Tide"}
        </strong>
        <button
          type="button"
          className={`change-hero-button ${changeButton}`}
          onClick={() => plannerCommands().openHeroSelector()}
        >
          Change Hero
        </button>
      </div>
    </div>
  );
}

export function HeroDetailTabs() {
  const view = useViewSource("heroTraits");
  const tabs = view?.tabs ?? null;
  return (
    <div
      id="hero-detail-tabs"
      className="hero-detail-tabs mx-2.5 mt-2 grid grid-cols-2 border-b border-line"
      hidden={!tabs}
    >
      {(tabs ?? []).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${tab.id === view?.activeTab ? "active " : ""}${detailTab}`}
          onClick={() => plannerCommands().setHeroDetailTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function HeroTraitTree() {
  const view = useViewSource("heroTraits");
  const pickDrag = usePointerDrag<number>({
    targetAt: (element) =>
      element?.closest("#hero-trait-tree [data-selena-dance-row]")?.getAttribute("data-selena-dance-row") ?? null,
    ghost: (element) => {
      const ghost = document.createElement("div");
      ghost.className = KISMET_DRAG_GHOST;
      const image = document.createElement("img");
      image.className = KISMET_DRAG_GHOST_IMAGE;
      image.src = element.querySelector("img")?.getAttribute("src") ?? "";
      image.alt = "";
      ghost.append(image);
      // Centred on the pointer, at the pick's size.
      ghost.style.width = `${element.offsetWidth}px`;
      ghost.style.height = `${element.offsetHeight}px`;
      ghost.style.margin = `${-element.offsetHeight / 2}px 0 0 ${-element.offsetWidth / 2}px`;
      return ghost;
    },
    onStart: () => plannerCommands().hideTooltip(),
    onDrop: (from, row) => plannerCommands().moveTraitPick(from, Number(row)),
    onInvalidDrop: (from) => plannerCommands().moveTraitPick(from, null),
  });
  return (
    <div
      id="hero-trait-tree"
      className="hero-trait-tree @container grid gap-2 border-t border-line p-2.5 min-[1101px]:has-[.dual-trait-tier]:max-h-[350px] min-[1101px]:has-[.dual-trait-tier]:overflow-y-auto min-[1101px]:has-[.dual-trait-tier]:overscroll-contain"
      aria-label={view ? view.label : "Selena hero traits and memories"}
    >
      {view ? <TreeContent view={view} drag={pickDrag} /> : null}
    </div>
  );
}

type PickDrag = ReturnType<typeof usePointerDrag<number>>;

function TreeContent({ view, drag }: { view: HeroTraitsView; drag: PickDrag }) {
  const content = view.content;
  if (!content)
    return (
      <div className={pendingClass}>
        <strong>Select a hero</strong>
        <span>Choose a hero to configure its base trait, memories, and special trait options.</span>
        <button type="button" className={chooseButton} onClick={() => plannerCommands().openHeroSelector()}>
          Choose Hero
        </button>
      </div>
    );
  if (content.kind === "scent") return <ScentBottle scent={content} />;
  if (content.kind === "path") return <TraitPath path={content} />;
  return <TraitTiers tiers={content} drag={drag} />;
}

// Sage's Scent Bottle: the elixir on top, the three ingredient slots under an accent rule.
const scentSlot =
  "cursor-pointer rounded border border-line bg-raised hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const scentPlus = "grid place-items-center border-2 border-dashed border-line-strong bg-sunken text-base text-accent";

function ScentBottle({ scent }: { scent: ScentBottleView }) {
  const open = (kind: string) => () => plannerCommands().openScentSlot(kind);
  return (
    <section className="sage-scent-panel grid gap-2.25 p-3">
      <button
        type="button"
        className={`sage-basic-scent ${scent.elixir ? "filled min-h-32" : "min-h-23"} ${scentSlot} grid justify-items-center gap-1.5 p-4.5 text-accent`}
        data-sage-scent-tooltip={scent.elixir ? "elixir" : undefined}
        onClick={open("elixir")}
      >
        {scent.elixir ? (
          <>
            <img
              className="size-[62px] rounded border border-line-strong bg-sunken object-contain"
              src={scent.elixir.icon}
              alt=""
            />
            <strong className="text-xs uppercase">{scent.elixir.name}</strong>
            <small className="text-muted">{scent.elixir.tags.join(" · ")}</small>
          </>
        ) : (
          <b className={`${scentPlus} size-[43px] rounded-lg`}>+</b>
        )}
      </button>
      <div className="border-b border-accent pb-2 text-center text-xs font-bold tracking-wider text-accent uppercase">
        Basic Scent
      </div>
      {scent.ingredients.map((slot) => (
        <button
          key={slot.kind}
          type="button"
          className={`${slot.filled ? "filled " : ""}${scentSlot} grid min-h-18 grid-cols-[1fr_58px] items-center gap-1 px-2.5 py-2 text-left text-text`}
          data-sage-scent-tooltip={slot.ingredient ? slot.kind : undefined}
          onClick={open(slot.kind)}
        >
          <span>{slot.label}</span>
          <b
            className={`${scentPlus} col-start-2 row-[1/span_2] size-[54px] overflow-hidden rounded-full ${slot.filled ? "border-solid border-accent text-center text-[10px] text-text" : ""}`}
          >
            {slot.ingredient ? <img className="block size-12 object-contain" src={slot.ingredient.icon} alt="" /> : "+"}
          </b>
          {slot.ingredient ? (
            <small className="max-w-[135px] text-[10px] text-muted">{slot.ingredient.name}</small>
          ) : null}
        </button>
      ))}
    </section>
  );
}

function TraitPath({ path }: { path: TraitPathView }) {
  const board = useRef<HTMLDivElement>(null);
  // The board is laid out at its width (src/engine/heroes/hero-trait-tree.js treeBoardLayout) once measured; a hidden
  // board (0 px wide) keeps the tree's own layout in % until it shows.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const element = board.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      if (width)
        setSize((old) =>
          old?.width === width && old.height === element.clientHeight ? old : { width, height: element.clientHeight },
        );
    };
    measure();
    if (typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layout = size ? path.layoutAt(size.width) : null;
  const position = new Map((layout ?? path.initial).nodes.map((node) => [node.name, node]));
  const lines = layout ? layout.lines : path.initial.lines;
  return (
    <section className="selena-dance-tree overflow-hidden rounded-md border border-line bg-sunken">
      <header className="flex items-center justify-between border-b border-line px-2.5 py-2 text-[10px] tracking-wider text-accent uppercase">
        <span>Hero trait path</span>
        <strong>{`${path.picked}/${path.capacity} selected`}</strong>
      </header>
      <div
        className="relative h-[275px] pb-4.5"
        ref={board}
        style={layout ? { minHeight: `${layout.height}px` } : undefined}
      >
        <svg
          className="absolute inset-0 size-full overflow-visible"
          viewBox={layout && size ? `0 0 ${size.width} ${size.height}` : "0 0 400 275"}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {lines.map((line) => (
            <line
              key={line.key}
              className={`stroke-2 ${line.active ? "stroke-accent-strong" : "stroke-line-strong"}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
            />
          ))}
        </svg>
        {path.nodes.map((node) => {
          const at = position.get(node.name);
          const style = {
            "--node-x": layout ? `${at?.x}px` : `${at?.x}%`,
            "--node-y": `${at?.y}px`,
          } as CSSProperties;
          return (
            <button
              key={node.name}
              type="button"
              className={`selena-dance-node ${node.base ? "base" : ""} ${node.selected ? "selected" : ""} ${node.locked ? "locked" : ""} group/node absolute top-(--node-y) left-(--node-x) grid w-[54px] -translate-1/2 cursor-pointer justify-items-center gap-0.5 border-0 bg-transparent p-0 text-muted focus-visible:outline-0 off:cursor-not-allowed off:opacity-28 off:grayscale`}
              style={style}
              disabled={node.locked}
              data-hero-trait-tooltip={node.name}
              data-hero-trait-level-key={node.levelKey}
              aria-pressed={node.selected}
              onClick={() => {
                if (!node.base) plannerCommands().toggleTraitPathNode(node.name);
              }}
            >
              <Artwork src={node.art} alt={node.name} className={pathNodeArt(node)} />
              <span
                className={`rounded-md px-1.25 py-px text-[10px] ${node.selected ? "bg-accent-strong text-on-accent" : "bg-raised text-muted"}`}
              >
                {node.caption}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TraitTiers({ tiers, drag }: { tiers: TraitTiersView; drag: PickDrag }) {
  const { base } = tiers;
  const draggedFrom = drag.source === null ? null : Number(drag.source);
  // While a pick is dragged, the other rows show whether it may land there.
  const dropClass = (row: number | null) => {
    if (row === null || draggedFrom === null || row === draggedFrom) return "";
    if (!(tiers.rowMoves[draggedFrom] ?? []).includes(row)) return dropBlocked;
    return drag.target === String(row) ? dropTarget : dropEligible;
  };
  const pickButton = (pick: TraitView, row: number) => (
    <button
      type="button"
      className={`selected ${choiceButton} touch-none ${draggedFrom === row ? "cursor-grabbing opacity-45" : "cursor-grab"}`}
      data-hero-trait-tooltip={pick.name}
      data-hero-trait-level-key={pick.levelKey}
      aria-label={pick.name}
      aria-pressed="true"
      onPointerDown={(event) => drag.start(event, String(row), row)}
    >
      <Artwork src={pick.art} alt={pick.name} className={choiceArt(true)} />
    </button>
  );
  const traitButton = (
    <button
      type="button"
      className={`selected ${choiceButton} cursor-pointer`}
      data-hero-trait-tooltip={base.trait.name}
      data-hero-trait-level-key="base"
      aria-label={base.trait.name}
      aria-pressed="true"
    >
      <Artwork src={base.trait.art} alt={base.trait.name} className={choiceArt(true)} />
    </button>
  );
  const supports = base.supports ? <SupportSlots slots={base.supports} /> : null;
  return (
    <>
      {/* The base trait sits where the memories are; with its own memory, or with support slots, after the divider. */}
      <div className={tierRow}>
        <TierLevel level={1} />
        {base.memory ? (
          <>
            <MemorySocket socket={base.memory} />
            <span className={tierDivider} />
            <div className={choicesClass}>
              {traitButton}
              {supports}
            </div>
          </>
        ) : supports ? (
          <div className="col-[2/-1] flex min-w-0 items-center gap-2.5">
            {traitButton}
            {supports}
          </div>
        ) : (
          traitButton
        )}
      </div>
      {tiers.tiers.map((tier) => {
        const memory = <MemorySocket socket={tier.memory} />;
        if (tier.row !== null) {
          if (!tier.pick)
            return (
              <div
                key={tier.level}
                className={`${memoryOnlyRow} ${dropClass(tier.row)}`}
                data-selena-dance-row={tier.row}
              >
                <TierLevel level={tier.level} />
                {memory}
              </div>
            );
          return (
            <div key={tier.level} className={`${tierRow} ${dropClass(tier.row)}`} data-selena-dance-row={tier.row}>
              <TierLevel level={tier.level} />
              {memory}
              <span className={tierDivider} />
              <div className={choicesClass}>{pickButton(tier.pick, tier.row)}</div>
            </div>
          );
        }
        return (
          <div key={tier.level} className={`${tiers.dual ? "dual-trait-tier " : ""}${tierRow}`}>
            <TierLevel level={tier.level} />
            {memory}
            <span className={tierDivider} />
            {tiers.dual ? (
              <div className="grid min-w-0 gap-1.75 self-stretch">
                {tier.groups.map((group) => (
                  <div
                    key={group.selectionKey}
                    className={`${choicesClass} ${group.position === "lower" ? "border-t border-line pt-1.75" : ""}`}
                    aria-label={group.label ?? undefined}
                  >
                    <Choices group={group} dual />
                  </div>
                ))}
              </div>
            ) : (
              <div className={choicesClass}>
                <Choices group={tier.groups[0]} />
              </div>
            )}
          </div>
        );
      })}
      {tiers.extraRow ? (
        <div
          className={`${tiers.extraRow.pick ? tierRow : memoryOnlyRow} ${dropClass(tiers.extraRow.row)}`}
          data-selena-dance-row={tiers.extraRow.row}
          data-tree-extra-row-tooltip=""
          aria-label={tiers.extraRow.label}
        >
          <span className={tierLevelClass}>
            <strong>{tiers.extraRow.level}</strong>
            <small>MAX</small>
          </span>
          <span className="max-w-[55px] justify-self-center rounded-md border border-accent bg-accent/15 px-1.25 py-0.75 text-center text-[10px] leading-tight font-bold text-accent">
            {tiers.extraRow.chip.replace(" ", " ")}
          </span>
          {tiers.extraRow.pick ? (
            <>
              <span className={tierDivider} />
              <div className={choicesClass}>{pickButton(tiers.extraRow.pick, tiers.extraRow.row)}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function TierLevel({ level }: { level: number }) {
  return (
    <span className={tierLevelClass}>
      <small>LVL</small>
      <strong>{level}</strong>
    </span>
  );
}

function Choices({ group, dual = false }: { group: ChoiceGroupView; dual?: boolean }) {
  return group.choices.map((choice) => (
    <button
      key={choice.name}
      type="button"
      className={`${choice.selected ? "selected " : "opacity-70 "}${choiceButton} cursor-pointer`}
      data-hero-trait-tooltip={choice.name}
      data-hero-trait-level-key={choice.levelKey}
      aria-label={choice.name}
      aria-pressed={choice.selected}
      onClick={() => plannerCommands().pickHeroTrait(group.selectionKey, choice.name)}
    >
      <Artwork src={choice.art} alt={choice.name} className={choiceArt(choice.selected, dual)} />
    </button>
  ));
}

function MemorySocket({ socket }: { socket: MemorySocketView }) {
  const memory = socket.memory;
  return (
    <button
      type="button"
      className={`hero-memory-socket ${memory ? "filled " : ""}${memorySocket}`}
      data-memory-tier={socket.tier}
      aria-label={socket.label}
      onClick={() => plannerCommands().openMemorySocket(socket.tier)}
      onContextMenu={(event) => rightClick(event, () => plannerCommands().removeMemory(socket.tier))}
    >
      {memory ? (
        <>
          <Artwork src={memory.art} alt={memory.name} className={memoryArt(memory.rarity)} />
          {memory.revivedId ? <RevivalBadge id={memory.revivedId} /> : null}
        </>
      ) : (
        <b className={memoryEmpty}>+</b>
      )}
    </button>
  );
}

// The moon on a revived memory's socket.
function RevivalBadge({ id }: { id: string }) {
  const symbol = `memory-moon-${id.replace(/[^a-z0-9_-]/gi, "")}`;
  return (
    <span
      className="pointer-events-none absolute -top-1.25 -left-1 z-2 grid size-[23px] place-items-center rounded-full border border-info bg-surface"
      aria-hidden="true"
    >
      <svg className="block size-5" viewBox="0 0 24 24" focusable="false">
        <defs>
          {/* The mask's white keeps, its black cuts the crescent: luminance, not colour. */}
          <mask id={`${symbol}-cut`} maskUnits="userSpaceOnUse">
            <rect className="fill-white" width="24" height="24" />
            <circle className="fill-black" cx="14.9" cy="9" r="5.9" />
          </mask>
        </defs>
        <circle className="fill-info" cx="12" cy="12" r="6.7" mask={`url(#${symbol}-cut)`} />
      </svg>
    </span>
  );
}

function SupportSlots({ slots }: { slots: SupportSlotsView }) {
  const carino = slots.kind === "carino";
  return (
    <div className={supportSlots} aria-label={slots.label}>
      {slots.slots.map((slot) => (
        <button
          key={slot.index}
          type="button"
          className={`${slot.support ? "filled " : ""}${carino && slot.locked ? "locked " : ""}${supportSlot(Boolean(slot.support))}`}
          data-support-tooltip={slot.support?.name}
          data-parent-skill={carino && slot.support ? "Special Ammo" : undefined}
          data-carino-support-slot={carino && slot.support ? slot.index : undefined}
          data-hero-trait-support-id={!carino && slot.support ? slots.heroId : undefined}
          disabled={slot.locked}
          title={slot.title}
          aria-label={slot.label}
          onClick={() =>
            carino ? plannerCommands().openCarinoAmmo(slot.index) : plannerCommands().openHeroTraitSupport(slots.heroId)
          }
          onContextMenu={(event) => {
            if (!slot.support) return;
            event.preventDefault();
            plannerCommands().hideTooltip();
            if (carino) plannerCommands().removeCarinoAmmo(slot.index);
            else plannerCommands().removeHeroTraitSupport(slots.heroId);
          }}
        >
          {slot.support ? <Artwork src={slot.support.icon} alt={slot.support.name} className={supportArt} /> : <b>+</b>}
        </button>
      ))}
    </div>
  );
}
