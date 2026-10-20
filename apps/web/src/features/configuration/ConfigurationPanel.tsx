// The Config tab's card: Scenario, exclusive choices, best-case assumptions and Advanced numbers. The data comes from
// the planner (src/app/bridge/view-sources.ts "configuration"); every edit is a planner command, after which the source changes.
import { useState, type ReactNode } from "react";
import { aimUptimeControl } from "@legacy/app/aim-controls.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { combatNumberLimits, type CombatNumber } from "@legacy/engine/state/state-validation.ts";
import type { ConfigurationSource } from "@legacy/app/bridge/view-sources.ts";
import type { ExclusiveChoice } from "@legacy/engine/planner-api.ts";
import { CommitNumberInput } from "../../ui/CommitNumberInput";
import { formatNumber } from "../../ui/format";
import { applicableManualConditions, manualConditionRows } from "./configuration-model";

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
  const section = (key: SectionKey, title: string, body: ReactNode, count?: number, extraClass = "") => (
    <Section
      key={key}
      title={title}
      count={count}
      open={open[key]}
      onToggle={(isOpen) => setOpen((current) => ({ ...current, [key]: isOpen }))}
      extraClass={extraClass}
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
              <p className="stat-sheet-note">This build has no conditions to switch.</p>
            ),
            applicableManualConditions(planner, probe).length,
          )}
    </>
  );

  return (
    <section className="stat-sheet-banner stat-sheet-banner-wide config-banner" aria-label="Configuration">
      <h2>
        Configuration <small>{automatic ? "Best case" : "Manual"}</small>
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
              "best-case-assumptions",
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
  extraClass?: string;
  children: ReactNode;
}

function Section({ title, count, open, onToggle, extraClass, children }: SectionProps) {
  return (
    <details
      className={`stat-section${extraClass ? ` ${extraClass}` : ""}`}
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary>
        <span className="stat-section-title">{title}</span>
        {count == null ? null : <span className="stat-section-count">{count}</span>}
      </summary>
      <div className="stat-section-body">{children}</div>
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
    <label className={`toggle-row${disabled ? " energy-disabled-condition" : ""}`} title={title}>
      <span>
        <strong>{label}</strong>
        {note ? <small>{note}</small> : null}
      </span>
      <input
        type="checkbox"
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
    <div className="config-choice">
      <span>
        <strong>{choice.group}</strong>
        <small>{`20 s DPS · ${figures}`}</small>
      </span>
      <div className="config-segmented" role="group" aria-label={choice.group}>
        {choice.compared.map((option, index) => {
          const selected = option.label === choice.chosen;
          return (
            <button
              key={option.label}
              type="button"
              className={selected ? "active" : ""}
              aria-pressed={selected}
              onClick={() => {
                if (!selected) plannerCommands().pinExclusiveChoice(choice.group, index);
              }}
            >
              {option.label}
              {option.label === best ? <em>best</em> : null}
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
    <label title={title || undefined}>
      <span>{label}</span>
      <CommitNumberInput
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
      <div className="combat-number-controls">
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
        <div className="combat-number-controls">
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
