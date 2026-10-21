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
import {
  EYEBROW,
  familyTint,
  MAX_DIVINITY_BADGE,
  PREVIEW_CAPTION,
  READONLY,
  SLATE_AFFIX_FIELD,
  SLATE_AFFIX_HEADING,
  SLATE_AFFIX_ITEM,
  SLATE_AFFIX_LIMITED,
  SLATE_AFFIX_LIST,
  SLATE_AFFIX_PREVIEW,
  SLATE_AFFIX_ROW,
  SLATE_AFFIX_TREE,
  SLATE_ASIDE,
  SLATE_BUTTON,
  SLATE_CARD,
  SLATE_CARD_ART,
  SLATE_CARD_LEGENDARY,
  SLATE_CARD_RARITY,
  SLATE_CARD_TITLE,
  SLATE_CHIP,
  SLATE_FIELDSET,
  SLATE_LAYOUT,
  SLATE_LEGEND,
  SLATE_PRIMARY,
  SLATE_SECTION,
  SLATE_TRANSFORM,
} from "../../ui/talent-slate-styles";

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

const TAB = "tab px-3 py-2 text-xs font-bold tracking-wider whitespace-nowrap uppercase";
const SHAPE_PREVIEW =
  "slate-shape-preview ml-3.5 grid size-18 flex-none place-items-center overflow-hidden rounded-md border border-line bg-sunken [&>img]:size-14.5 [&>img]:object-contain [&>img]:transition-transform";
const SHAPE_CHOICE = `${SLATE_CHIP} grid size-17 flex-none place-items-center overflow-hidden p-1 [&>img]:size-14.5 [&>img]:object-contain`;
/** A slate preview card's colours: a god's (its family tint), or a Nether King's. */
const CARD_GOD = "border-line border-b-info text-info [&>strong]:text-(--talent-emblem)";
const CARD_NETHER = "border-line border-b-accent-strong text-accent-strong";
const LIMITED_NOTE = "block text-xs text-warn";
const CORE_AFFIX = "-ml-2 rounded-r-sm border-l-3 border-accent bg-accent/10 px-2 py-1.5";
const CORE_BADGE =
  "core-slate-badge mb-1 inline-block rounded-sm border border-accent/60 bg-accent/15 px-1.5 py-0.5 text-[10px] leading-tight font-bold tracking-wider text-accent uppercase";
/** A form's small note (a field's hint, Orientation is fixed). */
const NOTE = "text-xs text-muted";

function AffixSelect({ slot, legendary }: { slot: SlateSlotView; legendary: boolean }) {
  return (
    <select
      ref={(select) => {
        if (select) plannerCommands().registerSlateAffixSelect(select, slot.index);
      }}
      {...(legendary ? { "data-legendary-affix": slot.index } : {})}
      aria-label={slot.ariaLabel ?? undefined}
      className={SLATE_AFFIX_FIELD}
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
    <div className="slate-inventory-actions mt-auto grid shrink-0 grid-cols-[1fr_1.45fr] gap-2.5 pt-3">
      <button
        type="button"
        className={`${SLATE_BUTTON} min-h-11`}
        data-back-slate-inventory=""
        onClick={() => plannerCommands().backToSlateInventory()}
      >
        {editing ? "Cancel" : "Back to Inventory"}
      </button>
      <button
        type="button"
        className={`${SLATE_PRIMARY} min-h-11`}
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
    <div className="slate-transform-options grid gap-1">
      {rotate ? (
        <button
          type="button"
          className={SLATE_TRANSFORM}
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
            className={SLATE_TRANSFORM}
            data-craft-transform="flip-h"
            onClick={() => change({ kind: "transform", operation: "flip-h" })}
          >
            ↔ Flip H
          </button>
          <button
            type="button"
            className={SLATE_TRANSFORM}
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
      className={SHAPE_PREVIEW}
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
        <strong className={MAX_DIVINITY_BADGE} title="Only one copy of this effect is active across equipped slates">
          MAX ACTIVE DIVINITY: 1
        </strong>
        <small className={LIMITED_NOTE}>Duplicates on other slates do not stack.</small>
      </>
    ) : null;
  return (
    <div className={`slate-craft-layout ${SLATE_LAYOUT}`}>
      <section className={SLATE_SECTION}>
        <label className={`slate-field block ${NOTE}`}>
          Name
          <input
            type="text"
            className={`${SLATE_AFFIX_FIELD} mt-2`}
            data-slate-craft-name=""
            placeholder="Custom name (optional)"
            value={form.name}
            onChange={(event) => change({ kind: "name", value: event.target.value })}
          />
        </label>
        <fieldset className={`slate-craft-gods flex flex-wrap gap-2 ${SLATE_FIELDSET}`}>
          <legend className={SLATE_LEGEND}>{form.nether ? "Nether King Type" : "God"}</legend>
          {form.choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              {...(form.nether ? { "data-nether-slate-type": choice.value } : { "data-slate-god": choice.value })}
              className={`${choice.active ? "active" : ""} ${SLATE_CHIP} px-3 py-2 text-sm`}
              onClick={() => change({ kind: form.nether ? "netherType" : "god", value: choice.value })}
            >
              {choice.value}
            </button>
          ))}
        </fieldset>
        <fieldset className={SLATE_FIELDSET}>
          <legend className={SLATE_LEGEND}>Shape &amp; Orientation</legend>
          <div className="slate-shape-options native-slate-assets flex items-center gap-2.25 max-[760px]:flex-wrap">
            {form.shapes.map((shape) => (
              <button
                key={shape.code}
                type="button"
                className={`${shape.active ? "active" : ""} ${SHAPE_CHOICE}`}
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
            <small className={`mt-1.5 block ${NOTE}`}>
              Block grows with filled Brand Talent Nodes
              <br />
              (0–1 → 1 block, 2 → 2, 3 → Authority)
            </small>
          ) : null}
        </fieldset>
        {form.authority ? (
          <fieldset className={SLATE_FIELDSET}>
            <legend className={SLATE_LEGEND}>Authority Effect</legend>
            <input className={`slate-readonly ${READONLY} outline-none`} value={form.authority} readOnly />
            <small className={`my-1.5 block ${NOTE}`}>This slate has a fixed Authority effect</small>
            <p className={`slate-authority-copy ${READONLY} text-text`}>
              Divinity Slates on links between Divinities have 70% increased affix effect.
            </p>
          </fieldset>
        ) : null}
        {form.groups.map((group) => (
          <fieldset key={group.title} className={SLATE_FIELDSET}>
            <legend className={SLATE_LEGEND}>{group.legend}</legend>
            {group.slots.map((slot) => (
              <label key={slot.index} className={SLATE_AFFIX_ROW}>
                <span>{slot.label}</span>
                <AffixSelect slot={slot} legendary={false} />
              </label>
            ))}
          </fieldset>
        ))}
      </section>
      <aside className={SLATE_ASIDE}>
        <span className={`${PREVIEW_CAPTION} text-base`}>Preview</span>
        <div
          className={`${form.card.className} ${SLATE_CARD} grid-cols-[38px_1fr] ${form.nether ? CARD_NETHER : CARD_GOD} ${familyTint(form.card.className)}`}
        >
          <img
            src={form.card.art.src}
            alt={form.card.art.alt}
            className={SLATE_CARD_ART}
            style={turned(form.card.art.transform)}
          />
          <strong className={SLATE_CARD_TITLE}>{form.card.title}</strong>
          <small className={SLATE_CARD_RARITY}>{form.card.rarity}</small>
          <div className={SLATE_AFFIX_PREVIEW} aria-live="polite">
            {form.sections.length ? (
              form.sections.map((section) => (
                <section key={section.title}>
                  <h3 className={SLATE_AFFIX_HEADING}>{section.title}</h3>
                  <ul className={SLATE_AFFIX_LIST}>
                    {section.items.map((item, index) => (
                      <li
                        key={index}
                        className={`${item.limited ? `max-one-divinity ${SLATE_AFFIX_LIMITED}` : ""} ${SLATE_AFFIX_ITEM}`}
                      >
                        <small className={SLATE_AFFIX_TREE}>{item.tree}</small>
                        <span className="block">{item.effect}</span>
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
              <hr className="col-span-full mt-2.5 border-line" />
              <em className="col-span-full mt-2.5 text-[10px] tracking-wider text-dim not-italic">AUTHORITY</em>
              <b className="col-span-full text-xs text-text">{form.authority}</b>
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
    <div className={`slate-craft-layout slate-legendary-detail ${SLATE_LAYOUT}`}>
      <section className={SLATE_SECTION}>
        <p className={`${EYEBROW} mb-2 w-fit`}>Legendary Template</p>
        <div className="slate-legendary-selection flex min-h-19 items-center gap-3.5 rounded-md border border-line bg-raised px-3.5 py-2.5">
          <img
            src={form.icon}
            alt=""
            className="size-16 flex-none rounded-md border border-line-strong bg-sunken object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <strong className="block w-fit text-base text-accent">{form.name}</strong>
            <small className={`mt-1 block ${NOTE}`}>Selected Legendary</small>
          </div>
          <button
            type="button"
            className={SLATE_BUTTON}
            data-change-slate-template=""
            onClick={() => change({ kind: "changeTemplate" })}
          >
            Change
          </button>
          <button type="button" className="active" data-slate-template={form.name} hidden />
        </div>
        <fieldset className={SLATE_FIELDSET}>
          <legend className={SLATE_LEGEND}>Shape &amp; Orientation</legend>
          <div className="slate-shape-options flex items-center gap-2.25">
            <button
              type="button"
              className={`active ${SHAPE_CHOICE}`}
              data-craft-shape={form.shape.code}
              onClick={() => change({ kind: "shape", value: form.shape.code })}
            >
              <img src={form.icon} alt={form.shape.alt} />
            </button>
            <ShapePreview preview={form.preview} />
            {form.transforms ? (
              <TransformButtons rotate={form.transforms.rotate} flip={form.transforms.flip} />
            ) : (
              <small className={`slate-transform-note self-center ${NOTE}`}>Orientation is fixed</small>
            )}
          </div>
        </fieldset>
        <fieldset className={SLATE_FIELDSET}>
          <legend className={SLATE_LEGEND}>{form.legend}</legend>
          {form.notice ? (
            <p
              className="notice mb-2.5 rounded-sm border-l-3 border-accent bg-accent/10 px-3 py-2 text-xs text-text"
              data-pedigree-slot-notice=""
            >
              {form.notice}
            </p>
          ) : null}
          {form.copy ? (
            <label className={SLATE_AFFIX_ROW}>
              <span>Slot 1</span>
              {form.copy.kind === "select" ? (
                <select
                  className={SLATE_AFFIX_FIELD}
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
                <span className={`slate-readonly ${READONLY} text-sm leading-snug`}>{form.copy.text}</span>
              )}
            </label>
          ) : (
            form.slots.map((slot) => (
              <label key={slot.index} className={SLATE_AFFIX_ROW}>
                <span>{slot.label}</span>
                <AffixSelect slot={slot} legendary />
              </label>
            ))
          )}
        </fieldset>
      </section>
      <aside className={SLATE_ASIDE}>
        <span className={`${PREVIEW_CAPTION} text-base`}>Preview</span>
        <div className={`slate-craft-card ${SLATE_CARD} grid-cols-[38px_1fr] ${SLATE_CARD_LEGENDARY}`}>
          <img src={form.icon} alt="" className={SLATE_CARD_ART} style={turned(form.preview.transform)} />
          <strong className={SLATE_CARD_TITLE}>{form.name}</strong>
          <small className={SLATE_CARD_RARITY}>DIVINITY SLATE · LEGENDARY</small>
          <div className={SLATE_AFFIX_PREVIEW}>
            {form.copyPreview ? (
              <section>
                <h3 className={SLATE_AFFIX_HEADING}>Fixed Affix</h3>
                {form.copyPreview.direction ? (
                  <div className="sparks-preview-direction my-2 flex items-center gap-2.25">
                    <span
                      className="sparks-preview-arrow grid size-8 flex-none place-items-center rounded-full border border-accent bg-accent/15 text-xl leading-none font-bold text-accent"
                      {...(sparks ? { "data-sparks-preview-arrow": "" } : { "data-legendary-copy-arrow": "" })}
                      aria-hidden="true"
                    >
                      {form.copyPreview.direction.arrow}
                    </span>
                    <strong
                      className="text-xs leading-tight font-bold text-accent"
                      {...(sparks ? { "data-sparks-preview-direction": "" } : { "data-legendary-copy-label": "" })}
                    >
                      {form.copyPreview.direction.label}
                    </strong>
                  </div>
                ) : null}
                <ul className={SLATE_AFFIX_LIST}>
                  <li className={SLATE_AFFIX_ITEM}>
                    <span className="block" {...ruleAttribute}>
                      {form.copyPreview.rule}
                    </span>
                  </li>
                </ul>
              </section>
            ) : form.talents ? (
              <section>
                <h3 className={SLATE_AFFIX_HEADING}>Talent Affixes</h3>
                <ul className={SLATE_AFFIX_LIST}>
                  {form.talents.map((item, index) => (
                    <li
                      key={index}
                      className={`${item.core ? `core-slate-affix ${CORE_AFFIX}` : ""} ${item.limited ? `max-one-divinity ${SLATE_AFFIX_LIMITED}` : ""} ${SLATE_AFFIX_ITEM}`}
                    >
                      {item.core ? <strong className={CORE_BADGE}>Core Talent</strong> : null}
                      <small className={SLATE_AFFIX_TREE}>{item.tree}</small>
                      <span className="block">{item.effect}</span>
                      {item.limited ? <strong className={MAX_DIVINITY_BADGE}>MAX ACTIVE: 1</strong> : null}
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
          className={`${crafter.tab === tab ? "active" : ""} ${TAB}`}
          data-slate-inventory-tab={tab}
          onClick={() => change({ kind: "tab", tab })}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="picker-close dialog-close ml-auto"
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
      <div className={`slate-template-layout ${SLATE_LAYOUT}`}>
        <section className={SLATE_SECTION}>
          <p className={`mb-3 ${NOTE}`}>Legendary Template</p>
          <div className="slate-template-grid grid grid-cols-[repeat(6,96px)] gap-2.25 max-[760px]:grid-cols-3">
            {body.templates.map((template) => (
              <button
                key={template.name}
                type="button"
                className="grid min-h-22 cursor-pointer grid-rows-[58px_auto] place-items-center rounded-md border border-line bg-raised p-2 text-text hover:border-accent focus-visible:border-accent focus-visible:outline-none"
                data-slate-template={template.name}
                onClick={() => change({ kind: "template", value: template.name })}
              >
                <img src={template.icon} alt="" className="max-h-13 max-w-13 object-contain" />
                <span className="text-center text-xs">{template.name}</span>
              </button>
            ))}
          </div>
        </section>
        <aside className={SLATE_ASIDE}>
          <span className={`${PREVIEW_CAPTION} text-base`}>Preview</span>
          <div className="slate-empty-preview mt-2.5 grid h-50 place-items-center rounded-md border border-dashed border-line-strong text-dim italic">
            Select options to preview slate
          </div>
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
