// The Pactspirits section's drawing as utility class lists: the slot card, the tree nodes' rings by state, and the
// Kismet drag ghost (the level is apps/web/src/ui/RangeInput.tsx). PactsSection.tsx picks them from the view's data.
import type { ExtraSlotView, PactNodeView } from "@legacy/app/bridge/pacts-view-model.ts";

/** A Pactspirit's tall portrait down a card's left edge, stretched to the card's height and cropped from the top; its
 * width is the caller's (a selector choice: PORTRAIT_STRIP_CARD; the tooltip's head keeps its own height). */
export const PORTRAIT_STRIP = "flex-none self-stretch bg-sunken object-cover object-top";
export const PORTRAIT_STRIP_CARD = `${PORTRAIT_STRIP} min-h-24 w-20`;

// A Pactspirit's or Kismet's rarity as the --pact-tone custom property, which the classes below read.
const RARITY_TONE: Readonly<Record<string, string>> = {
  magic: "[--pact-tone:var(--color-grade-magic)]",
  rare: "[--pact-tone:var(--color-grade-rare)]",
  legendary: "[--pact-tone:var(--color-grade-legendary)]",
};

/** Sets --pact-tone: the rarity's colour, the accent for an unknown one. */
export const rarityTone = (rarity: string | undefined): string =>
  (rarity && RARITY_TONE[rarity.toLowerCase()]) || "[--pact-tone:var(--color-accent)]";

/** A card on the section's panel (the pact slots, the Kismet counts). */
export const CARD = "rounded-md border bg-raised";

/** A pact slot's card: edged in the Pactspirit's rarity once filled. */
export const slotSurface = (filled: boolean) => `${CARD} ${filled ? "border-(--pact-tone)/50" : "border-line"}`;

/** A filled slot's portrait frame. */
export const FILLED_PORTRAIT = "border border-(--pact-tone)/60 bg-sunken";

/** An empty slot's portrait: a dashed "+" that takes the accent on hover and focus. */
export const EMPTY_PORTRAIT =
  "border-2 border-dashed border-line-strong bg-sunken text-2xl leading-none text-muted " +
  "group-hover:border-accent group-hover:text-accent group-focus-visible:border-accent group-focus-visible:text-accent";

// Every node: round, on a well, joined to the previous node by a short line.
const NODE_BASE =
  "relative z-1 grid flex-none place-items-center rounded-full bg-sunken " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "not-first:before:pointer-events-none not-first:before:absolute not-first:before:top-[calc(50%-1px)] " +
  "not-first:before:-left-4.5 not-first:before:-z-1 not-first:before:h-0.5 not-first:before:w-4.5 " +
  "not-first:before:bg-line-strong not-first:before:content-['']";
const RING_SIZE: Readonly<Record<string, string>> = { inner: "size-8.5", mid: "size-12", outer: "size-12" };

// The ring around a node, strongest state first. A Kismet and an unlocked Fate node share the violet ring.
const RING = {
  dropTarget: "ring-3 ring-accent",
  violet: "ring-2 ring-violet",
  allocated: "ring-2 ring-ok",
  outer: "ring-2 ring-accent-strong",
};

/** The node's part in a Kismet drag in progress. */
export interface DragState {
  source: boolean;
  target: boolean;
}

interface NodeState {
  drag: DragState;
  /** Acts on click (allocate, craft, Fate slots): pointer cursor and a brighter hover. */
  craftable: boolean;
  /** Holds a Kismet that can be dragged. */
  draggable: boolean;
  violet: boolean;
  allocated: boolean;
  outer: boolean;
}

function stateClasses({ drag, craftable, draggable, violet, allocated, outer }: NodeState) {
  const ring = drag.target
    ? RING.dropTarget
    : violet
      ? RING.violet
      : allocated
        ? RING.allocated
        : outer
          ? RING.outer
          : "";
  const cursor = drag.source
    ? "kismet-drag-source cursor-grabbing opacity-45"
    : draggable
      ? "cursor-grab"
      : craftable
        ? "cursor-pointer"
        : "cursor-help";
  return [
    ring,
    cursor,
    draggable && "touch-none select-none",
    craftable && "hover:brightness-110",
    drag.target && "kismet-drop-target",
  ];
}

/** A tree node's classes from its data (slot mode makes inner/mid/outer/Fate nodes switchable). */
export function nodeClasses(node: PactNodeView, switchable: boolean, drag: DragState) {
  return [
    "pact-tree-node",
    NODE_BASE,
    RING_SIZE[node.ring] ?? "size-11",
    node.allocated && "allocated",
    node.hasKismet && "has-kismet",
    ...stateClasses({
      drag,
      craftable: switchable || node.fate || node.kismetKind !== null,
      draggable: node.hasKismet && node.kismetKind !== null,
      violet: node.hasKismet || node.fateUnlocked,
      allocated: node.allocated,
      outer: node.ring === "outer",
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Unallocated nodes in slot mode: greyed art. */
export const nodeImage = (dimmed: boolean) => `size-full object-contain${dimmed ? " opacity-40 grayscale" : ""}`;

/** Slot mode's badge at the node's top right: "+" to allocate, a green check once allocated. */
export const nodeStatus = (allocated: boolean) =>
  "pointer-events-none absolute -top-1.75 -right-1.25 z-2 grid size-4.25 place-items-center rounded-full border " +
  "text-[10px]/none font-bold not-italic " +
  (allocated ? "border-ok bg-ok text-on-accent" : "border-line-strong bg-raised text-text");

/** An extra Kismet slot from a Fate node: a dashed "+" until a Kismet fills it. */
export function extraClasses(extra: ExtraSlotView, drag: DragState) {
  return [
    "pact-tree-node",
    NODE_BASE,
    extra.kind === "micro" ? RING_SIZE.inner : RING_SIZE.mid,
    extra.hasKismet
      ? "has-kismet"
      : "border-2 border-dashed border-line-strong text-xl/none font-bold text-muted " +
        "hover:border-accent hover:text-accent",
    ...stateClasses({
      drag,
      craftable: true,
      draggable: extra.hasKismet,
      violet: extra.hasKismet,
      allocated: false,
      outer: false,
    }),
  ]
    .filter(Boolean)
    .join(" ");
}

/** The Kismet under the pointer while it is dragged, appended to <body>; its <b> is the "+" shown while copying. */
export const KISMET_DRAG_GHOST =
  "kismet-drag-ghost pointer-events-none fixed z-1000 grid place-items-center rounded-full border-2 border-accent " +
  "bg-surface p-0.5 shadow-lg shadow-shadow";
export const KISMET_DRAG_GHOST_IMAGE = "size-full object-contain";
export const KISMET_DRAG_GHOST_COPY =
  "absolute -right-1.75 -bottom-1.75 hidden size-4.5 place-items-center rounded-full border border-line-strong bg-accent " +
  "text-sm/none font-black text-on-accent in-[.copying]:grid";
