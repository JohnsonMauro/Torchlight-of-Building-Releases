// The Skills section of the Build page: the setup count, the Energy allocator, and the skill board (Skills and Auras tabs,
// each row's skill, supports and Energy, the aura reservation, Reset Skills). The data is the planner's "skills" source
// (src/app/bridge/skills-view-model.ts); every edit is a planner command. A support drop finds its socket by
// data-selector-row and data-selector-support-slot inside #skill-groups.
import type { CSSProperties, MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { SkillBoardTab, SkillRowView, SkillsView } from "@legacy/app/bridge/skills-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import type { TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";
import { SkillTooltip } from "./SkillTooltip";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";

const TABS: { tab: SkillBoardTab; label: string }[] = [
  { tab: "skills", label: "Skills" },
  { tab: "auras", label: "Auras" },
];

// The two panels inside the section card.
const PANEL = "panel m-3 leading-[normal]";

export function SkillSetupCount() {
  const view = useViewSource("skills");
  return <>{view ? view.setupCount : "—"}</>;
}

export function EnergyPanel() {
  const view = useViewSource("skills");
  const energy = view?.energy;
  const style = energy
    ? ({ "--energy-ratio": `${Math.min(100, (energy.used / energy.available) * 100)}%` } as CSSProperties)
    : undefined;
  return (
    <section
      className={`energy-panel group ${PANEL} px-4 py-4 ${energy && energy.used > energy.available ? "overused" : ""}`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line pb-2.5">
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wider text-accent uppercase">Activation budget</p>
          <h2 className="font-display text-lg font-semibold">Energy allocator</h2>
        </div>
        <div className="flex items-baseline gap-2">
          <strong id="energy-total" className="text-2xl text-info group-[.overused]:text-danger">
            {energy ? `${energy.used}/${energy.available}` : "—"}
          </strong>
          <span className="text-sm text-muted">used / available</span>
        </div>
      </div>
      <div
        id="energy-meter"
        className="mt-2 h-2 overflow-hidden rounded-full bg-sunken group-[.overused]:bg-danger/15"
        style={style}
      >
        <i className="block h-full w-(--energy-ratio) bg-info transition-[width] duration-200 group-[.overused]:bg-danger" />
      </div>
    </section>
  );
}

export function SkillBoard() {
  const view = useViewSource("skills");
  const tab = view?.tab ?? "skills";
  return (
    <section className={`${PANEL} p-5 max-[520px]:p-4 min-[1101px]:flex min-[1101px]:min-h-180 min-[1101px]:flex-col`}>
      <div className="compendium-tabs mb-3 flex gap-4 border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.tab}
            type="button"
            className={`tab px-4 py-3 text-xs font-bold tracking-wider uppercase ${entry.tab === tab ? "active" : ""}`}
            aria-pressed={entry.tab === tab}
            onClick={() => plannerCommands().setSkillBoardTab(entry.tab)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[64px_76px_repeat(5,minmax(0,1fr))_58px] items-center px-3 pb-2 text-center text-xs text-muted max-[720px]:hidden">
        <span />
        <span />
        <span>0</span>
        <span>10</span>
        <span>15</span>
        <span>50</span>
        <span>100</span>
        <strong className="font-medium text-accent">Energy</strong>
      </div>
      <div id="skill-groups" className="grid gap-2 rounded-md bg-sunken p-2">
        {view ? <BoardRows view={view} /> : null}
      </div>
      <ReservationSummary view={view} />
      <footer className="mt-3 flex items-center justify-end rounded-md border border-line px-3 py-2.5 min-[1101px]:mt-auto">
        <button
          className="btn h-10 w-32 px-3 text-xs font-bold tracking-wide uppercase"
          type="button"
          data-reset-skills=""
          onClick={() => plannerCommands().resetSkills()}
        >
          Reset Skills
        </button>
      </footer>
    </section>
  );
}

interface SkillDragSource {
  tab: SkillBoardTab;
  from: number;
}
interface SupportDragSource {
  tab: SkillBoardTab;
  fromRow: number;
  fromSlot: number;
  setupKey: string;
}
const supportKey = (row: number, slot: number) => `${row}:${slot}`;

// A board row: skill, name, five supports, Energy. The supports shrink when the column is too narrow for 42px sockets
// (the legacy kept 42px and the row overflowed its board below 1100px); under 720px they drop to a second line. Every
// state (drop target, dragging, trait-granted, curse limit, empty) is chosen here in JS: the e2e tests read the hook
// classes (skill-drop-target, skill-dragging, support-drag-source, support-drop-target), so no utility may spell them.
const ROW =
  "group grid min-h-22 grid-cols-[64px_76px_minmax(0,1fr)_58px] items-center rounded-md border px-3 py-2 max-[720px]:grid-cols-[54px_minmax(0,1fr)_42px] max-[720px]:gap-y-2 max-[720px]:p-2";
// A row's frame: tinted with info while a dragged skill is over it; a danger outline when its curse cannot apply.
function rowFrame(dropTarget: boolean, curseLimit: boolean) {
  const outline = curseLimit ? " outline-2 outline-offset-1 outline-danger" : "";
  return `${dropTarget ? "border-info bg-info/10" : "border-line bg-surface"}${outline}`;
}
const PRIMARY_SOCKET =
  "relative grid size-16 place-items-center overflow-hidden rounded-full border p-0 text-muted max-[720px]:size-13";
// The active skill's round socket: dashed when empty, grabbed to reorder (lifted while dragged), info-tinted when a trait
// grants the skill, ringed in danger when its curse cannot apply.
function primarySocketState(state: { filled: boolean; granted: boolean; dragging: boolean; curseLimit: boolean }) {
  if (state.granted) return "cursor-default border-info bg-info/10";
  const look = state.filled ? "cursor-grab touch-none" : "cursor-pointer opacity-80";
  const frame = "border-dashed border-line-strong bg-sunken";
  if (state.dragging) return `${frame} pointer-events-none z-30 cursor-grabbing opacity-85 shadow-lg shadow-shadow`;
  return `${frame} ${look}${state.curseLimit ? " ring-2 ring-danger" : ""}`;
}
// The line that links a row's five support sockets.
const SUPPORT_LINE =
  "before:absolute before:inset-x-[10%] before:top-1/2 before:z-0 before:h-0.5 before:-translate-y-1/2 before:bg-line before:content-['']";
// The art inside a frame: the image covers it, the frame's ◆ shows only when there is no image.
const FRAMED_IMAGE =
  "[&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:max-w-none [&>img]:object-cover [&>img+span]:invisible [&>span]:relative [&>span]:z-0";
const SKILL_ART = `skill-glyph relative grid size-14.5 place-items-center overflow-hidden rounded-full border border-line-strong bg-raised text-accent-strong max-[720px]:size-11.5 [&>img]:rounded-full ${FRAMED_IMAGE}`;
const SUPPORT_SOCKET =
  "relative z-1 grid aspect-square w-[min(42px,100%)] place-items-center justify-self-center rounded-full border-2 p-0 text-muted max-[720px]:w-[min(34px,100%)]";
// A support socket: a "+" when empty (accent-strong on hover), dimmed while its support is dragged, info-tinted as a drop
// target or when a trait grants the support.
function supportSocketState(state: {
  filled: boolean;
  enabled: boolean;
  granted: boolean;
  dragSource: boolean;
  dropTarget: boolean;
}) {
  const dimmed = state.dragSource ? " opacity-35" : "";
  if (state.dropTarget) return `cursor-grab border-info bg-info/15${dimmed}`;
  if (state.granted) return "cursor-default border-info bg-info/10";
  if (state.filled) return `cursor-grab touch-none border-line-strong bg-sunken${dimmed}`;
  if (!state.enabled) return "border-line bg-sunken";
  return "cursor-pointer border-line-strong bg-sunken text-lg hover:border-accent-strong hover:text-accent-strong";
}
// The support that follows the pointer while dragged (a clone of the socket appended to <body>); "+" when copying.
const SUPPORT_GHOST =
  "support-drag-ghost pointer-events-none fixed z-10020 grid size-11.5 -translate-1/2 place-items-center rounded-full border-2 border-accent bg-raised shadow-lg shadow-shadow [&.copying]:after:absolute [&.copying]:after:-right-2 [&.copying]:after:-bottom-2 [&.copying]:after:grid [&.copying]:after:size-5 [&.copying]:after:place-items-center [&.copying]:after:rounded-full [&.copying]:after:bg-ok [&.copying]:after:font-bold [&.copying]:after:text-bg [&.copying]:after:content-['+']";
const SUPPORT_ART = `lane-support-art relative block size-full overflow-hidden rounded-full max-[1100px]:size-7.25 [.support-drag-ghost_&]:size-9.5 [&>img]:scale-[1.14] ${FRAMED_IMAGE}`;

function BoardRows({ view }: { view: SkillsView }) {
  const commands = plannerCommands();
  const skillDrag = usePointerDrag<SkillDragSource>({
    targetAt: (element) =>
      element?.closest("#skill-groups [data-skill-board-row]")?.getAttribute("data-skill-board-row") ?? null,
    onStart: () => hideTooltip(),
    onDrop: (source, target) => commands.moveSkill(source.tab, source.from, Number(target)),
    onInvalidDrop: () => commands.showToast("Invalid drop · skill returned to its original slot"),
  });
  const supportDrag = usePointerDrag<SupportDragSource>({
    targetAt: (element) => {
      const socket = element?.closest("#skill-groups .skill-support-socket:not(:disabled)");
      const row = socket?.getAttribute("data-selector-row"),
        slot = socket?.getAttribute("data-selector-support-slot");
      return row != null && slot != null ? supportKey(Number(row), Number(slot)) : null;
    },
    copyOnRightClick: true,
    ghost: (element) => {
      const ghost = element.cloneNode(true) as HTMLElement;
      ghost.className = SUPPORT_GHOST;
      return ghost;
    },
    bodyClass: "support-dragging",
    onStart: () => hideTooltip(),
    onDrop: (source, target, duplicate) => {
      const [toRow, toSlot] = target.split(":").map(Number);
      commands.moveSupport({ ...source, toRow, toSlot, duplicate });
    },
    onInvalidDrop: () => commands.showToast("Invalid drop · support returned to its slot"),
  });

  const removeOnRightClick = (event: MouseEvent, remove: () => boolean) => {
    if (remove()) event.preventDefault();
  };

  return view.rows.map((row) => {
    const skill = row.skill;
    const curseLimit = Boolean(skill?.inactiveReason || skill?.curseOffReason);
    const dropTarget = skillDrag.target === String(row.row);
    const dragging = skillDrag.source === String(row.row);
    const rowClasses = `${skill?.grantedBy ? " trait-granted-row" : ""}${dropTarget ? " skill-drop-target" : ""}`;
    const socketState = primarySocketState({ filled: !!skill, granted: !!skill?.grantedBy, dragging, curseLimit });
    return (
      <article
        key={row.row}
        className={`${ROW} ${rowFrame(dropTarget, curseLimit)}${rowClasses}`}
        data-skill-board-row={row.row}
      >
        <OptionalSkillTooltip row={row.row} skill={skill?.name ?? null}>
          <button
            type="button"
            className={`skill-primary-socket ${PRIMARY_SOCKET} ${socketState}${skill ? "" : " empty-skill-slot"}${dragging ? " skill-dragging" : ""}`}
            data-selector-row={row.row}
            title={skill ? undefined : "Select skill"}
            aria-label={row.label}
            onClick={() => {
              if (skillDrag.swallowClick() || skill?.grantedBy) return;
              commands.openSkillSelector(row.row, null);
            }}
            onContextMenu={(event) => {
              if (!skill?.grantedBy) removeOnRightClick(event, () => commands.removeSkill(row.row));
            }}
            onPointerDown={
              skill?.draggable
                ? (event) => skillDrag.start(event, String(row.row), { tab: view.tab, from: row.row })
                : undefined
            }
          >
            {skill ? <Artwork src={skill.art} alt={skill.name} className={SKILL_ART} /> : "−"}
          </button>
        </OptionalSkillTooltip>
        <RowName row={row} />
        <div className={`relative grid grid-cols-5 items-center max-[720px]:col-span-full ${SUPPORT_LINE}`}>
          {row.supports.map((support) => {
            const key = supportKey(row.row, support.slot);
            const dragSource = supportDrag.source === key;
            const supportDropTarget = supportDrag.target === key;
            const state = supportSocketState({
              filled: !!support.name,
              enabled: !!skill,
              granted: !!support.grantedBy,
              dragSource,
              dropTarget: supportDropTarget,
            });
            return (
              <OptionalSkillTooltip
                key={support.slot}
                row={row.row}
                skill={skill?.name ?? null}
                support={support.name}
                hint={support.title}
              >
                <button
                  type="button"
                  className={`skill-support-socket ${SUPPORT_SOCKET} ${state}${dragSource ? " support-drag-source" : ""}${supportDropTarget ? " support-drop-target" : ""}`}
                  data-selector-row={row.row}
                  data-selector-support-slot={support.slot}
                  disabled={!skill}
                  title={support.name ? undefined : support.title}
                  aria-label={support.label}
                  onClick={() => {
                    if (supportDrag.swallowClick() || support.grantedBy) return;
                    commands.openSkillSelector(row.row, support.slot);
                  }}
                  onContextMenu={(event) => {
                    if (supportDrag.swallowContextMenu()) return event.preventDefault();
                    if (!support.grantedBy)
                      removeOnRightClick(event, () => commands.removeSupport(row.row, support.slot));
                  }}
                  onPointerDown={
                    support.draggable && skill
                      ? (event) =>
                          supportDrag.start(event, key, {
                            tab: view.tab,
                            fromRow: row.row,
                            fromSlot: support.slot,
                            setupKey: skill.setupKey,
                          })
                      : undefined
                  }
                  onDragStart={(event) => event.preventDefault()}
                >
                  {support.name ? (
                    <Artwork src={support.art} alt={support.name} className={SUPPORT_ART} />
                  ) : skill ? (
                    "+"
                  ) : (
                    ""
                  )}
                </button>
              </OptionalSkillTooltip>
            );
          })}
        </div>
        <strong className="skill-row-energy text-center text-text max-[720px]:col-start-3 max-[720px]:row-start-1">
          {skill ? skill.energy : "−"}
        </strong>
      </article>
    );
  });
}

const ROW_NAME = "pl-3.5 text-xs text-text max-[720px]:min-w-0 max-[720px]:wrap-anywhere";
const BADGE =
  "mb-1 inline-block rounded-sm border border-danger/60 bg-danger/15 px-1 py-0.5 text-[10px] leading-none font-bold tracking-wide whitespace-nowrap text-danger not-italic";

function RowName({ row }: { row: SkillRowView }) {
  const skill = row.skill;
  if (!skill)
    return (
      <div className={`skill-row-name ${ROW_NAME}`}>
        <strong className="block">{row.emptyName}</strong>
      </div>
    );
  const added = skill.addedLevels;
  const curseLabel = skill.curseOffReason ? `Curse not applied: ${skill.curseOffReason}` : "";
  return (
    <SkillTooltip target={{ row: row.row, skill: skill.name }}>
      <div className={`skill-row-name ${ROW_NAME}`}>
        {skill.curseOffReason ? (
          <em className={`curse-off-badge ${BADGE}`} title={curseLabel} aria-label={curseLabel}>
            CURSE OFF
          </em>
        ) : null}
        {skill.inactiveReason ? (
          <em className={`curse-off-badge ${BADGE}`} title={skill.inactiveReason} aria-label={skill.inactiveReason}>
            INACTIVE
          </em>
        ) : null}
        <strong className="block">{skill.name}</strong>
        <small className="mt-1 block text-xs text-muted group-[.trait-granted-row]:text-info">
          {`Lv.${skill.baseLevel}`}
          {added ? (
            <>
              {" "}
              <span
                className={`font-bold ${added < 0 ? "text-danger" : "text-ok"}`}
              >{`${added > 0 ? "+" : ""}${added}`}</span>
            </>
          ) : null}
          {skill.grantNote}
        </small>
      </div>
    </SkillTooltip>
  );
}

/** A filled socket's tooltip (a support's when `support` is set); an empty one has none. */
function OptionalSkillTooltip({
  row,
  skill,
  support = undefined,
  hint = "",
  children,
}: {
  row: number;
  skill: string | null;
  support?: string | null;
  hint?: string;
  children: TooltipAnchor;
}) {
  if (!skill || support === null) return children;
  return (
    <SkillTooltip target={{ row, skill, support }} hint={hint}>
      {children}
    </SkillTooltip>
  );
}

// The Auras tab's Sealed Mana and Sealed Life cards, in danger colours when over capacity, and the warning under them (shown only when
// the aura setup cannot be fully activated).
const SUMMARY = "mx-2 mt-3 grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1";
const STATUS =
  "col-span-full flex items-center gap-2.5 rounded-md border border-danger/60 bg-danger/10 px-3.5 py-2.5 text-muted max-[720px]:flex-col max-[720px]:items-start";

function ReservationSummary({ view }: { view: SkillsView | null }) {
  if (!view)
    return (
      <section id="aura-reservation-summary" className={SUMMARY} hidden aria-live="polite">
        <SealedCard kind="mana" label="Sealed Mana" sealed="0 / 0" detail="0% sealed" meterPercent={null} />
        <SealedCard kind="life" label="Sealed Life" sealed="0 / 0" detail="0% sealed" meterPercent={null} />
        <div id="aura-reservation-status" className={STATUS} hidden />
      </section>
    );
  const { mana, life, problems } = view.reservation;
  return (
    <section id="aura-reservation-summary" className={SUMMARY} hidden={view.tab !== "auras"} aria-live="polite">
      <SealedCard
        kind="mana"
        label="Sealed Mana"
        sealed={mana.sealed}
        detail={mana.detail}
        meterPercent={mana.meterPercent}
        overCapacity={mana.overCapacity}
      />
      <SealedCard
        kind="life"
        label="Sealed Life"
        sealed={life.sealed}
        detail={life.detail}
        meterPercent={life.meterPercent}
        overCapacity={life.overCapacity}
      />
      <div id="aura-reservation-status" className={STATUS} hidden={!problems.length}>
        {problems.length ? (
          <>
            <strong className="text-danger">Aura setup cannot be fully activated</strong>
            <span>{`${problems.join(" · ")}.`}</span>
          </>
        ) : null}
      </div>
    </section>
  );
}

function SealedCard(props: {
  kind: "mana" | "life";
  label: string;
  sealed: string;
  detail: string;
  meterPercent: number | null;
  overCapacity?: boolean;
}) {
  const over = props.overCapacity === true;
  const meter = over || props.kind === "life" ? "bg-danger" : "bg-info";
  return (
    <div
      className={`rounded-md border px-4 py-3.5 text-muted ${over ? "border-danger/60 bg-danger/10" : "border-line bg-raised"}`}
    >
      <span className="block">{props.label}</span>
      <strong id={`aura-sealed-${props.kind}`} className={`my-1 block text-xl ${over ? "text-danger" : "text-text"}`}>
        {props.sealed}
      </strong>
      <small id={`aura-${props.kind}-percent`} className="block text-sm">
        {props.detail}
      </small>
      <i className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-sunken">
        <b
          id={`aura-${props.kind}-meter`}
          className={`block h-full ${meter}`}
          style={props.meterPercent === null ? undefined : { width: `${props.meterPercent}%` }}
        />
      </i>
    </div>
  );
}
