// How the gear domain shows an item's lines: a modifier line (plain, or a keyword roll whose effect Alt reveals), a
// line's calculation coverage, and the item's tooltip. Pure; the planner passes in what depends on the open build
// (src/app/gear/gear-controller.js gearTooltip query) and React renders it (apps/web/src/features/gear/GearTooltip.tsx,
// apps/web/src/ui/ModifierText.tsx). Texts close the percentage gap as the legacy markup printed them.
import { keywordRollParts, neutralStatuses, normalizePercentageText } from "../../engine/index.ts";
import { tierBadgeClasses, tierBadgeKey } from "../gear/tier-badge.ts";

const text = (value: string) => normalizePercentageText(value);

/** Whether the calculation uses a line: its status ("In calc", "Not modeled"…), its look, and a hover title (why). */
export interface CoverageView {
  status: string;
  look: "calculated" | "neutral" | "pending";
  title: string;
}
export function coverageView(status: string, title = ""): CoverageView {
  return {
    status,
    look: status === "In calc" ? "calculated" : neutralStatuses.has(status) ? "neutral" : "pending",
    title,
  };
}

/** A modifier line: plain text, or a keyword roll (Wield My Sword, a Dirge…) whose effect shows while Alt is held. */
export type ModifierTextView =
  | { kind: "plain"; text: string }
  | {
      kind: "keyword";
      keyword: string;
      /** The text around a mid-line keyword; null for a keyword that opens the line. */
      inline: { before: string; after: string } | null;
      /** ": effect lines" (" · Keyword: …" for a mid-line keyword), shown when `lines` is null. */
      effect: string;
      /** The effect line by line with its coverage, when the caller knows it (a tooltip); else null. */
      lines: { text: string; coverage: CoverageView }[] | null;
      /** The lines after the keyword's, each led by a line break. */
      rest: string;
    };

/** A modifier line's view; with `lineStatus`, each effect line of a keyword roll carries its coverage. */
export function modifierTextView(value: string, lineStatus?: (line: string) => string): ModifierTextView {
  const clean = String(value ?? "").replace(/(\d)\s+%/g, "$1%"),
    parts = keywordRollParts(clean) as {
      keyword: string;
      effect: string[];
      rest: string[];
      inline?: { before: string; after: string };
      statuses?: ({ status: string; reason?: string } | undefined)[];
    } | null;
  if (!parts) return { kind: "plain", text: text(clean) };
  return {
    kind: "keyword",
    keyword: text(parts.keyword),
    inline: parts.inline ? { before: text(parts.inline.before), after: text(parts.inline.after) } : null,
    effect: `${parts.inline ? ` · ${text(parts.keyword)}` : ""}: ${text(parts.effect.join("\n"))}`,
    lines: lineStatus
      ? parts.effect.map((line, index) => {
          const fixed = parts.statuses?.[index];
          return { text: text(line), coverage: coverageView(fixed?.status || lineStatus(line), fixed?.reason || "") };
        })
      : null,
    rest: parts.inline ? "" : parts.rest.map((line) => `\n${text(line)}`).join(""),
  };
}

/** An item's modifier section as src/app/gear/gear-items.js itemModifierSections lists it. */
export interface GearSectionInput {
  label: string;
  detail?: string;
  entries: { text: string; index: number; tone?: string; badge?: string }[];
}
export interface GearTooltipInput {
  item: {
    name: string;
    base?: string;
    slot: string;
    level?: number;
    energy?: number;
    corrodedModifierIndices?: number[];
  };
  /** The item's display rarity ("legendary", "epic"…). */
  rarity: string;
  icon: string;
  sixAffix: boolean;
  priceless: boolean;
  itemLevel100: boolean;
  sections: readonly GearSectionInput[];
  /** Whether the slot it is made for takes Equipment Energy. */
  energyAllowed: boolean;
  /** An Inventory card's tooltip (else an equipped slot's): only the footer differs. */
  inventory: boolean;
  /** Whether the calculation uses a line of this item. */
  lineStatus: (line: string) => string;
  /** Why the curse limit leaves a line out; "" when it does not. */
  curseReason: (line: string) => string;
}

export interface GearTooltipRow {
  /** Its tier badge ("T1", "L"), or the section's kind letter (I, P, S, C…). */
  mark: { tier: { className: string; text: string } } | { kind: string };
  legendary: boolean;
  corroded: boolean;
  text: ModifierTextView;
  coverage: CoverageView;
}
export interface GearTooltipView {
  name: string;
  icon: string;
  /** The base's name, or the slot's. */
  base: string;
  /** The display rarity, lowercase ("legendary"): the frame's data-rarity. */
  rarity: string;
  rarityLabel: string;
  /** The frame's kind classes (apps/web/src/ui/tooltip/tooltip-classes.ts). */
  frame: string;
  level: number;
  /** Equipment Energy, when the item has some and its slot takes it. */
  energy: number | null;
  /** Why the curse limit leaves one of its lines out; "" when it does not. */
  curseNote: string;
  sections: { label: string; detail: string; rows: GearTooltipRow[] }[];
  footer: string;
}

const KIND_LETTERS: Readonly<Record<string, string>> = {
  Implicit: "I",
  "Implicit · Corroded": "I",
  "Base Affix": "BA",
  "Belt Blend": "BL",
  "TOWER Sequence": "TS",
  Prefix: "P",
  Suffix: "S",
  "Legendary Mod": "L",
  "Corrosion Implicit": "C",
  Affix: "A",
};
const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

/** An equipped or Inventory item's tooltip. */
export function gearTooltipView(input: GearTooltipInput): GearTooltipView {
  const { item } = input;
  const corrodedIndices = new Set(item.corrodedModifierIndices || []);
  let curseNote = "";
  const sections = input.sections.map((section) => ({
    label: text(section.label),
    detail: text(section.detail || ""),
    rows: section.entries.map((entry): GearTooltipRow => {
      const corroded = entry.tone === "corrosion" || corrodedIndices.has(entry.index);
      const status = input.lineStatus(entry.text),
        reason = input.curseReason(entry.text);
      if (reason && !curseNote) curseNote = reason;
      return {
        mark: entry.badge
          ? { tier: { className: tierBadgeClasses(tierBadgeKey(entry.badge)), text: entry.badge } }
          : { kind: corroded ? "C" : KIND_LETTERS[section.label] || "A" },
        legendary: entry.tone === "legendary" || entry.badge === "L",
        corroded,
        text: modifierTextView(entry.text, input.lineStatus),
        coverage: coverageView(status, reason ? `${status}: ${reason}` : ""),
      };
    }),
  }));
  const frame = [
    "gear-tooltip",
    input.sixAffix ? "six-affix" : "",
    input.priceless ? "priceless-item" : "",
    input.itemLevel100 ? "item-level-100" : "",
  ];
  return {
    name: item.name,
    icon: input.icon,
    base: text(item.base || titleCase(item.slot)),
    rarity: input.rarity,
    rarityLabel: titleCase(input.rarity),
    frame: frame.filter(Boolean).join(" "),
    level: item.level || 1,
    energy: item.energy && input.energyAllowed ? item.energy : null,
    curseNote,
    sections,
    footer: input.inventory ? "Click to manage · Right-click to equip" : "Click to inspect · Right-click to unequip",
  };
}
