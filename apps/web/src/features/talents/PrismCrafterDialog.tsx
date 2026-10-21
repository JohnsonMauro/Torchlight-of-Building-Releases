// The Prism crafter (Craft Prism, Craft First Prism, or Edit in the prism inventory): an Ethereal Prism's base and random
// affixes, or an Inverse Image's mod values, and the preview; Craft / Save Changes and Cancel go back to the inventory.
// The planner opens it and announces the "prismCrafter" source; every control is a planner command.
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PrismCrafterView } from "@legacy/app/bridge/prism-crafter-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useViewSource } from "../../ui/use-view-source";
import { FIELD, FOOTER, FORM_HEADING, PREVIEW_CAPTION } from "../../ui/talent-slate-styles";
import { PRISM_ICON } from "./talent-classes";
import { PrismSections } from "./PrismSections";
import { registerDialog } from "../../ui/dialog-registry";

const commands = plannerCommands;

const TAB = "tab px-3 py-2 text-sm font-bold off:cursor-default";
/** A random affix's tag colours, by affix kind. */
const AFFIX_TAGS: Record<string, string> = {
  radius: "bg-grade-magic/15 text-grade-magic",
  rare: "bg-ok/15 text-ok",
  legendary: "bg-grade-rare/15 text-grade-rare",
};
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
    <div className="prism-type-tabs mb-5 flex gap-2">
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
      <h3 className={FORM_HEADING}>Mod Values</h3>
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
    </>
  );
}

function EtherealForm({ ethereal }: { ethereal: NonNullable<PrismCrafterView["ethereal"]> }) {
  return (
    <>
      <label className={`prism-base-field grid gap-2 ${LABEL}`}>
        Base Item *
        <select
          className={FIELD}
          aria-label="Base Prism"
          title={ethereal.base ? `Ethereal Prism: ${ethereal.base}` : undefined}
          value={ethereal.base}
          onChange={(event) => commands().setPrismBase(event.target.value)}
        >
          <option value="">Select Base Prism</option>
          {ethereal.bases.map((base) => (
            <option key={base} value={base} title={`Ethereal Prism: ${base}`}>
              {`Ethereal Prism: ${base}`}
            </option>
          ))}
        </select>
      </label>
      {ethereal.fixed ? (
        <>
          <div className="prism-fixed mt-1">
            <label className={`grid gap-2 ${LABEL}`}>
              {`${ethereal.fixed.label} *`}
              <input className={FIELD} value={ethereal.base} readOnly />
            </label>
            <small className={`my-2 block ${LABEL}`}>{ethereal.fixed.note}</small>
            <p className={`${BOX} p-3 leading-normal`}>{ethereal.fixed.effect}</p>
          </div>
          <h3 className={FORM_HEADING}>{`Random Affixes (${ethereal.count}/${ethereal.max})`}</h3>
          {ethereal.selects.map((select) => (
            <label key={select.kind} className={`prism-affix-select my-3 grid gap-2 ${BOX} p-3`}>
              <span className="flex items-center gap-2">
                <b className={`${select.kind} rounded-sm px-2 py-0.5 text-xs ${AFFIX_TAGS[select.kind] ?? ""}`}>
                  {select.label}
                </b>
                <small className={LABEL}>{`Only ${select.label} mods`}</small>
              </span>
              <select
                className={FIELD}
                aria-label={`${select.label} Prism affix`}
                title={select.title || undefined}
                value={select.value}
                onChange={(event) => commands().setPrismAffix(select.kind, event.target.value)}
              >
                <option value="">{`-- Select ${select.label} Slot --`}</option>
                {select.options.map((option) => (
                  <option key={option.value} value={option.value} title={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </>
      ) : null}
    </>
  );
}

export function PrismCrafterDialog() {
  const view = useViewSource("prismCrafter");
  return (
    <dialog
      id="prism-crafter-dialog"
      ref={registerDialog}
      className="prism-crafter-dialog dialog-panel h-177.5 w-225 text-sm leading-[normal] open:flex open:flex-col"
      aria-labelledby="prism-crafter-title"
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
      <div className="prism-crafter-layout grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_280px] gap-6 px-3.5 pt-4 max-[650px]:grid-cols-1 max-[650px]:overflow-auto">
        <div
          id="prism-crafter-form"
          className="overflow-auto pr-2.5 pb-4 max-[650px]:min-h-auto max-[650px]:overflow-visible"
        >
          {view ? (
            <>
              <TypeTabs view={view} />
              {view.inverse ? <InverseForm inverse={view.inverse} /> : null}
              {view.ethereal ? <EtherealForm ethereal={view.ethereal} /> : null}
            </>
          ) : null}
        </div>
        <aside className="min-w-0 overflow-auto pb-4 text-muted max-[650px]:overflow-visible">
          <span className={PREVIEW_CAPTION}>Preview</span>
          <div id="prism-crafter-preview" className={`min-h-50 ${BOX} p-4`}>
            {view?.preview ? (
              <div
                className={`prism-preview-card ${view.preview.inverse ? "inverse-preview" : ""} overflow-hidden rounded-sm border border-line-strong bg-raised text-center text-text`}
              >
                <span className={`prism-preview-icon mx-auto mt-4 mb-2 ${PRISM_ICON}`}>
                  {view.preview.icon ? <img src={view.preview.icon} alt="" /> : "✦"}
                </span>
                <h3
                  className={`mx-2 mb-2 font-display text-lg font-bold ${view.preview.inverse ? "text-grade-vorax" : "text-accent"}`}
                >
                  {view.preview.name}
                </h3>
                <small className="chip mb-4 px-2.5 py-1 text-xs">
                  {view.preview.inverse ? "INVERSE IMAGE" : "ETHEREAL PRISM"}
                </small>
                <div
                  className={`border-t-2 p-3.5 text-left ${view.preview.inverse ? "border-grade-vorax" : "border-accent"}`}
                >
                  <p className="prism-effect-area mb-2 text-xs text-muted">
                    Effect Area: <strong className="font-bold text-info">{view.preview.area}</strong>
                  </p>
                  <PrismSections sections={view.preview.sections} inverse={view.preview.inverse} />
                </div>
              </div>
            ) : view ? (
              <div className="prism-preview-empty grid min-h-42.5 place-items-center text-dim">
                Select options to preview item
              </div>
            ) : null}
          </div>
        </aside>
      </div>
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
