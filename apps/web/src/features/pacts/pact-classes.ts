// The Pactspirits section's drawing as utility class lists: the slot surface per rarity, the LEVEL select, the tree
// nodes' rings by state, and the Kismet drag ghost. PactsSection.tsx picks them from the view's data.
import type { ExtraSlotView, PactNodeView } from "@legacy/app/bridge/pacts-view-model.ts";

// The slot's palette by Pactspirit rarity: accent (name), border, glow (left of the gradient) and dark (its middle).
const RARITY_VARS: Readonly<Record<string, string>> = {
  magic: "[--pact-accent:#69d6f5] [--pact-border:#278bae] [--pact-glow:#173c51] [--pact-dark:#101f2b]",
  rare: "[--pact-accent:#e0a1f5] [--pact-border:#a45cc1] [--pact-glow:#40234e] [--pact-dark:#21172d]",
  legendary: "[--pact-accent:#ffd084] [--pact-border:#b87934] [--pact-glow:#49301c] [--pact-dark:#241b16]",
};
const PLAIN_VARS = "[--pact-accent:#f9ca65] [--pact-border:#293342] [--pact-glow:#151b23] [--pact-dark:#151b23]";

/** A pact slot's card: dark, tinted by the Pactspirit's rarity once filled. */
export const slotSurface = (rarity: string | undefined) =>
  `${(rarity && RARITY_VARS[rarity.toLowerCase()]) || PLAIN_VARS} rounded-[10px] border border-(--pact-border) ` +
  "bg-[linear-gradient(100deg,var(--pact-glow),var(--pact-dark)_46%,#151b23)]";

/** A filled slot's portrait frame. */
export const FILLED_PORTRAIT = "bg-[linear-gradient(145deg,var(--pact-border),var(--pact-dark))]";

/** The LEVEL label: a gold chevron drawn over the select's right end. */
export const LEVEL_LABEL =
  "relative grid w-21 gap-1.25 text-[0.66rem] font-extrabold tracking-[0.09em] text-gold uppercase " +
  "after:pointer-events-none after:absolute after:right-3 after:bottom-3.5 after:box-content after:size-1.5 " +
  "after:rotate-45 after:border-r-2 after:border-b-2 after:border-gold after:content-['']";

/** The LEVEL select: bronze frame, no native arrow. */
export const LEVEL_SELECT =
  "min-h-8.5 w-full cursor-pointer appearance-none rounded border border-[#a77a3d] " +
  "bg-[linear-gradient(180deg,#30302c,#171d23)] py-1.25 pr-6 pl-2.5 font-[Arial,sans-serif] text-[0.8rem]/[normal] " +
  "font-bold tracking-normal text-[#fff0c2] normal-case " +
  "shadow-[inset_0_1px_rgb(255_239_190/0.14),0_2px_6px_rgb(0_0_0/0.22)] hover:border-gold " +
  "focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

// Every node: round, on the slot colour, joined to the previous node by a short grey line.
const NODE_BASE =
  "relative z-1 grid flex-none place-items-center rounded-full bg-[#151b23] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffae69] " +
  "not-first:before:pointer-events-none not-first:before:absolute not-first:before:top-[calc(50%-1px)] " +
  "not-first:before:-left-4.5 not-first:before:-z-1 not-first:before:h-0.5 not-first:before:w-4.5 " +
  "not-first:before:bg-[#4b5664] not-first:before:content-['']";
const RING_SIZE: Readonly<Record<string, string>> = { inner: "size-8.5", mid: "size-12", outer: "size-12" };

// The ring around a node, strongest state first. A Kismet and an unlocked Fate node share the violet ring.
const RING = {
  dropTarget: "shadow-[0_0_0_3px_var(--color-gold),0_0_16px_rgb(249_202_101/0.55)]",
  violet: "shadow-[0_0_0_2px_#ae63dc,0_0_12px_#833bae88]",
  allocated: "shadow-[0_0_0_2px_#6ad7a2,0_0_9px_#39b77b66]",
  outer: "shadow-[0_0_0_2px_#ef8b26,0_0_12px_#df782b80]",
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
    craftable && "hover:brightness-116",
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
  "font-[Arial,sans-serif] text-[11px]/none font-bold not-italic " +
  (allocated ? "border-[#6ad7a2] bg-[#176b4a] text-white" : "border-[#8c9aab] bg-[#17212a] text-[#f4f8fb]");

/** An extra Kismet slot from a Fate node: a dashed "+" until a Kismet fills it. */
export function extraClasses(extra: ExtraSlotView, drag: DragState) {
  return [
    "pact-tree-node",
    NODE_BASE,
    extra.kind === "micro" ? RING_SIZE.inner : RING_SIZE.mid,
    extra.hasKismet
      ? "has-kismet"
      : "border-2 border-dashed border-[#778397] font-[Arial,sans-serif] text-[1.2rem]/none font-bold " +
        "text-[#d5e4f3] hover:border-[#ffab67] hover:text-[#ffab67]",
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
  "kismet-drag-ghost pointer-events-none fixed z-1000 grid place-items-center rounded-full border-2 border-[#d6a448] " +
  "bg-[#171d25] p-0.5 shadow-[0_8px_24px_#000b,0_0_12px_rgb(249_202_101/0.35)]";
export const KISMET_DRAG_GHOST_IMAGE = "size-full object-contain";
export const KISMET_DRAG_GHOST_COPY =
  "absolute -right-1.75 -bottom-1.75 hidden size-4.5 place-items-center rounded-full border border-bronze bg-gold " +
  "font-[Arial,sans-serif] text-[14px]/none font-black text-[#241708] in-[.copying]:grid";
