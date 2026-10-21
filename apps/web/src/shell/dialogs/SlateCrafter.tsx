// The slate crafter, in the Slate Inventory dialog: the tabs (Craft Slate, Craft Legendary Slate, Nether King) and the
// form of the open one (src/app/slates/slate-craft.ts slateCrafterView), with Back to Inventory / Cancel and Add to
// Inventory / Save Changes. Each control is a change to the planner's draft. An affix select shows only its placeholder,
// the edited slate's value and the last pick: it registers with the planner, whose searchable list shows its choices.
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type {
  SlateAffixItemView,
  SlateCraftChange,
  SlateCraftFormView,
  SlateCrafterView,
  SlateLegendaryFormView,
  SlateSlotView,
  SlateTab,
} from "@legacy/app/slates/slate-craft.ts";

const change = (craftChange: SlateCraftChange) => plannerCommands().changeSlateCrafter(craftChange);
const TABS: [SlateTab, string][] = [
  ["craft", "Craft Slate"],
  ["legendary", "Craft Legendary Slate"],
  ["judgment", "Nether King"],
];
const dataAttributes = (data: Record<string, string> | null) =>
  Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [
      `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
      value,
    ]),
  );
const turned = (transform: string | null) => (transform ? ({ transform } as CSSProperties) : undefined);

function AffixSelect({ slot, legendary }: { slot: SlateSlotView; legendary: boolean }) {
  return (
    <select
      ref={(select) => {
        if (select) plannerCommands().registerSlateAffixSelect(select, slot.index);
      }}
      {...(legendary ? { "data-legendary-affix": slot.index } : {})}
      aria-label={slot.ariaLabel ?? undefined}
      value={slot.value}
      onChange={(event) => change({ kind: "slot", index: slot.index, value: event.target.value })}
    >
      {slot.options.map((option, index) => (
        <option key={index} value={option.value} {...dataAttributes(option.data)}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
function Actions({ editing }: { editing: boolean }) {
  return (
    <div className="slate-inventory-actions">
      <button
        type="button"
        className="button button-secondary"
        data-back-slate-inventory=""
        onClick={() => plannerCommands().backToSlateInventory()}
      >
        {editing ? "Cancel" : "Back to Inventory"}
      </button>
      <button
        type="button"
        className="button"
        data-add-crafted-slate=""
        onClick={() => plannerCommands().addCraftedSlate()}
      >
        {editing ? "Save Changes" : "Add to Inventory"}
      </button>
    </div>
  );
}
function TransformButtons({ rotate, flip }: { rotate: boolean; flip: boolean }) {
  return (
    <div className="slate-transform-options">
      {rotate ? (
        <button
          type="button"
          data-craft-transform="rotate"
          onClick={() => change({ kind: "transform", operation: "rotate" })}
        >
          ↻ Rotate
        </button>
      ) : null}
      {flip ? (
        <>
          <button
            type="button"
            data-craft-transform="flip-h"
            onClick={() => change({ kind: "transform", operation: "flip-h" })}
          >
            ↔ Flip H
          </button>
          <button
            type="button"
            data-craft-transform="flip-v"
            onClick={() => change({ kind: "transform", operation: "flip-v" })}
          >
            ↕ Flip V
          </button>
        </>
      ) : null}
    </div>
  );
}
function ShapePreview({ preview }: { preview: SlateCraftFormView["preview"] }) {
  const orientation = preview.orientation;
  return (
    <span
      className="slate-shape-preview"
      {...(orientation
        ? {
            "data-rotation": String(orientation.rotation),
            "data-flip-x": String(orientation.flipX),
            "data-flip-y": String(orientation.flipY),
          }
        : {})}
    >
      {/* A new shape's art is new markup (the legacy copied the shape button's). */}
      <img
        key={`${preview.src}:${Boolean(preview.transform)}`}
        src={preview.src}
        alt={preview.alt}
        style={turned(preview.transform)}
      />
    </span>
  );
}

function CraftForm({ form, editing }: { form: SlateCraftFormView; editing: boolean }) {
  const limitedNote = (item: SlateAffixItemView) =>
    item.limited ? (
      <>
        <strong className="max-divinity-badge" title="Only one copy of this effect is active across equipped slates">
          MAX ACTIVE DIVINITY: 1
        </strong>
        <small>Duplicates on other slates do not stack.</small>
      </>
    ) : null;
  return (
    <div className="slate-craft-layout">
      <section>
        <label className="slate-field">
          Name
          <input
            type="text"
            data-slate-craft-name=""
            placeholder="Custom name (optional)"
            value={form.name}
            onChange={(event) => change({ kind: "name", value: event.target.value })}
          />
        </label>
        <fieldset className="slate-craft-gods">
          <legend>{form.nether ? "Nether King Type" : "God"}</legend>
          {form.choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              {...(form.nether ? { "data-nether-slate-type": choice.value } : { "data-slate-god": choice.value })}
              className={choice.active ? "active" : ""}
              onClick={() => change({ kind: form.nether ? "netherType" : "god", value: choice.value })}
            >
              {choice.value}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Shape &amp; Orientation</legend>
          <div className="slate-shape-options native-slate-assets">
            {form.shapes.map((shape) => (
              <button
                key={shape.code}
                type="button"
                className={shape.active ? "active" : ""}
                data-craft-shape={shape.code}
                onClick={() => change({ kind: "shape", value: shape.code })}
              >
                <img src={shape.src} alt={shape.alt} />
              </button>
            ))}
            <ShapePreview preview={form.preview} />
            <TransformButtons rotate flip />
          </div>
          {form.nether ? (
            <small>
              Block grows with filled Brand Talent Nodes
              <br />
              (0–1 → 1 block, 2 → 2, 3 → Authority)
            </small>
          ) : null}
        </fieldset>
        {form.authority ? (
          <fieldset>
            <legend>Authority Effect</legend>
            <input className="slate-readonly" value={form.authority} readOnly />
            <small>This slate has a fixed Authority effect</small>
            <p className="slate-authority-copy">
              Divinity Slates on links between Divinities have 70% increased affix effect.
            </p>
          </fieldset>
        ) : null}
        {form.groups.map((group) => (
          <fieldset key={group.title}>
            <legend>{group.legend}</legend>
            {group.slots.map((slot) => (
              <label key={slot.index} className="slate-affix-row">
                <span>{slot.label}</span>
                <AffixSelect slot={slot} legendary={false} />
              </label>
            ))}
          </fieldset>
        ))}
      </section>
      <aside>
        <span>Preview</span>
        <div className={form.card.className}>
          <img src={form.card.art.src} alt={form.card.art.alt} style={turned(form.card.art.transform)} />
          <strong>{form.card.title}</strong>
          <small>{form.card.rarity}</small>
          <div className="slate-craft-affix-preview" aria-live="polite">
            {form.sections.length ? (
              form.sections.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map((item, index) => (
                      <li key={index} className={item.limited ? "max-one-divinity" : ""}>
                        <small>{item.tree}</small>
                        <span>{item.effect}</span>
                        {limitedNote(item)}
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <p>Choose affixes to preview their effects.</p>
            )}
          </div>
          {form.authority ? (
            <>
              <hr />
              <em>AUTHORITY</em>
              <b>{form.authority}</b>
            </>
          ) : null}
        </div>
        <Actions editing={editing} />
      </aside>
    </div>
  );
}

function LegendaryForm({ form, editing }: { form: SlateLegendaryFormView; editing: boolean }) {
  const sparks = form.name === "Sparks of Moth Fire";
  const ruleAttribute = sparks
    ? { "data-sparks-preview-rule": "" }
    : form.name === "Residence of Stars"
      ? {}
      : { "data-legendary-copy-preview": "" };
  return (
    <div className="slate-craft-layout slate-legendary-detail">
      <section>
        <p className="eyebrow">Legendary Template</p>
        <div className="slate-legendary-selection">
          <img src={form.icon} alt="" />
          <div>
            <strong>{form.name}</strong>
            <small>Selected Legendary</small>
          </div>
          <button
            type="button"
            className="button button-secondary"
            data-change-slate-template=""
            onClick={() => change({ kind: "changeTemplate" })}
          >
            Change
          </button>
          <button type="button" className="active" data-slate-template={form.name} hidden />
        </div>
        <fieldset>
          <legend>Shape &amp; Orientation</legend>
          <div className="slate-shape-options">
            <button
              type="button"
              className="active"
              data-craft-shape={form.shape.code}
              onClick={() => change({ kind: "shape", value: form.shape.code })}
            >
              <img src={form.icon} alt={form.shape.alt} />
            </button>
            <ShapePreview preview={form.preview} />
            {form.transforms ? (
              <TransformButtons rotate={form.transforms.rotate} flip={form.transforms.flip} />
            ) : (
              <small className="slate-transform-note">Orientation is fixed</small>
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend>{form.legend}</legend>
          {form.notice ? (
            <p className="notice" data-pedigree-slot-notice="">
              {form.notice}
            </p>
          ) : null}
          {form.copy ? (
            <label className="slate-affix-row">
              <span>Slot 1</span>
              {form.copy.kind === "select" ? (
                <select
                  {...(sparks ? { "data-sparks-copy-rule": "" } : { "data-legendary-copy-rule": "" })}
                  aria-label={form.copy.ariaLabel}
                  value={form.copy.value}
                  onChange={(event) => change({ kind: "copyRule", value: event.target.value })}
                >
                  {form.copy.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="slate-readonly">{form.copy.text}</span>
              )}
            </label>
          ) : (
            form.slots.map((slot) => (
              <label key={slot.index} className="slate-affix-row">
                <span>{slot.label}</span>
                <AffixSelect slot={slot} legendary />
              </label>
            ))
          )}
        </fieldset>
      </section>
      <aside>
        <span>Preview</span>
        <div className="slate-craft-card">
          <img src={form.icon} alt="" style={turned(form.preview.transform)} />
          <strong>{form.name}</strong>
          <small>DIVINITY SLATE · LEGENDARY</small>
          <div className="slate-craft-affix-preview">
            {form.copyPreview ? (
              <section>
                <h3>Fixed Affix</h3>
                {form.copyPreview.direction ? (
                  <div className="sparks-preview-direction">
                    <span
                      className="sparks-preview-arrow"
                      {...(sparks ? { "data-sparks-preview-arrow": "" } : { "data-legendary-copy-arrow": "" })}
                      aria-hidden="true"
                    >
                      {form.copyPreview.direction.arrow}
                    </span>
                    <strong
                      {...(sparks ? { "data-sparks-preview-direction": "" } : { "data-legendary-copy-label": "" })}
                    >
                      {form.copyPreview.direction.label}
                    </strong>
                  </div>
                ) : null}
                <ul>
                  <li>
                    <span {...ruleAttribute}>{form.copyPreview.rule}</span>
                  </li>
                </ul>
              </section>
            ) : form.talents ? (
              <section>
                <h3>Talent Affixes</h3>
                <ul>
                  {form.talents.map((item, index) => (
                    <li
                      key={index}
                      className={`${item.core ? "core-slate-affix" : ""} ${item.limited ? "max-one-divinity" : ""}`}
                    >
                      {item.core ? <strong className="core-slate-badge">Core Talent</strong> : null}
                      <small>{item.tree}</small>
                      <span>{item.effect}</span>
                      {item.limited ? <strong className="max-divinity-badge">MAX ACTIVE: 1</strong> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p>Choose affixes to preview their effects.</p>
            )}
          </div>
        </div>
        <Actions editing={editing} />
      </aside>
    </div>
  );
}

/** The crafter's tabs (the dialog's header) and form (its body). */
export function SlateCrafterHeader({ crafter }: { crafter: SlateCrafterView }) {
  return (
    <>
      {TABS.map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          className={crafter.tab === tab ? "active" : ""}
          data-slate-inventory-tab={tab}
          onClick={() => change({ kind: "tab", tab })}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="picker-close"
        data-close-slate-inventory=""
        aria-label="Close slate inventory"
        onClick={(event) => event.currentTarget.closest("dialog")?.close()}
      >
        ×
      </button>
    </>
  );
}
export function SlateCrafterBody({ crafter }: { crafter: SlateCrafterView }) {
  const { body, editing } = crafter;
  if (body.kind === "templates")
    return (
      <div className="slate-template-layout">
        <section>
          <p>Legendary Template</p>
          <div className="slate-template-grid">
            {body.templates.map((template) => (
              <button
                key={template.name}
                type="button"
                data-slate-template={template.name}
                onClick={() => change({ kind: "template", value: template.name })}
              >
                <img src={template.icon} alt="" />
                <span>{template.name}</span>
              </button>
            ))}
          </div>
        </section>
        <aside>
          <span>Preview</span>
          <div className="slate-empty-preview">Select options to preview slate</div>
          <Actions editing={editing} />
        </aside>
      </div>
    );
  // A drawing is new markup, as the legacy crafter's was (no style left over from a turned slate).
  return body.kind === "legendary" ? (
    <LegendaryForm key={crafter.drawing} form={body} editing={editing} />
  ) : (
    <CraftForm key={crafter.drawing} form={body} editing={editing} />
  );
}
