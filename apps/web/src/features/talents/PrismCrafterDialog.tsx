// The Prism crafter (Craft Prism, or Edit in the prism inventory), in two pages as the equipment crafter: first the
// type (Ethereal Prism or Inverse Image), a search and its bases as cards; then, under its path back to them (and a
// search over the affixes), the picked base's form (an Ethereal Prism's fixed effect and random affixes as lists in
// folding sections, or an Inverse Image's mod values) beside the preview. Craft / Save Changes and Cancel go back to the inventory. The planner opens it and announces the
// "prismCrafter" source; every control is a planner command.
import { useState, type CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PrismCrafterView } from "@legacy/app/bridge/prism-crafter-view.ts";
import { searchMatcher, searchText } from "@legacy/app/bridge/search-match.ts";
import { Breadcrumb } from "../../ui/Breadcrumb";
import { choiceLabel } from "../../ui/choices";
import { ChoiceList } from "../../ui/ChoiceList";
import { CraftSection } from "../../ui/CraftSection";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { CraftColumn } from "../../ui/CraftColumn";
import { PICK_CARD, PICK_CARDS, PREVIEW_LABEL } from "../../ui/craft-classes";
import { SearchField } from "../../ui/SearchField";
import { useViewSource } from "../../ui/use-view-source";
import { FOOTER, FORM_HEADING } from "../../ui/talent-slate-styles";
import { PRISM_ICON } from "./talent-classes";
import { PrismSections } from "./PrismSections";
import { registerDialog } from "../../ui/dialog-registry";

const commands = plannerCommands;

const TAB = "tab px-3 py-2 text-sm font-bold off:cursor-default";
/** An Inverse Image mod value's colour, by sign. */
const SIGN_COLORS: Record<string, string> = { negative: "var(--color-danger)", positive: "var(--color-ok)" };
const signColor = (sign: string) => SIGN_COLORS[sign] ?? "var(--color-muted)";
const RANGE_THUMB =
  "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-accent";
/** A form box (the description, a mod value, the fixed effect, an affix select). */
const BOX = "rounded-sm border border-line";
const LABEL = "text-sm text-muted";
const FOOTER_BUTTON = "min-h-10 min-w-32.5 font-bold";

function TypeTabs({ view }: { view: PrismCrafterView }) {
  return (
    <div className="prism-type-tabs flex gap-2">
      {(
        [
          ["ethereal", "Ethereal Prism"],
          ["inverse", "Inverse Image"],
        ] as const
      ).map(([type, label]) => (
        <button
          key={type}
          type="button"
          data-prism-type={type}
          className={`${view.type === type ? "active" : ""} ${TAB}`}
          disabled={view.editing}
          onClick={() => commands().setPrismType(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function InverseForm({ inverse }: { inverse: NonNullable<PrismCrafterView["inverse"]> }) {
  return (
    <>
      <div className="inverse-image-heading mb-4.5 flex items-center gap-3.5">
        <img src={inverse.icon} alt="" className="size-16.5 object-contain" />
        <div>
          <strong className="block text-base text-grade-vorax">Inverse Image</strong>
          <small className="mt-1 block text-xs text-grade-vorax">Ultimate</small>
        </div>
      </div>
      <p className={`inverse-image-description ${BOX} p-3 text-sm leading-normal text-text`}>{inverse.description}</p>
      <p className={`inverse-radius my-5 ${LABEL}`}>
        Radius: <strong className="text-info">3x3</strong>
      </p>
      <CraftSection heading="Mod Values">
        <div className="inverse-rolls grid gap-3">
          {inverse.rolls.map((roll) => (
            <div
              key={roll.kind}
              className={`inverse-roll ${roll.sign} grid grid-cols-[1fr_62px] gap-2 ${BOX} p-3.5`}
              style={
                {
                  "--inverse-start": `${roll.start}%`,
                  "--inverse-end": `${roll.end}%`,
                  "--inverse-color": signColor(roll.sign),
                } as CSSProperties
              }
            >
              <label htmlFor={`inverse-${roll.kind}`} className="self-center text-sm text-text">
                {roll.label}
              </label>
              <LiveNumberInput
                id={`inverse-${roll.kind}`}
                min={roll.min}
                max={roll.max}
                step={1}
                value={roll.value}
                aria-label={roll.label}
                className="w-15.5 rounded-sm bg-sunken p-1 text-right text-sm font-bold text-(--inverse-color) outline-none focus:ring-1 focus:ring-accent"
                onValue={(value) => commands().setInverseRoll(roll.kind, value)}
              />
              <input
                type="range"
                min={roll.min}
                max={roll.max}
                step={1}
                value={roll.value}
                aria-label={`${roll.label} slider`}
                className={`col-span-full my-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,var(--color-line)_var(--inverse-start),var(--inverse-color)_var(--inverse-start),var(--inverse-color)_var(--inverse-end),var(--color-line)_var(--inverse-end))] ${RANGE_THUMB}`}
                onChange={(event) => commands().setInverseRoll(roll.kind, Number(event.target.value))}
              />
              <small className="col-span-full flex justify-between text-xs text-dim">
                <span>{roll.min}</span>
                <span>{roll.max}</span>
              </small>
            </div>
          ))}
        </div>
      </CraftSection>
    </>
  );
}

/**
 * The fixed effect, then each random affix slot's list; a search over the lists hides the slots it finds nothing in.
 */
function EtherealForm({ ethereal, query }: { ethereal: NonNullable<PrismCrafterView["ethereal"]>; query: string }) {
  const matcher = searchMatcher(query);
  const lists = ethereal.lists.filter(
    (list) => !query.trim() || list.choices.some((choice) => matcher.matches(searchText([choice.label]))),
  );
  return (
    <>
      {ethereal.fixed ? (
        <CraftSection heading={ethereal.fixed.label} summary={ethereal.base}>
          <div className="prism-fixed grid gap-2">
            <small className={LABEL}>{ethereal.fixed.note}</small>
            <p className={`${BOX} p-3 leading-normal`}>{ethereal.fixed.effect}</p>
          </div>
        </CraftSection>
      ) : null}
      <h3 className={FORM_HEADING}>{`Random Affixes (${ethereal.count}/${ethereal.max})`}</h3>
      {lists.map((list) => (
        <CraftSection key={list.kind} heading={`${list.label} affix`} summary={choiceLabel(list.choices, list.value)}>
          <ChoiceList
            label={`${list.label} Prism affix`}
            choices={list.choices}
            value={list.value}
            query={query}
            attributes={{ "data-prism-affix": list.kind }}
            onChange={(value) => commands().setPrismAffix(list.kind, value)}
          />
        </CraftSection>
      ))}
      {lists.length ? null : <p className="prism-affix-empty py-6 text-center text-muted">No affix matches that.</p>}
    </>
  );
}

/**
 * The first page: the type's tabs, a search over what the bases hold or can roll (a card found by one of those shows
 * the line under its name), and the bases as cards; a card opens the base's form.
 */
function PrismPick({
  view,
  query,
  onQuery,
}: {
  view: PrismCrafterView;
  query: string;
  onQuery: (query: string) => void;
}) {
  const matcher = searchMatcher(query);
  const found = view.picks.filter((pick) => matcher.matches(searchText([pick.label, ...pick.lines])));
  const reason = (pick: PrismCrafterView["picks"][number]) =>
    query.trim() && !matcher.matches(searchText([pick.label]))
      ? (pick.lines.find((line) => matcher.matches(searchText([line]))) ?? "")
      : "";
  return (
    <CraftColumn
      className="flex-1"
      path={
        <div className="grid gap-3">
          <TypeTabs view={view} />
          <SearchField
            value={query}
            onChange={onQuery}
            placeholder="Search prism effects and affixes…"
            error={matcher.error}
            input={{ "aria-label": "Search prisms" }}
          />
        </div>
      }
    >
      {found.length ? (
        <div className={PICK_CARDS}>
          {found.map((pick) => {
            const line = reason(pick);
            return (
              <button
                key={pick.value}
                type="button"
                className={PICK_CARD}
                data-prism-pick={pick.value}
                onClick={() => commands().pickPrismBase(pick.value)}
              >
                {pick.icon ? <img src={pick.icon} alt="" className="size-12 object-contain" /> : null}
                <span className="text-sm font-bold">{pick.label}</span>
                {line ? <small className="line-clamp-2 text-xs text-muted">{line}</small> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="prism-pick-empty py-6 text-center text-muted">No prism holds or rolls that.</p>
      )}
    </CraftColumn>
  );
}

function PrismPreview({ preview }: { preview: NonNullable<PrismCrafterView["preview"]> }) {
  return (
    <div
      className={`prism-preview-card ${preview.inverse ? "inverse-preview" : ""} overflow-hidden rounded-sm border border-line-strong bg-raised text-center text-text`}
    >
      <span className={`prism-preview-icon mx-auto mt-4 mb-2 ${PRISM_ICON}`}>
        {preview.icon ? <img src={preview.icon} alt="" /> : "✦"}
      </span>
      <h3
        className={`mx-2 mb-2 font-display text-lg font-bold ${preview.inverse ? "text-grade-vorax" : "text-accent"}`}
      >
        {preview.name}
      </h3>
      <small className="chip mb-4 px-2.5 py-1 text-xs">{preview.inverse ? "INVERSE IMAGE" : "ETHEREAL PRISM"}</small>
      <div className={`border-t-2 p-3.5 text-left ${preview.inverse ? "border-grade-vorax" : "border-accent"}`}>
        <p className="prism-effect-area mb-2 text-xs text-muted">
          Effect Area: <strong className="font-bold text-info">{preview.area}</strong>
        </p>
        <PrismSections sections={preview.sections} inverse={preview.inverse} />
      </div>
    </div>
  );
}

/** The second page: the path back to the bases and the affixes' search, the base's form, and the preview beside it. */
function PrismForm({
  view,
  query,
  onQuery,
}: {
  view: PrismCrafterView;
  query: string;
  onQuery: (query: string) => void;
}) {
  return (
    <div className="prism-crafter-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] grid-rows-[minmax(0,1fr)] max-[650px]:flex max-[650px]:flex-col max-[650px]:overflow-auto">
      <CraftColumn
        path={
          <div className="grid gap-3">
            <Breadcrumb
              label="Prism"
              steps={view.path.map((step) => ({
                label: step.label,
                onSelect: step.back ? () => commands().repickPrism() : undefined,
              }))}
            />
            {view.ethereal ? (
              <SearchField
                value={query}
                onChange={onQuery}
                placeholder="Search affixes…"
                error={searchMatcher(query).error}
                input={{ "aria-label": "Search affixes" }}
              />
            ) : null}
          </div>
        }
        className="prism-crafter-form max-[650px]:shrink-0"
        bodyClassName="max-[650px]:overflow-visible"
      >
        {view.inverse ? <InverseForm inverse={view.inverse} /> : null}
        {view.ethereal ? <EtherealForm ethereal={view.ethereal} query={query} /> : null}
      </CraftColumn>
      <aside className="min-w-0 overflow-auto p-4 pl-2 text-muted max-[650px]:shrink-0 max-[650px]:overflow-visible max-[650px]:pl-4">
        <span className={PREVIEW_LABEL}>Preview</span>
        <div id="prism-crafter-preview">{view.preview ? <PrismPreview preview={view.preview} /> : null}</div>
      </aside>
    </div>
  );
}

export function PrismCrafterDialog() {
  const view = useViewSource("prismCrafter");
  // The bases' search and the affixes' search last while the crafter is open (a base's form and back keep them).
  const [query, setQuery] = useState("");
  const [affixQuery, setAffixQuery] = useState("");
  return (
    <dialog
      id="prism-crafter-dialog"
      ref={registerDialog}
      className="prism-crafter-dialog dialog-panel h-[min(780px,calc(100vh-2rem))] w-250 text-sm leading-[normal] open:flex open:flex-col"
      aria-labelledby="prism-crafter-title"
      onClose={() => {
        setQuery("");
        setAffixQuery("");
      }}
    >
      <header className="dialog-head min-h-12.5 py-0">
        <h2 id="prism-crafter-title" className="dialog-title">
          {view?.title ?? "Craft Prism"}
        </h2>
        <button
          type="button"
          className="dialog-close"
          aria-label="Close Prism crafter"
          onClick={() => commands().cancelPrismCraft()}
        >
          ×
        </button>
      </header>
      {view ? (
        view.step === "pick" ? (
          <PrismPick view={view} query={query} onQuery={setQuery} />
        ) : (
          <PrismForm view={view} query={affixQuery} onQuery={setAffixQuery} />
        )
      ) : null}
      <footer className={`${FOOTER} flex shrink-0 justify-end gap-3 p-3.5`}>
        <button type="button" className={`btn ${FOOTER_BUTTON}`} onClick={() => commands().cancelPrismCraft()}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn-primary ${FOOTER_BUTTON}`}
          data-confirm-prism-craft=""
          disabled={!view?.canSave}
          onClick={() => commands().confirmPrismCraft()}
        >
          {view?.saveLabel ?? "Craft"}
        </button>
      </footer>
    </dialog>
  );
}
