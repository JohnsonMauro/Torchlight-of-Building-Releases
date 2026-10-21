// The Prism crafter (Craft Prism, Craft First Prism, or Edit in the prism inventory): an Ethereal Prism's base and random
// affixes, or an Inverse Image's mod values, and the preview; Craft / Save Changes and Cancel go back to the inventory.
// The planner opens it and announces the "prismCrafter" source; every control is a planner command.
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PrismCrafterView, PrismSectionView } from "@legacy/app/bridge/prism-crafter-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useViewSource } from "../../ui/use-view-source";
import { FIELD, FOOTER, FORM_HEADING, PREVIEW_CAPTION } from "./talent-slate-styles";

const commands = plannerCommands;

const TAB =
  "cursor-pointer rounded-[3px] border border-[#8d6937] bg-[linear-gradient(180deg,#3e3326,#1b2026)] px-4 py-2.5 text-base font-bold text-[#e6c991] enabled:hover:border-[#e7b35d] enabled:hover:bg-[linear-gradient(180deg,#604525,#222329)] enabled:hover:text-[#fff1bd] focus-visible:outline-2 focus-visible:outline-[#e7b35d] off:cursor-default on:border-[#e7b35d] on:bg-[linear-gradient(180deg,#604525,#222329)] on:text-[#fff1bd]";
/** A random affix's tag colours, by affix kind. */
const AFFIX_TAGS: Record<string, string> = {
  radius: "bg-[#273e71] text-[#adc6ff]",
  rare: "bg-[#1c533c] text-[#a4f5c6]",
  legendary: "bg-[#49306a] text-[#e5c7ff]",
};
/** An Inverse Image mod value's colour, by sign. */
const SIGN_COLORS: Record<string, string> = { negative: "#ff555c", positive: "#25cc78" };
const signColor = (sign: string) => SIGN_COLORS[sign] ?? "#aeb7c5";
const SIGN_TEXT: Record<string, string> = { negative: "text-[#ff555c]", positive: "text-[#25cc78]" };
/** A preview section's left edge, by section. */
const SECTION_EDGES: Record<string, string> = {
  radiusAffix: "border-l-[#628ded]",
  rareAffix: "border-l-[#4dc486]",
  legendaryAffix: "border-l-[#d581ef]",
};
const RANGE_THUMB =
  "[&::-webkit-slider-thumb]:size-4.25 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#8d6937] [&::-webkit-slider-thumb]:bg-[#f9ca65] [&::-webkit-slider-thumb]:shadow-[0_1px_3px_#0009] [&::-moz-range-thumb]:size-3.25 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#8d6937] [&::-moz-range-thumb]:bg-[#f9ca65]";
const ICON =
  "prism-preview-icon mx-auto mt-3.75 mb-2 grid size-11 place-items-center rounded-md border border-[#9f5c22] bg-[#49321f] text-2xl text-[#ffb05e] [&>img]:max-h-[90%] [&>img]:max-w-[90%] [&>img]:object-contain";
const LINE = "text-xs leading-normal text-[#e8e7e7] [overflow-wrap:anywhere]";
const FOOTER_BUTTON = "btn-bronze min-h-10.25 min-w-32.5 font-bold off:cursor-not-allowed off:opacity-50";

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
          <strong className="block text-base text-[#ff665d]">Inverse Image</strong>
          <small className="mt-1.25 block text-[11px] text-[#ff8079]">Ultimate</small>
        </div>
      </div>
      <p className="inverse-image-description rounded-[5px] border border-[#2d3541] p-3.25 text-[13px] leading-normal text-[#e2e6ed]">
        {inverse.description}
      </p>
      <p className="inverse-radius my-5 text-[13px] text-[#aeb7c5]">
        Radius: <strong className="text-[#93d8ff]">3x3</strong>
      </p>
      <h3 className={FORM_HEADING}>Mod Values</h3>
      <div className="inverse-rolls grid gap-3.25">
        {inverse.rolls.map((roll) => (
          <div
            key={roll.kind}
            className={`inverse-roll ${roll.sign} grid grid-cols-[1fr_62px] gap-2.25 rounded-[5px] border border-[#28303b] p-3.75`}
            style={
              {
                "--inverse-start": `${roll.start}%`,
                "--inverse-end": `${roll.end}%`,
                "--inverse-color": signColor(roll.sign),
              } as CSSProperties
            }
          >
            <label htmlFor={`inverse-${roll.kind}`} className="self-center text-[13px] text-[#dce0e7]">
              {roll.label}
            </label>
            <LiveNumberInput
              id={`inverse-${roll.kind}`}
              min={roll.min}
              max={roll.max}
              step={1}
              value={roll.value}
              aria-label={roll.label}
              className="w-15.5 rounded-[3px] bg-[#0d1219] p-1 text-right text-[13px] font-bold text-(--inverse-color) outline-none focus:ring-1 focus:ring-[#a67736]"
              onValue={(value) => commands().setInverseRoll(roll.kind, value)}
            />
            <input
              type="range"
              min={roll.min}
              max={roll.max}
              step={1}
              value={roll.value}
              aria-label={`${roll.label} slider`}
              className={`col-span-full my-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,#2b3139_var(--inverse-start),var(--inverse-color)_var(--inverse-start),var(--inverse-color)_var(--inverse-end),#2b3139_var(--inverse-end))] ${RANGE_THUMB}`}
              onChange={(event) => commands().setInverseRoll(roll.kind, Number(event.target.value))}
            />
            <small className="col-span-full flex justify-between text-[11px] text-[#9da7b3]">
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
      <label className="prism-base-field grid gap-2 text-[13px] text-[#adb5c1]">
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
          <div className="prism-fixed mt-1.25">
            <label className="grid gap-2 text-[13px] text-[#adb5c1]">
              {`${ethereal.fixed.label} *`}
              <input className={FIELD} value={ethereal.base} readOnly />
            </label>
            <small className="my-1.75 block text-[13px] text-[#a8b0bd]">{ethereal.fixed.note}</small>
            <p className="rounded border border-[#2e3641] p-3.25 leading-normal">{ethereal.fixed.effect}</p>
          </div>
          <h3 className={FORM_HEADING}>{`Random Affixes (${ethereal.count}/${ethereal.max})`}</h3>
          {ethereal.selects.map((select) => (
            <label
              key={select.kind}
              className="prism-affix-select my-3 grid gap-2 rounded-[5px] border border-[#2c3441] p-3"
            >
              <span className="flex items-center gap-2.25">
                <b className={`${select.kind} rounded-[3px] px-2 py-0.75 text-[11px] ${AFFIX_TAGS[select.kind] ?? ""}`}>
                  {select.label}
                </b>
                <small className="text-[13px] text-[#aeb5c1]">{`Only ${select.label} mods`}</small>
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

function Sections({ sections, inverse }: { sections: PrismSectionView[]; inverse: boolean }) {
  return sections.map((section) => (
    <section
      key={section.className}
      className={`prism-affix-section ${section.className} mt-2.75 rounded border border-l-3 border-[#53423b] bg-[#32231b66] px-2.75 py-2.5 ${SECTION_EDGES[section.className] ?? (inverse ? "border-l-[#f0822c]" : "border-l-[#e8ad4f]")}`}
    >
      <h4
        className={`mb-1.5 text-[11px] leading-[1.2] font-bold tracking-[0.05em] uppercase ${inverse ? "text-[#ffab64]" : "text-gold"}`}
      >
        {section.heading}
      </h4>
      {section.lines.map((line) =>
        "value" in line ? (
          <p key={line.kind} className={`${LINE} my-1`}>
            {`${line.label}: `}
            <strong className={`${line.sign} ${SIGN_TEXT[line.sign] ?? "text-[#aeb7c5]"}`}>{line.value}</strong>{" "}
          </p>
        ) : (
          <p key={line.kind} className={LINE}>{`${line.text} `}</p>
        ),
      )}
    </section>
  ));
}

export function PrismCrafterDialog() {
  const view = useViewSource("prismCrafter");
  return (
    <dialog
      id="prism-crafter-dialog"
      className="prism-crafter-dialog dialog-panel h-177.5 w-225 text-[13px] leading-[normal] open:flex open:flex-col"
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
        <aside className="min-w-0 overflow-auto pb-4 text-[#adb5c1] max-[650px]:overflow-visible">
          <span className={PREVIEW_CAPTION}>Preview</span>
          <div id="prism-crafter-preview" className="min-h-50 rounded-[5px] border border-[#66553c] p-3.75">
            {view?.preview ? (
              <div
                className={`prism-preview-card ${view.preview.inverse ? "inverse-preview" : ""} overflow-hidden rounded-[5px] border border-[#806037] bg-[#19150f] text-center text-[#e8e6e3]`}
              >
                <span className={ICON}>{view.preview.icon ? <img src={view.preview.icon} alt="" /> : "✦"}</span>
                <h3
                  className={`mx-2 mb-2.25 text-lg font-bold ${view.preview.inverse ? "text-[#ff685e]" : "text-gold"}`}
                >
                  {view.preview.name}
                </h3>
                <small className="mb-4 inline-block border border-[#685039] px-2.5 py-1 text-xs">
                  {view.preview.inverse ? "INVERSE IMAGE" : "ETHEREAL PRISM"}
                </small>
                <div
                  className={`border-t-2 p-3.5 text-left ${view.preview.inverse ? "border-[#f0545b]" : "border-[#e8ad4f]"}`}
                >
                  <p className="prism-effect-area mb-2 text-xs text-[#b8b6bc]">
                    Effect Area: <strong className="font-sans font-bold text-[#86d7ff]">{view.preview.area}</strong>
                  </p>
                  <Sections sections={view.preview.sections} inverse={view.preview.inverse} />
                </div>
              </div>
            ) : view ? (
              <div className="prism-preview-empty grid min-h-42.5 place-items-center text-[#9ea7b3]">
                Select options to preview item
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      <footer className={`${FOOTER} flex shrink-0 justify-end gap-3 p-3.5`}>
        <button type="button" className={FOOTER_BUTTON} onClick={() => commands().cancelPrismCraft()}>
          Cancel
        </button>
        <button
          type="button"
          className={FOOTER_BUTTON}
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
