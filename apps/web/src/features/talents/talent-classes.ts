// The talent trees' class lists that depend on state: a node's look from its state classes, the connection lines and
// the prism's area. The states come from the view model as class words (allocated, locked, prism-placement-target…)
// that the tests read off the class list, so no utility here spells one: the look is picked in code from those words
// instead of with class-matching variants. The family tint is shared with the slate dialogs (ui/talent-slate-styles.ts).

/** A connection line: faint where locked, dim where the next node can be taken, info between taken nodes. */
const LINE_LOOKS: Record<string, string> = {
  active: "stroke-info [stroke-width:3]",
  reachable: "stroke-dim [stroke-width:2]",
};
export const lineLook = (state: string): string =>
  `[vector-effect:non-scaling-stroke] ${LINE_LOOKS[state] ?? "stroke-line-strong [stroke-width:2]"}`;

/** The installed prism's area over the stage; an Inverse Image's mirrored area is dashed and fainter. */
export const areaLook = (reflected: boolean): string =>
  `pointer-events-none z-1 m-0.5 place-self-stretch rounded-md border-2 border-violet ${
    reflected ? "border-dashed bg-violet/5" : "bg-violet/10"
  }`;

/** A talent node's look, and its art's and rank badge's. */
export interface NodeLook {
  node: string;
  art: string;
  rank: string;
}

/**
 * A node's look from the view model's state classes and the prism drag. The fill says taken (accent), blocked (sunken)
 * or open (raised); the edge, from strongest to weakest: the drop target of a dragged prism (violet ring), a prism
 * placement target (warm ring, crosshair), a legendary node (warm edge, violet ring inside a prism's area), a node in a
 * prism's area (violet edge). A node under the installed prism hides unless the prism is dragged.
 */
export function nodeLook(classes: string, dropTarget: boolean, prismDragged: boolean): NodeLook {
  const has = new Set(classes.split(" "));
  const allocated = has.has("allocated");
  const locked = !allocated && has.has("locked");
  const legendary = has.has("legendary-node");
  const affected = has.has("prism-affected-node");
  const placing = has.has("prism-placement-target") && !legendary;

  const fill = allocated ? "bg-accent/20 text-text" : locked ? "bg-sunken text-dim" : "bg-raised text-muted";
  const edge = dropTarget
    ? "z-3 border-violet ring-4 ring-violet/50"
    : placing
      ? "border-accent-strong ring-2 ring-accent-strong/40 hover:ring-4 focus-visible:ring-4"
      : legendary && affected
        ? "border-accent-strong ring-2 ring-violet/60"
        : legendary
          ? "border-accent-strong"
          : affected
            ? "border-violet"
            : allocated
              ? "border-accent"
              : locked
                ? "border-line"
                : "border-line-strong hover:border-accent focus-visible:border-accent";
  const hidden = has.has("prism-covered-node") && !prismDragged ? "invisible" : "";

  const art = allocated ? "" : locked ? "opacity-40 grayscale" : legendary ? "opacity-85" : "opacity-70 grayscale-50";
  const rank = allocated
    ? "bg-accent text-on-accent"
    : legendary && affected
      ? "bg-accent-strong/20 text-accent-strong"
      : "border border-line bg-raised text-muted";

  return {
    node: `z-1 pressed:scale-94 ${legendary ? "border-2" : "border"} ${placing ? "cursor-crosshair" : "cursor-pointer"} ${fill} ${edge} ${hidden}`,
    art,
    rank,
  };
}

/** The installed prism over its node: its art in a violet disc, grabbed to move it; lifted while dragged. */
export const prismLook = (dragged: boolean): string =>
  `overflow-visible border border-transparent bg-transparent touch-none select-none before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:-z-1 before:size-15 before:-translate-1/2 before:rounded-full before:border-2 before:border-violet before:bg-surface before:content-[''] ${
    dragged
      ? "pointer-events-none z-8 cursor-grabbing opacity-85 before:shadow-lg before:shadow-shadow"
      : "z-2 cursor-grab"
  }`;
export const PRISM_ART =
  "pointer-events-none absolute top-1/2 left-1/2 size-19 max-w-none -translate-1/2 rounded-full object-cover";

/** A prism's icon (the inventory's rows, the crafter's preview): its art on a warm tile. */
export const PRISM_ICON =
  "grid size-11 place-items-center rounded-md border border-accent-strong/60 bg-accent-strong/15 text-2xl text-accent-strong [&>img]:max-h-[90%] [&>img]:max-w-[90%] [&>img]:object-contain";
