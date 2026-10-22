// The equipment crafter's legendary views: the list (a group's legendaries kept by type chips, or a search over names and
// mods, by text or /regex/) and a legendary's configuration on the base of its type (Equipment Energy, corrosion implicit
// and its roll, Belt Blend, TOWER Sequence, each a list of choices, and each line with its corroded form, ring effect,
// random roll, tier chips and rolls), with the preview. Each control is a change to the
// planner's draft (src/app/gear/equipment-craft.ts).
import type { CraftChange } from "@legacy/app/gear/equipment-craft.ts";
import type { LegendaryConfigView, LegendaryListView } from "@legacy/app/bridge/equipment-crafter-view.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { RANGE_FIELD } from "../../ui/range-classes";
import { SearchField } from "../../ui/SearchField";
import {
  CONTROL,
  CRAFT_ASIDE,
  CRAFT_FORM_BODY,
  CRAFT_FORM_COLUMN,
  CRAFT_HEADING,
  CRAFT_LAYOUT,
  FIELD,
  MOD_BOX_CORRODED,
  MOD_TAG_CORRODED,
} from "./crafter-classes";
import { PREVIEW_LABEL } from "../../ui/craft-classes";
import { choiceLabel } from "../../ui/choices";
import { ChoiceList } from "../../ui/ChoiceList";
import { CraftColumn } from "../../ui/CraftColumn";
import { CraftSection } from "../../ui/CraftSection";
import { ItemPreview, LegendaryModControl, type LegendaryLineChange } from "./crafter-parts";
import { CraftPath, PickCards } from "./CraftPicker";

// The list column: the search, the results (they scroll), the count.
/** The search row, the path while browsing (it stays above the scrolling list), the list, the count. */
const LIST_COLUMN = "grid min-h-0 flex-1 gap-3 p-4";
const LIST_ROWS = "grid-rows-[auto_minmax(0,1fr)_auto]";
const LIST_ROWS_BROWSING = "grid-rows-[auto_auto_minmax(0,1fr)_auto]";
// A legendary in the list: its art, name and slot · level.
const CHOICE =
  "grid min-h-17.5 cursor-pointer grid-cols-[54px_minmax(0,1fr)] items-center gap-2.5 rounded border border-line bg-raised p-2 text-left text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none";

const change = (craftChange: CraftChange) => plannerCommands().changeEquipmentCraft(craftChange);
const LINE_NAMES = {
  toggle: "data-toggle-legendary-corrosion",
  text: "data-legendary-mod",
  ring: "data-legendary-ring-option",
  placeholder: "data-legendary-placeholder",
  tier: "data-legendary-tier",
  roll: "data-legendary-roll",
};
function craftLineChange(index: number, lineChange: LegendaryLineChange): CraftChange {
  switch (lineChange.kind) {
    case "corrosion":
      return { kind: "toggleLegendaryCorrosion", index };
    case "ring":
      return { kind: "legendaryRing", value: lineChange.value };
    case "placeholder":
      return { kind: "legendaryPlaceholder", index, value: lineChange.value };
    case "tier":
      return { kind: "legendaryTier", index, value: lineChange.value };
    default:
      return {
        kind: "roll",
        group: "legendary",
        index,
        rangeIndex: lineChange.rangeIndex,
        value: lineChange.value,
        commit: lineChange.commit,
      };
  }
}

export function LegendaryList({ list }: { list: LegendaryListView }) {
  const browse = list.browse;
  return (
    <div className="flex min-h-0 flex-1">
      <section className={`${LIST_COLUMN} ${browse ? LIST_ROWS_BROWSING : LIST_ROWS}`}>
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              className="min-w-60 flex-1"
              value={list.search}
              onChange={(value) => change({ kind: "search", value })}
              placeholder="Search name or mod"
              error={list.searchError}
              input={{ "data-legendary-search": "", maxLength: 120 }}
            />
            {list.chips.length ? <TypeChips chips={list.chips} /> : null}
          </div>
        </div>
        {browse ? <CraftPath path={browse.path} /> : null}
        <div className="grid min-h-0 content-start gap-3 overflow-auto">
          {browse ? (
            <>
              <h3 className="text-sm font-bold">{browse.heading}</h3>
              {browse.cards.length ? <PickCards step={browse.step} cards={browse.cards} /> : null}
            </>
          ) : null}
          <LegendaryResults results={list.results} widestName={list.widestName} />
        </div>
        {list.count ? <small className="text-sm text-muted">{list.count}</small> : <span />}
      </section>
    </div>
  );
}

// A type chip, its look picked in code from its state (a utility may not spell a state word the e2e tests read).
const CHIP = "chip cursor-pointer px-2.5 py-1.5 text-xs font-bold hover:border-accent";
const CHIP_ON = "border-accent bg-accent/15 text-accent";

/** The group's types as filter chips: each on keeps its legendaries; none on keeps them all. */
function TypeChips({ chips }: { chips: LegendaryListView["chips"] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Types">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          className={`${CHIP} ${chip.on ? CHIP_ON : ""}`}
          aria-pressed={chip.on}
          data-legendary-type={chip.value}
          onClick={() => change({ kind: "toggleLegendaryType", value: chip.value })}
        >
          {chip.label}
          <span className="font-normal text-dim">{chip.count}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The legendaries found (a group's, or the search's): every card as wide as the one with the catalogue's longest name
 * (an invisible copy of it is measured), as many a row as fit.
 */
function LegendaryResults({ results, widestName }: { results: LegendaryListView["results"]; widestName: string }) {
  const sizer = useRef<HTMLSpanElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  useLayoutEffect(() => setCardWidth(Math.ceil(sizer.current?.getBoundingClientRect().width ?? 0)), [widestName]);
  if (!results.length) return null;
  return (
    <div
      className="relative grid grid-cols-[repeat(auto-fill,min(var(--card-width,22rem),100%))] gap-2"
      style={cardWidth ? ({ "--card-width": `${cardWidth}px` } as CSSProperties) : undefined}
    >
      <span ref={sizer} aria-hidden="true" className={`${CHOICE} invisible absolute w-max`}>
        <span className="h-14.5 w-13" />
        <strong>{widestName}</strong>
      </span>
      {/* An id can repeat in the catalog (Unholy Prayer), so the list is keyed by position. */}
      {results.map((entry, index) => (
        <button
          key={index}
          type="button"
          className={CHOICE}
          data-legendary-id={entry.id}
          onClick={() => change({ kind: "legendary", id: entry.id })}
        >
          <img src={entry.icon} alt="" className="h-14.5 w-13 object-contain" />
          <span className="min-w-0">
            <strong className="block">{entry.name}</strong>
            <small className="mt-1 block text-xs text-muted">{entry.detail}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

/** The chosen corrosion implicit: its line as rolled, and its roll (percent) when it has a range. */
function CorrosionRoll({ corroded }: { corroded: NonNullable<LegendaryConfigView["corroded"]> }) {
  return (
    <div className={`fixed-mod corrosion-affix ${MOD_BOX_CORRODED}`}>
      <span className="flex items-start gap-2.5">
        <b className={MOD_TAG_CORRODED}>Corroded</b>
        <span data-corrosion-text="">{corroded.text}</span>
      </span>
      {corroded.roll !== null ? (
        <input
          type="range"
          min="0"
          max="100"
          value={corroded.roll}
          className={RANGE_FIELD}
          data-corrosion-roll=""
          style={{ "--range-fill": `${corroded.roll}%` } as CSSProperties}
          onChange={(event) => change({ kind: "corrosionRoll", value: Number(event.target.value) })}
        />
      ) : null}
    </div>
  );
}

export function LegendaryConfig({ config }: { config: LegendaryConfigView }) {
  return (
    <div className={CRAFT_LAYOUT}>
      <CraftColumn
        path={<CraftPath path={config.path} />}
        className={CRAFT_FORM_COLUMN}
        bodyClassName={CRAFT_FORM_BODY}
      >
        {config.energy !== null ? (
          <label className={`${FIELD} max-w-40`}>
            Energy
            <input
              className={CONTROL}
              data-legendary-energy=""
              type="number"
              min="0"
              value={config.energy}
              onChange={(event) => change({ kind: "legendaryEnergy", value: event.target.value })}
            />
          </label>
        ) : null}
        <CraftSection
          heading="Corrosion Implicit"
          summary={config.corroded?.text ?? "None"}
          open={Boolean(config.corroded)}
        >
          <ChoiceList
            label="Corrosion Implicit"
            choices={config.corrosions}
            value={config.corrosion}
            noneValue="-1"
            attributes={{ "data-legendary-corrosion": "" }}
            onChange={(value) => change({ kind: "legendaryCorrosion", value: Number(value) })}
            detail={config.corroded ? <CorrosionRoll corroded={config.corroded} /> : null}
          />
        </CraftSection>
        {config.beltBlend ? (
          <CraftSection
            heading="Belt Blend"
            summary={choiceLabel(config.beltBlend.choices, config.beltBlend.value)}
            open={Boolean(config.beltBlend.value)}
          >
            <ChoiceList
              label="Belt Blend"
              choices={config.beltBlend.choices}
              value={config.beltBlend.value}
              attributes={{ "data-legendary-belt-blend": "" }}
              onChange={(value) => change({ kind: "legendaryBeltBlend", value })}
            />
          </CraftSection>
        ) : null}
        {config.sequence ? (
          <CraftSection
            heading="TOWER Sequence"
            summary={choiceLabel(config.sequence.choices, config.sequence.value)}
            open={Boolean(config.sequence.value)}
          >
            <ChoiceList
              label="TOWER Sequence"
              choices={config.sequence.choices}
              value={config.sequence.value}
              attributes={{ "data-legendary-tower-sequence": "" }}
              onChange={(value) => change({ kind: "legendarySequence", value })}
            />
          </CraftSection>
        ) : null}
        <h3 className={CRAFT_HEADING}>Legendary Mods</h3>
        <div className="grid gap-2.5">
          {config.lines.map((line) => (
            <LegendaryModControl
              key={line.index}
              line={line}
              names={LINE_NAMES}
              onChange={(lineChange) => change(craftLineChange(line.index, lineChange))}
            />
          ))}
        </div>
      </CraftColumn>
      <aside id="legendary-config-preview" className={CRAFT_ASIDE}>
        <small className={PREVIEW_LABEL}>Preview</small>
        <ItemPreview preview={config.preview} />
      </aside>
    </div>
  );
}
