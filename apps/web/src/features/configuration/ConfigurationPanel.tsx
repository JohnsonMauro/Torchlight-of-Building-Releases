// The Config tab's card: Scenario, exclusive choices, best-case assumptions and Advanced numbers. The data comes from
// the planner (src/app/bridge/view-sources.ts "configuration"); every edit is a planner command, after which the source changes.
import { useState, type ReactNode } from "react";
import { aimUptimeControl } from "@legacy/app/configuration/aim-controls.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { combatNumberLimits } from "@legacy/engine/index.ts";
import type { CombatNumber, ExclusiveChoice } from "@legacy/engine/index.ts";
import type { ConfigurationSource } from "@legacy/app/bridge/view-sources.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { formatNumber } from "../../ui/format";
import { applicableManualConditions, manualConditionRows } from "./configuration-model";

// A collapsible group; the one nested in Scenario (Manual conditions) sits closer to its neighbours.
const SECTION =
  "config-section panel break-inside-avoid not-in-[.config-section]:mb-2.5 in-[.config-section]:mt-2 in-[.config-section]:mb-1";
// A switch row; rows are split by hairlines.
const TOGGLE_ROW =
  "toggle-row flex cursor-pointer items-center justify-between gap-3 border-b border-line py-1.5 last:border-b-0";
// A row's text block (toggle rows and choice rows): its title and the dimmer note under it.
const ROW_TEXT = "min-w-0 text-xs leading-snug text-muted";
const ROW_TITLE = "block text-sm font-semibold text-text";
const ROW_NOTE = "block text-xs leading-snug text-dim";
// A group's header: an accent chevron, pointing down while open and right while closed ([[open]>&] is "my <details> is
// open"; group-open would also match a closed group nested in an open one).
const SUMMARY =
  "flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-xs font-bold tracking-wider text-accent uppercase hover:text-accent-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden [[open]>&]:border-b [[open]>&]:border-line before:mr-0.5 before:box-content before:size-1.5 before:flex-none before:-rotate-45 before:border-r-2 before:border-b-2 before:border-current before:transition-transform before:duration-150 before:content-[''] [[open]>&]:before:-mt-1 [[open]>&]:before:rotate-45";
// The on/off switch: a square track, line-coloured when off and accent when on, with a knob that slides right.
const SWITCH =
  "relative m-0.75 ml-1 h-5.25 w-9.5 flex-none cursor-pointer appearance-none rounded-xs bg-line-strong transition-colors duration-200 checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent off:cursor-not-allowed before:absolute before:top-0.75 before:left-0.75 before:size-3.75 before:rounded-xs before:bg-text before:transition-transform before:duration-200 before:content-[''] checked:before:translate-x-4.25 checked:before:bg-on-accent";
// One option of a segmented choice; the pressed one takes the accent.
const SEGMENT =
  "inline-flex cursor-pointer items-center gap-1.5 border-line bg-raised px-3 py-1.5 text-xs font-bold text-muted not-first:border-l hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-pressed:bg-accent/15 aria-pressed:text-accent max-[560px]:flex-[1_1_0] max-[560px]:justify-center";
// The Advanced group's grid of number fields, under a hairline.
const NUMBER_GRID =
  "combat-number-controls mt-1.5 grid grid-cols-2 gap-2.5 border-t border-line pt-2.5 max-[700px]:grid-cols-1";
// A number field of the Advanced group.
const NUMBER_INPUT = "field w-full p-2.5";
// A small caps label beside a title (the mode, the best option).
const TAG = "chip text-[10px] font-bold tracking-wider text-accent uppercase not-italic";

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
              <p className="mb-3 text-xs text-muted">This build has no conditions to switch.</p>
            ),
            applicableManualConditions(planner, probe).length,
          )}
    </>
  );

  return (
    <section
      className="config-banner panel mb-4 grid overflow-hidden px-3.5 pb-3 leading-[normal] compact:pb-2"
      aria-label="Configuration"
    >
      <h2 className="panel-head -mx-3.5 mb-3 min-h-11 px-3.5 text-xs font-bold tracking-wider uppercase compact:mb-2 compact:min-h-9">
        Configuration <small className={`${TAG} px-2 py-0.5`}>{automatic ? "Best case" : "Manual"}</small>
      </h2>
      <div className="config-sections">
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
                  className="mt-1.5 inline-block cursor-pointer text-xs font-bold text-accent-strong no-underline hover:text-accent hover:underline hover:underline-offset-2 focus-visible:text-accent focus-visible:underline focus-visible:underline-offset-2"
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
          <span className="stat-section-count ml-auto text-[10px] font-normal text-dim tabular-nums">{count}</span>
        )}
      </summary>
      <div className="px-3 pt-0.5 pb-1.5">{children}</div>
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
    <div className="config-choice flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-2 last:border-b-0">
      <span className={ROW_TEXT}>
        <strong className={ROW_TITLE}>{choice.group}</strong>
        <small className={ROW_NOTE}>{`20 s DPS · ${figures}`}</small>
      </span>
      <div
        className="config-segmented inline-flex max-w-full flex-wrap overflow-hidden rounded-sm border border-line max-[560px]:flex max-[560px]:w-full"
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
              {option.label === best ? <em className={`${TAG} px-1`}>best</em> : null}
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
    <label className="grid gap-1.5 text-xs text-muted" title={title || undefined}>
      <span className="leading-snug">{label}</span>
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
          <small className="text-xs text-dim">{`Enter effective extra stacks after any Bard Song bonus. Sea Foam uses their sum, capped at 5. Current Tide Effect: +${seaFoam.tideEffectPercent}%${seaFoam.applied ? "" : " · inactive without Tide Contact"}.`}</small>
        </div>
      ) : null}
    </>
  );
}
