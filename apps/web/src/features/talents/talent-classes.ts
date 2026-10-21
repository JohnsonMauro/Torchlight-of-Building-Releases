// The talent trees' class lists that depend on state: a god family's emblem tint, a node's look from its state classes,
// the connection lines and the prism's area. The states come from the view model as class words (allocated, locked,
// prism-placement-target…) that the tests read off the class list, so no utility here spells one: the look is picked
// in code from those words instead of with class-matching variants.

/**
 * A god family's tint (by the view model's `talent-family-*` class): `--talent-emblem`, its colour, and
 * `--talent-tint`, the filter that paints a black silhouette in it. A tree without a family is pale blue.
 */
const FAMILY_TINTS: Record<string, string> = {
  "talent-family-god-of-might":
    "[--talent-emblem:#f4bd4e] [--talent-tint:invert(77%)_sepia(77%)_saturate(743%)_hue-rotate(344deg)_brightness(101%)_contrast(92%)]",
  "talent-family-goddess-of-hunting":
    "[--talent-emblem:#62d76e] [--talent-tint:invert(72%)_sepia(55%)_saturate(576%)_hue-rotate(72deg)_brightness(93%)_contrast(91%)]",
  "talent-family-goddess-of-knowledge":
    "[--talent-emblem:#69b7ff] [--talent-tint:invert(66%)_sepia(77%)_saturate(836%)_hue-rotate(184deg)_brightness(103%)_contrast(101%)]",
  "talent-family-god-of-war":
    "[--talent-emblem:#f06c69] [--talent-tint:invert(58%)_sepia(52%)_saturate(1208%)_hue-rotate(313deg)_brightness(101%)_contrast(89%)]",
  "talent-family-goddess-of-deception":
    "[--talent-emblem:#c276ed] [--talent-tint:invert(62%)_sepia(55%)_saturate(1045%)_hue-rotate(231deg)_brightness(98%)_contrast(90%)]",
  "talent-family-god-of-machines":
    "[--talent-emblem:#52d6dc] [--talent-tint:invert(77%)_sepia(45%)_saturate(756%)_hue-rotate(132deg)_brightness(91%)_contrast(91%)]",
};
const NO_FAMILY_TINT =
  "[--talent-emblem:#b9d7ff] [--talent-tint:invert(86%)_sepia(14%)_saturate(775%)_hue-rotate(184deg)_brightness(105%)_contrast(101%)]";

/** The tint custom properties of a family class; `fallback` false leaves a tree without a family untinted. */
export const familyTint = (familyClass: string, fallback = true): string =>
  FAMILY_TINTS[familyClass] ?? (fallback ? NO_FAMILY_TINT : "");

/**
 * A tree slot's emblem (an Artwork frame): the art as a solid silhouette in the family colour (the zero drop shadows
 * fill its translucent parts) with a soft glow, brighter on the open tree (`group-on:`); the frame's ◆ only shows
 * without art.
 */
export const TREE_EMBLEM_ART =
  "[--emblem-glow:0_0_8px_color-mix(in_srgb,var(--talent-emblem)_65%,transparent)] group-on:[--emblem-glow:0_0_13px_var(--talent-emblem)] [&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:scale-114 [&>img]:object-contain [&>img+span]:invisible [&>img]:[filter:brightness(0)_saturate(100%)_var(--talent-tint)_drop-shadow(0_0_0_var(--talent-emblem))_drop-shadow(0_0_0_var(--talent-emblem))_drop-shadow(0_0_0_var(--talent-emblem))_drop-shadow(0_0_0_var(--talent-emblem))_drop-shadow(0_0_0_var(--talent-emblem))_drop-shadow(0_3px_2px_#05080c)_drop-shadow(var(--emblem-glow))]";

/** A connection line: grey, bronze where the next node can be taken, glowing cyan between taken nodes. */
const LINE_LOOKS: Record<string, string> = {
  active: "stroke-[#67dbea] [stroke-width:3.2] drop-shadow-[0_0_3px_rgb(88_219_234/0.75)]",
  reachable: "stroke-[#a97745] [stroke-width:2.2] opacity-95",
};
export const lineLook = (state: string): string =>
  `[vector-effect:non-scaling-stroke] ${LINE_LOOKS[state] ?? "stroke-[#687582] [stroke-width:2.2] opacity-78"}`;

/** The installed prism's area over the stage; an Inverse Image's mirrored area is dashed and fainter. */
export const areaLook = (reflected: boolean): string =>
  `pointer-events-none z-1 m-0.5 place-self-stretch rounded-[9px] border-2 border-[#b76de7] ${
    reflected
      ? "border-dashed bg-[#a346d00d] shadow-[inset_0_0_12px_#ae5add16]"
      : "bg-[#a346d01c] shadow-[inset_0_0_18px_#ae5add20,0_0_12px_#b76de733]"
  }`;

const SHADOW = "shadow-[0_8px_18px_rgb(0_0_0/0.35)]";
const HOVER_LIFT =
  "hover:border-[#9eb3c7] hover:shadow-[0_0_0_3px_rgb(158_179_199/0.1),0_0_18px_rgb(120_157_188/0.16)] focus-visible:border-[#9eb3c7] focus-visible:shadow-[0_0_0_3px_rgb(158_179_199/0.1),0_0_18px_rgb(120_157_188/0.16)]";

/** A talent node's look, and its art's and rank badge's. */
export interface NodeLook {
  node: string;
  art: string;
  rank: string;
}

/**
 * A node's look from the view model's state classes and the prism drag. The fill says taken (frost), blocked (dark)
 * or open (dim slate, lit on hover); the edge, from strongest to weakest: the drop target of a dragged prism (violet
 * glow), a prism placement target (ember glow, crosshair), a legendary node (orange ring, violet halo inside a prism's
 * area), a node in a prism's area (violet ring). A node under the installed prism hides unless the prism is dragged.
 */
export function nodeLook(classes: string, dropTarget: boolean, prismDragged: boolean): NodeLook {
  const has = new Set(classes.split(" "));
  const allocated = has.has("allocated");
  const locked = !allocated && has.has("locked");
  const legendary = has.has("legendary-node");
  const affected = has.has("prism-affected-node");
  const placing = has.has("prism-placement-target") && !legendary;

  const fill = allocated
    ? "text-[#f4f8fb] bg-[radial-gradient(circle_at_42%_35%,#385467_0,#203746_58%,#101b24_100%)]"
    : locked
      ? "text-[#4f5b67] bg-[#0d131a]"
      : `text-[#778493] bg-[radial-gradient(circle,#1b222c,#0d1218)] ${placing ? "" : "opacity-82 hover:opacity-100 focus-visible:opacity-100"}`;
  const edge = dropTarget
    ? "z-3 border-[#e1a3ff] shadow-[0_0_0_5px_#b76de780,0_0_20px_#b76de7]"
    : placing
      ? "border-[#ffa646] shadow-[0_0_0_3px_#ff9b3338,0_0_22px_#ff9b3355] hover:shadow-[0_0_0_5px_#ff9b3360,0_0_27px_#ff9b3380] focus-visible:shadow-[0_0_0_5px_#ff9b3360,0_0_27px_#ff9b3380]"
      : legendary && affected
        ? "border-[#ff902f] shadow-[0_0_0_2px_#ff902f55,0_0_0_5px_#bd78e370,0_0_16px_#ff902f55]"
        : legendary
          ? "border-[#ef771d] shadow-[0_0_0_2px_rgb(239_119_29/0.1),0_0_14px_rgb(239_119_29/0.2)]"
          : affected
            ? "border-[#a870c5] shadow-[0_0_0_3px_#bd78e36b,0_0_13px_#b76de755]"
            : allocated
              ? "border-[#a9dff0] shadow-[inset_0_0_0_2px_rgb(173_226_242/0.1),0_0_13px_rgb(95_206_231/0.2)]"
              : locked
                ? `border-[#313c48] ${SHADOW}`
                : `border-[#465362] ${SHADOW} ${HOVER_LIFT}`;
  const hidden = has.has("prism-covered-node") && !prismDragged ? "invisible" : "";

  const art = allocated
    ? "brightness-120 contrast-108"
    : locked
      ? "opacity-40 grayscale-72 brightness-62"
      : legendary
        ? "saturate-90 brightness-88"
        : "grayscale-50 brightness-72";
  const rank = allocated
    ? "border border-[#c58b38] bg-[linear-gradient(180deg,#f9df9b_0%,#d6a448_45%,#9d672a_100%)] text-[#241708] shadow-[0_1px_3px_rgb(0_0_0/0.45)]"
    : legendary && affected
      ? "bg-[#7c451c] text-[#ffe2b4]"
      : "bg-[#252e3a] text-[#aeb9c4] opacity-82";

  return {
    node: `z-1 pressed:scale-94 ${legendary ? "border-2" : "border"} ${placing ? "cursor-crosshair" : "cursor-pointer"} ${fill} ${edge} ${hidden}`,
    art,
    rank,
  };
}

/** The installed prism over its node: its art in a violet disc, grabbed to move it; lifted while dragged. */
export const prismLook = (dragged: boolean): string =>
  `overflow-visible border border-transparent bg-transparent touch-none select-none before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:-z-1 before:size-15 before:-translate-1/2 before:rounded-full before:border-2 before:border-[#d980f2] before:bg-[#341f3f] before:content-[''] ${
    dragged
      ? "pointer-events-none z-8 cursor-grabbing opacity-85 before:shadow-[0_8px_24px_#000b,0_0_0_3px_#d980f2]"
      : "z-2 cursor-grab before:shadow-[0_0_0_3px_#cc7bec35,0_0_18px_#cc7bec66]"
  }`;
export const PRISM_ART =
  "pointer-events-none absolute top-1/2 left-1/2 size-19 max-w-none -translate-1/2 rounded-full object-cover";
