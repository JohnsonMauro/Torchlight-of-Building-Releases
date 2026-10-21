// The Config tab's card: Scenario, exclusive choices, best-case assumptions and Advanced numbers. The data comes from
// the planner (src/app/bridge/view-sources.ts "configuration"); every edit is a planner command, after which the source changes.
import { useState, type ReactNode } from "react";
import { aimUptimeControl } from "@legacy/app/configuration/aim-controls.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { combatNumberLimits, type CombatNumber } from "@legacy/engine/state/state-validation.ts";
import type { ConfigurationSource } from "@legacy/app/bridge/view-sources.ts";
import type { ExclusiveChoice } from "@legacy/engine/planner-api.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { formatNumber } from "../../ui/format";
import { applicableManualConditions, manualConditionRows } from "./configuration-model";

// A collapsible group; the one nested in Scenario (Manual conditions) sits closer to its neighbours.
const SECTION =
  "config-section break-inside-avoid rounded border border-white/8 bg-[#18232e] not-in-[.config-section]:mb-[0.6rem] in-[.config-section]:mt-[0.45rem] in-[.config-section]:mb-[0.3rem]";
// A switch row; rows are split by hairlines.
const TOGGLE_ROW =
  "toggle-row flex cursor-pointer items-center justify-between gap-[0.8rem] border-b border-white/7 py-[0.4rem] last:border-b-0";
// A row's text block (toggle rows and choice rows): its title and the muted note under it.
const ROW_TEXT = "min-w-0 text-[0.74rem] leading-[1.4] text-[#bfcbd5]";
const ROW_TITLE = "block text-[0.78rem] font-semibold text-[#e9f4ff]";
const ROW_NOTE = "block text-[0.66rem] leading-[1.35] text-[#8ea0ad]";
// A group's header: an ember chevron, pointing down while open and right while closed ([[open]>&] is "my <details> is
// open"; group-open would also match a closed group nested in an open one).
const SUMMARY =
  "flex cursor-pointer list-none items-center gap-2 rounded bg-[#303c49] px-3 py-2 font-serif text-[0.8rem] tracking-wider text-[#f1f5f8] uppercase hover:text-[#ffd39b] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] [&::-webkit-details-marker]:hidden [[open]>&]:rounded-b-none before:mr-0.5 before:box-content before:size-1.5 before:flex-none before:-rotate-45 before:border-r-2 before:border-b-2 before:border-[#ffbd82] before:transition-transform before:duration-150 before:content-[''] [[open]>&]:before:-mt-1 [[open]>&]:before:rotate-45";
// The on/off switch: a square track, grey when off and orange when on, with a white knob that slides right.
const SWITCH =
  "relative m-[3px] ml-1 h-5.25 w-9.5 flex-none cursor-pointer appearance-none rounded-xs bg-[#343b46] transition-colors duration-200 checked:bg-[#e57d27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbd82] off:cursor-not-allowed before:absolute before:top-0.75 before:left-0.75 before:size-3.75 before:rounded-[1px] before:bg-white before:transition-transform before:duration-200 before:content-[''] checked:before:translate-x-4.25";
// One option of a segmented choice; the pressed one is ember with an underline.
const SEGMENT =
  "inline-flex cursor-pointer items-center gap-[0.4rem] border-[#3b4a59] bg-[#18232e] px-[0.7rem] py-[0.35rem] text-[0.72rem] font-bold text-[#a9bac8] not-first:border-l hover:text-[#dcebf5] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffbd82] aria-pressed:bg-[#2a2015] aria-pressed:text-[#ffbd82] aria-pressed:shadow-[inset_0_-2px_0_#f09a42] max-[560px]:flex-[1_1_0] max-[560px]:justify-center";
// The Advanced group's grid of number fields, under a hairline.
const NUMBER_GRID =
  "combat-number-controls mt-[0.4rem] grid grid-cols-2 gap-[0.65rem] border-t border-white/7 pt-[0.6rem] max-[700px]:grid-cols-1";
// A number field of the Advanced group.
const NUMBER_INPUT =
  "w-full rounded-lg border border-line bg-[#08131f] p-[0.65rem] text-text focus:border-frost focus:outline-2 focus:outline-[rgb(101_226_255/0.45)]";

type SectionKey = "scenario" | "manual" | "choices" | "assumptions" | "advanced";
// Open until closed: Scenario and the choices; closed until opened: the rest. Kept across re-renders and builds.
const INITIALLY_OPEN: Record<SectionKey, boolean> = {
  scenario: true,
  manual: false,
  choices: true,
  assumptions: false,
  advanced: false,
};

export function ConfigurationPanel({ planner, combat, probe, activeNames }: ConfigurationSource) {
  const [open, setOpen] = useState(INITIALLY_OPEN);
  const section = (key: SectionKey, title: string, body: ReactNode, count?: number) => (
    <Section
      key={key}
      title={title}
      count={count}
      open={open[key]}
      onToggle={(isOpen) => setOpen((current) => ({ ...current, [key]: isOpen }))}
    >
      {body}
    </Section>
  );
  const commands = plannerCommands();
  const automatic = combat.conditionMode !== "manual";
  const prebuilt = planner.conditions.prebuiltSelfBuffs !== false;
  const choices = automatic ? planner.assumptions : [];
  const bestCase = planner.bestCaseAssumptions;
  const manualRows = automatic ? [] : manualConditionRows(planner, probe, activeNames);

  const scenario = (
    <>
      <ToggleRow
        label="Best case"
        note="Conditions this build can create are on. Off: only what you switch on below."
        checked={automatic}
        onChange={(on) => commands.setBestCaseMode(on)}
      />
      <ToggleRow
        label="Own buffs built before the fight"
        note={
          prebuilt
            ? "Channel stacks and other own buffs start full; the dummy starts clean"
            : "Windows start cold: channel stacks at their minimum"
        }
        checked={prebuilt}
        onChange={(on) => commands.setCombatCondition("prebuiltSelfBuffs", on)}
      />
      {automatic
        ? null
        : section(
            "manual",
            "Manual conditions",
            manualRows.length ? (
              manualRows.map((row) => (
                <ToggleRow
                  key={row.id}
                  label={row.label}
                  note={row.note}
                  checked={row.checked}
                  disabled={row.disabled}
                  onChange={(on) => commands.setCombatCondition(row.id, on)}
                />
              ))
            ) : (
              <p className="mb-3 text-[0.75rem] leading-normal text-[#9cadb9]">
                This build has no conditions to switch.
              </p>
            ),
            applicableManualConditions(planner, probe).length,
          )}
    </>
  );

  return (
    <section
      className="config-banner mb-4 grid overflow-hidden rounded-[5px] border border-l-3 border-[#3b4a59] border-l-[#db9850] bg-[linear-gradient(180deg,#27333f,#1f2a36_55%,#1b2531)] px-3.5 pb-3 leading-[normal] shadow-[0_14px_34px_rgb(0_0_0/0.26)] compact:pb-2"
      aria-label="Configuration"
    >
      <h2 className="-mx-3.5 mb-[0.8rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem] border-b border-white/8 bg-[linear-gradient(90deg,#36434f,#2c3845_60%,#303c49)] px-3.5 py-2.25 font-serif text-base/[normal] font-semibold tracking-[0.07em] text-[#f6f1e7] uppercase compact:mb-2 compact:py-1.5 compact:text-[0.88rem]">
        Configuration{" "}
        <small className="rounded-[3px] border border-bronze bg-[#2d241a] px-2 py-[0.14rem] font-sans text-[0.62rem] font-bold tracking-[0.08em] text-[#ffd39b] uppercase">
          {automatic ? "Best case" : "Manual"}
        </small>
      </h2>
      <div className="config-sections pt-[0.1rem]">
        {section("scenario", "Scenario", scenario)}
        {choices.length
          ? section(
              "choices",
              "Choices that can't both hold",
              choices.map((choice) => <ChoiceRow key={choice.group} choice={choice} />),
              choices.length,
            )
          : null}
        {bestCase.length
          ? section(
              "assumptions",
              "Best-case assumptions",
              <>
                {bestCase.map((item) => (
                  <ToggleRow
                    key={item.toggle}
                    label={item.label}
                    note={item.note || item.text}
                    title={item.text}
                    checked={item.on !== false}
                    onChange={(on) => commands.setBestCaseAssumption(item.toggle, on)}
                  />
                ))}
                <a
                  href="#"
                  className="mt-[0.35rem] inline-block cursor-pointer text-[0.78rem] font-bold text-ember no-underline hover:text-[#ffbd82] hover:underline hover:underline-offset-2 focus-visible:text-[#ffbd82] focus-visible:underline focus-visible:underline-offset-2"
                  data-best-case-reset=""
                  onClick={(event) => {
                    event.preventDefault();
                    commands.resetBestCaseAssumptions();
                  }}
                >
                  Reset to best case
                </a>
              </>,
              bestCase.length,
            )
          : null}
        {section("advanced", "Advanced", <Advanced planner={planner} combat={combat} />)}
      </div>
    </section>
  );
}

interface SectionProps {
  title: string;
  count?: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

function Section({ title, count, open, onToggle, children }: SectionProps) {
  return (
    <details className={SECTION} open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary className={SUMMARY}>
        <span className="stat-section-title min-w-0">{title}</span>
        {count == null ? null : (
          <span className="stat-section-count ml-auto font-sans text-[0.62rem] tracking-[0.04em] text-[#8ea0ad] tabular-nums">
            {count}
          </span>
        )}
      </summary>
      <div className="px-3 pt-[0.15rem] pb-[0.35rem]">{children}</div>
    </details>
  );
}

interface ToggleRowProps {
  label: string;
  note?: string;
  title?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}

function ToggleRow({ label, note, title, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className={disabled ? `${TOGGLE_ROW} opacity-55` : TOGGLE_ROW} title={title}>
      <span className={ROW_TEXT}>
        <strong className={ROW_TITLE}>{label}</strong>
        {note ? <small className={ROW_NOTE}>{note}</small> : null}
      </span>
      <input
        type="checkbox"
        className={SWITCH}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

/** An exclusive choice group: the options with their 20 s DPS; the chosen one pressed, the best one marked. */
function ChoiceRow({ choice }: { choice: ExclusiveChoice }) {
  const best = choice.best ?? choice.chosen;
  const figures = choice.compared
    .map((option) => `${option.label}: ${formatNumber(option.twentySecondDps)}`)
    .join(" · ");
  return (
    <div className="config-choice flex flex-wrap items-center justify-between gap-x-4 gap-y-[0.45rem] border-b border-white/7 py-[0.45rem] last:border-b-0">
      <span className={ROW_TEXT}>
        <strong className={ROW_TITLE}>{choice.group}</strong>
        <small className={ROW_NOTE}>{`20 s DPS · ${figures}`}</small>
      </span>
      <div
        className="config-segmented inline-flex max-w-full flex-wrap overflow-hidden rounded border border-[#3b4a59] max-[560px]:flex max-[560px]:w-full"
        role="group"
        aria-label={choice.group}
      >
        {choice.compared.map((option, index) => {
          const selected = option.label === choice.chosen;
          return (
            <button
              key={option.label}
              type="button"
              className={`${SEGMENT}${selected ? " active" : ""}`}
              aria-pressed={selected}
              onClick={() => {
                if (!selected) plannerCommands().pinExclusiveChoice(choice.group, index);
              }}
            >
              {option.label}
              {option.label === best ? (
                <em className="rounded-[3px] border border-bronze bg-[#2d241a] px-[0.32rem] py-[0.04rem] text-[0.58rem] tracking-[0.06em] text-[#ffd39b] uppercase not-italic">
                  best
                </em>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  /** The combat number it sets; none for a figure shown read-only. */
  field?: CombatNumber;
  max?: number;
  step?: number;
  readOnly?: boolean;
  title?: string;
}

function NumberField({ label, value, field, max, step = 1, readOnly = false, title }: NumberFieldProps) {
  const limits = field ? combatNumberLimits[field] : null;
  return (
    <label className="grid gap-[0.35rem] text-[0.72rem] text-muted" title={title || undefined}>
      <span className="text-[0.7rem] leading-[1.45] text-[#a9bac8]">{label}</span>
      <CommitNumberInput
        className={NUMBER_INPUT}
        key={String(value ?? "")}
        value={value}
        min={limits?.min}
        max={max ?? limits?.max}
        step={step}
        readOnly={readOnly}
        onCommit={field && !readOnly ? (text) => plannerCommands().setCombatValue(field, text) : undefined}
      />
    </label>
  );
}

function Advanced({ planner, combat }: Pick<ConfigurationSource, "planner" | "combat">) {
  const commands = plannerCommands();
  const aimUptime = aimUptimeControl(combat.aimUptimePercent, planner.aim);
  const chargeSources = (planner.aim.chargeSources ?? [])
    .map((entry) => `${entry.source}: +${entry.value}`)
    .join(" · ");
  const seaFoam = planner.seaFoamNocturne;
  return (
    <>
      {planner.firesAllure.active ? (
        <ToggleRow
          label="Fire's Allure · enemy within 10 m"
          checked={combat.conditions.firesAllureNearby !== false}
          onChange={(on) => commands.setCombatCondition("firesAllureNearby", on)}
        />
      ) : null}
      {planner.aim.active ? (
        <ToggleRow
          label="Aim uptime · Auto"
          note={aimUptime.label}
          checked={aimUptime.auto}
          onChange={(on) => commands.setAimUptimeAuto(on)}
        />
      ) : null}
      <div className={NUMBER_GRID}>
        {planner.firesAllure.active ? (
          <NumberField
            label="Scorch stacks for resistance reduction (best case by default)"
            field="firesAllureScorchStacks"
            value={combat.firesAllureScorchStacks ?? planner.igniteLimit}
            max={planner.igniteLimit}
          />
        ) : null}
        <NumberField
          label="Allies affected by aura (Safety in Numbers)"
          field="auraAffectedAllies"
          value={combat.auraAffectedAllies ?? 1}
        />
        <NumberField label="Average Affliction" field="afflictionAverage" value={combat.afflictionAverage} />
        <NumberField label="Peak Affliction" field="afflictionPeak" value={combat.afflictionPeak} />
        <NumberField
          label="Target Fire Resistance %"
          field="targetFireResistancePercent"
          value={combat.targetFireResistancePercent}
        />
        <NumberField label="Aim Max Charges (derived)" value={planner.aim.maxCharges} readOnly title={chargeSources} />
        <NumberField label="Well-Fought Battle stacks" field="aimBattleStacks" value={combat.aimBattleStacks ?? 3} />
        <NumberField
          label={`Aim uptime %${aimUptime.auto ? " (auto)" : " (manual)"}`}
          field="aimUptimePercent"
          value={aimUptime.value}
          step={0.01}
          readOnly={aimUptime.auto}
          title={aimUptime.label}
        />
        <NumberField label="Idyll stacks" field="idyllStacks" value={combat.idyllStacks} />
      </div>
      {seaFoam.selected ? (
        <div className={NUMBER_GRID}>
          <NumberField
            label="Extra max Channeled Stacks · Sea Foam"
            field="extraMaxChanneledStacks"
            value={combat.extraMaxChanneledStacks}
          />
          <NumberField
            label="Extra min/initial Channeled Stacks · Sea Foam"
            field="extraInitialChanneledStacks"
            value={combat.extraInitialChanneledStacks}
          />
          <small>{`Enter effective extra stacks after any Bard Song bonus. Sea Foam uses their sum, capped at 5. Current Tide Effect: +${seaFoam.tideEffectPercent}%${seaFoam.applied ? "" : " · inactive without Tide Contact"}.`}</small>
        </div>
      ) : null}
    </>
  );
}
