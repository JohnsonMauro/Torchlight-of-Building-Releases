// A slate's cells and art on the board, and the coloured tree name of its affixes.
import { divinitySlateTreeFamiliesSs13 } from "../../engine/index.ts";
import { escapeHtml } from "../html.js";
import {
  godSlateCaptureByKey,
  godSlateShapeCapture,
  slateGameCaptureByName,
  slateGodKey,
  slateShapeCodes,
} from "./slate-catalog.js";

/** A talent tree's god colour class ("talent-family-god-of-war"); "" for a tree of no god family. */
export const slateAffixFamilyClass = (tree) => {
  const god = Object.entries(divinitySlateTreeFamiliesSs13).find(([, trees]) => trees.includes(tree))?.[0];
  return god ? `talent-family-${god.toLowerCase().replaceAll(" ", "-")}` : "";
};
export const coloredSlateAffix = (affix) => {
  const colon = affix.indexOf(": ");
  if (colon < 0) return escapeHtml(affix);
  const tree = affix.slice(0, colon),
    family = slateAffixFamilyClass(tree);
  return family
    ? `<b class="slate-affix-tree ${family}">${escapeHtml(tree)}</b>${escapeHtml(affix.slice(colon))}`
    : escapeHtml(affix);
};
const godSlateCapturedShapes = {
  deception: [
    null,
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  hunting: [
    null,
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  knowledge: [
    null,
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  machines: [
    null,
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  might: [
    null,
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
  war: [
    null,
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
};
export const craftedSlateIcon = (slate) => {
  const template = slate.template || slate.name;
  if (String(slate.shape).endsWith("-0") && godSlateCaptureByKey[slateGodKey(slate.god)])
    return `./src/assets/tli/slates/game-captures/${godSlateCaptureByKey[slateGodKey(slate.god)]}.svg`;
  if (legendarySlateShapes[template] && slateGameCaptureByName[template]) return slateGameCaptureByName[template];
  const shapeIndex = Number(String(slate.shape).match(/-(1|2|3)$/)?.[1]);
  if (shapeIndex && slate.icon?.includes("/slates/gods/"))
    return godSlateShapeCapture(slateGodKey(slate.god), slateShapeCodes[shapeIndex]);
  return slateGameCaptureByName[template] || slate.icon;
};
const legendarySlateShapes = {
  "Fallen Starlight": [
    [0, 0],
    [0, 1],
  ],
  "Space Rift": [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  "A Corner of Divinity": [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  "Residence of Stars": [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [1, 3],
  ],
  "Pedigree of Gods": [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
  ],
  "Sparks of Moth Fire": [[0, 0]],
  "When Sparks Set the Prairie Ablaze": [[0, 0]],
  "Nether King's Divinity: Judgment": [
    [0, 0],
    [3, 0],
    [3, 3],
  ],
  "Nether King's Divinity: Contamination": [
    [0, 0],
    [0, 1],
  ],
  "Nether King's Divinity: Offspring": [
    [2, 0],
    [1, 1],
    [0, 2],
  ],
};
const craftedSlateShape = (shape, name, god) => {
  if (legendarySlateShapes[name]) return legendarySlateShapes[name];
  const index = Number(String(shape).match(/-(\d+)$/)?.[1]);
  if (Number.isInteger(index))
    return (
      godSlateCapturedShapes[slateGodKey(god)]?.[index] ||
      (slateGodKey(god) === "deception"
        ? [
            [0, 0],
            [1, 0],
            [1, 1],
            [2, 1],
          ]
        : [
            [1, 0],
            [2, 0],
            [0, 1],
            [1, 1],
          ])
    );
  return (
    {
      corner: [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
      line: [
        [0, 0],
        [0, 1],
      ],
      tee: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      single: [[0, 0]],
    }[shape] || [[0, 0]]
  );
};
export const craftedSlateForBoard = (slate) => ({
  ...slate,
  icon: craftedSlateIcon(slate),
  shape: craftedSlateShape(slate.shape, slate.template || slate.name, slate.god),
  fixed: (slate.affixes || []).filter(Boolean),
  level: 100,
});
// The cells of a crafted slate's shape (x, y), drawn as a god-colored shape when the slate has no art.
export const slateShapeCells = (shape) =>
  ({
    corner: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    line: [
      [0, 0],
      [0, 1],
    ],
    tee: [
      [0, 0],
      [1, 0],
      [1, 1],
    ],
    single: [[0, 0]],
  })[shape] || [[0, 0]];
