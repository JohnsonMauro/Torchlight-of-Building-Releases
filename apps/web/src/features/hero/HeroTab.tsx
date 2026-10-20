// The HERO tab of the Build page's hero panel: the selected hero with Change Hero, the Hero Trait / Trait Path (or Scent
// Bottle) tabs, and the open tab: the trait tiers with their memory sockets and the base trait's support slots, a tree
// hero's Trait Path board, or Sage's Scent Bottle. A tree hero's picks are dragged between rows. The data is the
// planner's "heroTraits" source (src/app/bridge/hero-traits-view-model.ts); every edit is a planner command, and the
// hero, memory, scent, ammo and support dialogs stay legacy, as do the HERO | FOLLOWER tabs. The legacy hover tooltip
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

/** A right-click that acted (the command says so) keeps the browser's menu closed. */
const rightClick = (event: MouseEvent, act: () => boolean) => {
  if (act()) event.preventDefault();
};

export function HeroShowcase() {
  const view = useViewSource("heroTraits");
  const hero = view?.hero;
  return (
    <div className="hero-showcase">
      <div className="hero-portrait" id="selected-hero-portrait">
        {!view ? null : hero?.image ? (
          <img src={hero.image} alt={hero.name} />
        ) : (
          <span className="hero-avatar-fallback" aria-hidden="true">
            {hero ? hero.name.slice(0, 2).toUpperCase() : "+"}
          </span>
        )}
      </div>
      <div className="hero-identity">
        <span id="selected-hero-name">{view ? (hero?.name ?? "No hero selected") : "Selena"}</span>
        <strong id="selected-hero-trait">{view ? (hero?.trait ?? "Choose a hero trait") : "Sing with the Tide"}</strong>
        <button type="button" className="change-hero-button" onClick={() => plannerCommands().openHeroSelector()}>
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
    <div id="hero-detail-tabs" className="hero-detail-tabs" hidden={!tabs}>
      {(tabs ?? []).map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === view?.activeTab ? "active" : undefined}
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
      ghost.className = "kismet-drag-ghost";
      const image = document.createElement("img");
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
      className="hero-trait-tree"
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
      <div className="hero-traits-pending">
        <strong>Select a hero</strong>
        <span>Choose a hero to configure its base trait, memories, and special trait options.</span>
        <button type="button" className="button" onClick={() => plannerCommands().openHeroSelector()}>
          Choose Hero
        </button>
      </div>
    );
  if (content.kind === "scent") return <ScentBottle scent={content} />;
  if (content.kind === "path") return <TraitPath path={content} />;
  return <TraitTiers tiers={content} drag={drag} />;
}

function ScentBottle({ scent }: { scent: ScentBottleView }) {
  const open = (kind: string) => () => plannerCommands().openScentSlot(kind);
  return (
    <section className="sage-scent-panel">
      <button
        type="button"
        className={`sage-basic-scent ${scent.elixir ? "filled" : ""}`}
        data-sage-scent-tooltip={scent.elixir ? "elixir" : undefined}
        onClick={open("elixir")}
      >
        {scent.elixir ? (
          <>
            <img src={scent.elixir.icon} alt="" />
            <strong>{scent.elixir.name}</strong>
            <small>{scent.elixir.tags.join(" · ")}</small>
          </>
        ) : (
          <b>+</b>
        )}
      </button>
      <div className="sage-scent-divider">Basic Scent</div>
      {scent.ingredients.map((slot) => (
        <button
          key={slot.kind}
          type="button"
          className={`sage-ingredient-slot ${slot.filled ? "filled" : ""}`}
          data-sage-scent-tooltip={slot.ingredient ? slot.kind : undefined}
          onClick={open(slot.kind)}
        >
          <span>{slot.label}</span>
          <b>{slot.ingredient ? <img src={slot.ingredient.icon} alt="" /> : "+"}</b>
          {slot.ingredient ? <small>{slot.ingredient.name}</small> : null}
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
    <section className="selena-dance-tree">
      <header>
        <span>Hero trait path</span>
        <strong>{`${path.picked}/${path.capacity} selected`}</strong>
      </header>
      <div
        className="selena-dance-tree-board"
        ref={board}
        style={layout ? { minHeight: `${layout.height}px` } : undefined}
      >
        <svg
          viewBox={layout && size ? `0 0 ${size.width} ${size.height}` : "0 0 400 275"}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {lines.map((line) => (
            <line
              key={line.key}
              className={line.active ? "active" : ""}
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
              className={`selena-dance-node ${node.base ? "base" : ""} ${node.selected ? "selected" : ""} ${node.locked ? "locked" : ""}`}
              style={style}
              disabled={node.locked}
              data-hero-trait-tooltip={node.name}
              data-hero-trait-level-key={node.levelKey}
              aria-pressed={node.selected}
              onClick={() => {
                if (!node.base) plannerCommands().toggleTraitPathNode(node.name);
              }}
            >
              <Artwork src={node.art} alt={node.name} className="selena-dance-node-art" />
              <span>{node.caption}</span>
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
  const rowClass = (row: number | null) => {
    if (row === null || draggedFrom === null || row === draggedFrom) return "";
    const eligible = (tiers.rowMoves[draggedFrom] ?? []).includes(row);
    return `${eligible ? " selena-dance-drop-eligible" : " selena-dance-drop-blocked"}${eligible && drag.target === String(row) ? " selena-dance-drop-target" : ""}`;
  };
  const pickButton = (pick: TraitView, row: number) => (
    <button
      type="button"
      className={`hero-choice selected selena-dance-pick${draggedFrom === row ? " selena-dance-drag-source" : ""}`}
      data-hero-trait-tooltip={pick.name}
      data-hero-trait-level-key={pick.levelKey}
      aria-label={pick.name}
      aria-pressed="true"
      onPointerDown={(event) => drag.start(event, String(row), row)}
    >
      <Artwork src={pick.art} alt={pick.name} className="hero-choice-art" />
    </button>
  );
  const traitButton = (
    <button
      type="button"
      className="hero-choice selected"
      data-hero-trait-tooltip={base.trait.name}
      data-hero-trait-level-key="base"
      aria-label={base.trait.name}
      aria-pressed="true"
    >
      <Artwork src={base.trait.art} alt={base.trait.name} className="hero-choice-art" />
    </button>
  );
  const supports = base.supports ? <SupportSlots slots={base.supports} /> : null;
  return (
    <>
      <div
        className={`hero-tier base-tier ${base.supports ? "carino-base-tier" : ""} ${base.memory ? "has-base-memory" : ""}`}
      >
        <TierLevel level={1} />
        {base.memory ? (
          <>
            <MemorySocket socket={base.memory} base />
            <span className="tier-divider" />
            <div className="base-trait-contents">
              {traitButton}
              {supports}
            </div>
          </>
        ) : (
          <>
            {traitButton}
            {supports}
          </>
        )}
      </div>
      {tiers.tiers.map((tier) => {
        const memory = <MemorySocket socket={tier.memory} />;
        if (tier.row !== null) {
          if (!tier.pick)
            return (
              <div
                key={tier.level}
                className={`hero-tier hero-memory-only-tier${rowClass(tier.row)}`}
                data-selena-dance-row={tier.row}
              >
                <TierLevel level={tier.level} />
                {memory}
              </div>
            );
          return (
            <div key={tier.level} className={`hero-tier${rowClass(tier.row)}`} data-selena-dance-row={tier.row}>
              <TierLevel level={tier.level} />
              {memory}
              <span className="tier-divider" />
              <div className="hero-tier-choices">{pickButton(tier.pick, tier.row)}</div>
            </div>
          );
        }
        return (
          <div key={tier.level} className={`hero-tier ${tiers.dual ? "dual-trait-tier" : ""}`}>
            <TierLevel level={tier.level} />
            {memory}
            <span className="tier-divider" />
            <div className="hero-tier-choices">
              {tiers.dual ? (
                tier.groups.map((group) => (
                  <div
                    key={group.selectionKey}
                    className={`hero-trait-choice-group ${group.position}`}
                    aria-label={group.label ?? undefined}
                  >
                    <Choices group={group} />
                  </div>
                ))
              ) : (
                <Choices group={tier.groups[0]} />
              )}
            </div>
          </div>
        );
      })}
      {tiers.extraRow ? (
        <div
          className={`hero-tier ${tiers.extraRow.pick ? "" : "hero-memory-only-tier "}tree-extra-row${rowClass(tiers.extraRow.row)}`}
          data-selena-dance-row={tiers.extraRow.row}
          data-tree-extra-row-tooltip=""
          aria-label={tiers.extraRow.label}
        >
          <span className="tier-level tier-level-max">
            <strong>{tiers.extraRow.level}</strong>
            <small>MAX</small>
          </span>
          <span className="tree-extra-row-chip">{tiers.extraRow.chip.replace(" ", " ")}</span>
          {tiers.extraRow.pick ? (
            <>
              <span className="tier-divider" />
              <div className="hero-tier-choices">{pickButton(tiers.extraRow.pick, tiers.extraRow.row)}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function TierLevel({ level }: { level: number }) {
  return (
    <span className="tier-level">
      <small>LVL</small>
      <strong>{level}</strong>
    </span>
  );
}

function Choices({ group }: { group: ChoiceGroupView }) {
  return group.choices.map((choice) => (
    <button
      key={choice.name}
      type="button"
      className={`hero-choice ${choice.selected ? "selected" : ""}`}
      data-hero-trait-tooltip={choice.name}
      data-hero-trait-level-key={choice.levelKey}
      aria-label={choice.name}
      aria-pressed={choice.selected}
      onClick={() => plannerCommands().pickHeroTrait(group.selectionKey, choice.name)}
    >
      <Artwork src={choice.art} alt={choice.name} className="hero-choice-art" />
    </button>
  ));
}

function MemorySocket({ socket, base = false }: { socket: MemorySocketView; base?: boolean }) {
  const memory = socket.memory;
  const classes = base
    ? `hero-memory-socket base-memory-socket ${memory ? `filled memory-rarity-${memory.rarity}` : ""}`
    : `hero-memory-socket ${memory ? "filled" : ""} ${memory?.rarity ? `memory-rarity-${memory.rarity}` : ""}`;
  return (
    <button
      type="button"
      className={classes}
      data-memory-tier={socket.tier}
      aria-label={socket.label}
      onClick={() => plannerCommands().openMemorySocket(socket.tier)}
      onContextMenu={(event) => rightClick(event, () => plannerCommands().removeMemory(socket.tier))}
    >
      {memory ? (
        <>
          <Artwork src={memory.art} alt={memory.name} className="hero-memory-art" />
          {memory.revivedId ? <RevivalBadge id={memory.revivedId} /> : null}
        </>
      ) : (
        <b>+</b>
      )}
    </button>
  );
}

// The moon on a revived memory's socket.
function RevivalBadge({ id }: { id: string }) {
  const symbol = `memory-moon-${id.replace(/[^a-z0-9_-]/gi, "")}`;
  return (
    <span className="hero-memory-revival-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <defs>
          <linearGradient id={`${symbol}-shine`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".52" stopColor="#c9efff" />
            <stop offset="1" stopColor="#65bdf0" />
          </linearGradient>
          <mask id={`${symbol}-cut`} maskUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fff" />
            <circle cx="14.9" cy="9" r="5.9" fill="#000" />
          </mask>
        </defs>
        <circle className="moon-disc" cx="12" cy="12" r="10.2" />
        <circle
          className="moon-crescent"
          cx="12"
          cy="12"
          r="6.7"
          fill={`url(#${symbol}-shine)`}
          mask={`url(#${symbol}-cut)`}
        />
      </svg>
    </span>
  );
}

function SupportSlots({ slots }: { slots: SupportSlotsView }) {
  const carino = slots.kind === "carino";
  return (
    <div
      className={carino ? "carino-ammo-slots" : "carino-ammo-slots hero-trait-support-slot"}
      aria-label={slots.label}
    >
      {slots.slots.map((slot) => (
        <button
          key={slot.index}
          type="button"
          className={`carino-ammo-slot ${slot.support ? "filled" : ""}${carino ? ` ${slot.locked ? "locked" : ""}` : ""}`}
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
          {slot.support ? (
            <Artwork src={slot.support.icon} alt={slot.support.name} className="carino-ammo-art" />
          ) : (
            <b>+</b>
          )}
        </button>
      ))}
    </div>
  );
}
