// The Prism crafter (Craft Prism, Craft First Prism, or Edit in the prism inventory): an Ethereal Prism's base and random
// affixes, or an Inverse Image's mod values, and the preview; Craft / Save Changes and Cancel go back to the inventory.
// The planner opens it and announces the "prismCrafter" source; every control is a planner command. The CSS styles the
// type tabs by data-prism-type and the confirm button by data-confirm-prism-craft, so they stay.
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { PrismCrafterView, PrismSectionView } from "@legacy/app/bridge/prism-crafter-view.ts";
import { LiveNumberInput } from "../../ui/LiveNumberInput";
import { useViewSource } from "../../ui/use-view-source";

const commands = plannerCommands;

function TypeTabs({ view }: { view: PrismCrafterView }) {
  return (
    <div className="prism-type-tabs">
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
          className={view.type === type ? "active" : ""}
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
      <div className="inverse-image-heading">
        <img src={inverse.icon} alt="" />
        <div>
          <strong>Inverse Image</strong>
          <small>Ultimate</small>
        </div>
      </div>
      <p className="inverse-image-description">{inverse.description}</p>
      <p className="inverse-radius">
        Radius: <strong>3x3</strong>
      </p>
      <h3>Mod Values</h3>
      <div className="inverse-rolls">
        {inverse.rolls.map((roll) => (
          <div
            key={roll.kind}
            className={`inverse-roll ${roll.sign}`}
            style={{ "--inverse-start": `${roll.start}%`, "--inverse-end": `${roll.end}%` } as CSSProperties}
          >
            <label htmlFor={`inverse-${roll.kind}`}>{roll.label}</label>
            <LiveNumberInput
              id={`inverse-${roll.kind}`}
              min={roll.min}
              max={roll.max}
              step={1}
              value={roll.value}
              aria-label={roll.label}
              onValue={(value) => commands().setInverseRoll(roll.kind, value)}
            />
            <input
              type="range"
              min={roll.min}
              max={roll.max}
              step={1}
              value={roll.value}
              aria-label={`${roll.label} slider`}
              onChange={(event) => commands().setInverseRoll(roll.kind, Number(event.target.value))}
            />
            <small>
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
      <label className="prism-base-field">
        Base Item *
        <select
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
          <div className="prism-fixed">
            <label>
              {`${ethereal.fixed.label} *`}
              <input value={ethereal.base} readOnly />
            </label>
            <small>{ethereal.fixed.note}</small>
            <p>{ethereal.fixed.effect}</p>
          </div>
          <h3>{`Random Affixes (${ethereal.count}/${ethereal.max})`}</h3>
          {ethereal.selects.map((select) => (
            <label key={select.kind} className="prism-affix-select">
              <span>
                <b className={select.kind}>{select.label}</b>
                <small>{`Only ${select.label} mods`}</small>
              </span>
              <select
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

function Sections({ sections }: { sections: PrismSectionView[] }) {
  return sections.map((section) => (
    <section key={section.className} className={`prism-affix-section ${section.className}`}>
      <h4>{section.heading}</h4>
      {section.lines.map((line) =>
        "value" in line ? (
          <p key={line.kind}>
            {`${line.label}: `}
            <strong className={line.sign}>{line.value}</strong>{" "}
          </p>
        ) : (
          <p key={line.kind}>{`${line.text} `}</p>
        ),
      )}
    </section>
  ));
}

export function PrismCrafterDialog() {
  const view = useViewSource("prismCrafter");
  return (
    <dialog id="prism-crafter-dialog" className="prism-crafter-dialog" aria-labelledby="prism-crafter-title">
      <header>
        <h2 id="prism-crafter-title">{view?.title ?? "Craft Prism"}</h2>
        <button type="button" aria-label="Close Prism crafter" onClick={() => commands().cancelPrismCraft()}>
          ×
        </button>
      </header>
      <div className="prism-crafter-layout">
        <div id="prism-crafter-form">
          {view ? (
            <>
              <TypeTabs view={view} />
              {view.inverse ? <InverseForm inverse={view.inverse} /> : null}
              {view.ethereal ? <EtherealForm ethereal={view.ethereal} /> : null}
            </>
          ) : null}
        </div>
        <aside>
          <span>Preview</span>
          <div id="prism-crafter-preview">
            {view?.preview ? (
              <div className={`prism-preview-card ${view.preview.inverse ? "inverse-preview" : ""}`}>
                <span className="prism-preview-icon">
                  {view.preview.icon ? <img src={view.preview.icon} alt="" /> : "✦"}
                </span>
                <h3>{view.preview.name}</h3>
                <small>{view.preview.inverse ? "INVERSE IMAGE" : "ETHEREAL PRISM"}</small>
                <div>
                  <p className="prism-effect-area">
                    Effect Area: <strong>{view.preview.area}</strong>
                  </p>
                  <Sections sections={view.preview.sections} />
                </div>
              </div>
            ) : view ? (
              <div className="prism-preview-empty">Select options to preview item</div>
            ) : null}
          </div>
        </aside>
      </div>
      <footer>
        <button type="button" onClick={() => commands().cancelPrismCraft()}>
          Cancel
        </button>
        <button
          type="button"
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
