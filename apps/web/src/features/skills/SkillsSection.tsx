// The Skills section of the Build page: the setup count, the Energy allocator, and the skill board (Skills and Auras tabs,
// each row's skill, supports and Energy, the aura reservation, Reset Skills). The data is the planner's "skills" source
// (src/app/bridge/skills-view-model.ts); every edit is a planner command, and the skill selector dialog stays legacy. The legacy hover
// tooltip reads data-skill-tooltip, data-support-tooltip, data-parent-skill, data-selector-row and
// data-selector-support-slot (and finds the board by #skill-groups), so they stay.
import type { CSSProperties, MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { SkillBoardTab, SkillRowView, SkillsView } from "@legacy/app/bridge/skills-view-model.ts";
import { Artwork } from "../../ui/Artwork";
import { usePointerDrag } from "../../ui/use-pointer-drag";
import { useViewSource } from "../../ui/use-view-source";

const TABS: { tab: SkillBoardTab; label: string }[] = [
  { tab: "skills", label: "Skills" },
  { tab: "auras", label: "Auras" },
];

// The two raised panels inside the section card: chamfered, slate-edged, with the short light hairline at the top left.
const PANEL =
  "relative m-3 border border-[#3a4655] leading-[normal] clip-chamfer-9 before:absolute before:top-0 before:left-0 before:h-px before:w-13.5 before:bg-[#bdcee0] before:opacity-65 before:content-['']";

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
      className={`energy-panel group ${PANEL} bg-panel px-4.25 py-3.75 ${energy && energy.used > energy.available ? "overused" : ""}`}
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-[rgb(209_117_55/0.19)] pb-2.5">
        <div>
          <p className="text-gilded mb-1.75 text-[0.72rem] font-extrabold tracking-[0.12em] uppercase">
            Activation budget
          </p>
          <h2 className="font-serif text-[1.15rem] font-semibold tracking-[0.015em]">Energy allocator</h2>
        </div>
        <div className="flex items-baseline gap-[0.55rem]">
          <strong id="energy-total" className="text-[1.8rem] text-[#65e2ff] group-[.overused]:text-[#ff6673]">
            {energy ? `${energy.used}/${energy.available}` : "—"}
          </strong>
          <span className="text-[0.8rem] text-muted">used / available</span>
        </div>
      </div>
      <div
        id="energy-meter"
        className="mt-2 h-2.25 overflow-hidden rounded-[9px] bg-[#17263d] group-[.overused]:bg-[#3b1e2a]"
        style={style}
      >
        <i className="block h-full w-(--energy-ratio) bg-[linear-gradient(90deg,#4dbde8,#9d72ff)] transition-[width] duration-200 group-[.overused]:bg-[linear-gradient(90deg,#ff8269,#e33349)]" />
      </div>
    </section>
  );
}

export function SkillBoard() {
  const view = useViewSource("skills");
  const tab = view?.tab ?? "skills";
  return (
    <section
      className={`${PANEL} bg-[#10161e] p-5.5 shadow-[inset_0_1px_rgb(255_255_255/0.024),0_12px_28px_rgb(0_0_0/0.18)] max-[520px]:p-4 min-[1101px]:flex min-[1101px]:min-h-180 min-[1101px]:flex-col`}
    >
      <div className="compendium-tabs mb-[0.8rem] flex gap-4 border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.tab}
            type="button"
            className={`cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-4 py-[0.8rem] text-[0.72rem] font-extrabold tracking-[0.17em] text-[#d5b77e] uppercase on:text-gilded on:border-b-[#e8ad4f] ${entry.tab === tab ? "active" : ""}`}
            aria-pressed={entry.tab === tab}
            onClick={() => plannerCommands().setSkillBoardTab(entry.tab)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[64px_76px_repeat(5,minmax(0,1fr))_58px] items-center px-3 pb-[0.55rem] text-center text-[0.72rem] text-[#8fb0cc] max-[720px]:hidden">
        <span />
        <span />
        <span>0</span>
        <span>10</span>
        <span>15</span>
        <span>50</span>
        <span>100</span>
        <strong className="text-gilded font-medium">Energy</strong>
      </div>
      <div id="skill-groups" className="grid gap-2 rounded-lg bg-[#080e15] p-2">
        {view ? <BoardRows view={view} /> : null}
      </div>
      <ReservationSummary view={view} />
      <footer className="mt-3 flex items-center justify-end rounded-[7px] border border-[#202b39] px-3 py-2.5 min-[1101px]:mt-auto">
        <button
          className="btn-bronze min-h-10.5 w-32.5 px-3.5 py-2.25 text-[0.68rem] font-bold uppercase"
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
  "group grid min-h-22 grid-cols-[64px_76px_minmax(0,1fr)_58px] items-center rounded-lg border bg-[#0c1118] px-3 py-2 max-[720px]:grid-cols-[54px_minmax(0,1fr)_42px] max-[720px]:gap-y-2 max-[720px]:p-1.75";
// A row's frame: cyan while a dragged skill is over it; a red outline when its curse cannot apply.
function rowFrame(dropTarget: boolean, curseLimit: boolean) {
  const outline = curseLimit ? " outline-3 outline-offset-1 outline-[#e33349]" : "";
  if (dropTarget) return `border-[#70c9ff] shadow-[inset_0_0_0_1px_#70c9ff,0_0_18px_#48a9ef55]${outline}`;
  if (curseLimit)
    return `border-[#2d3642] shadow-[0_0_0_1px_rgb(0_0_0/0.6),0_0_12px_2px_rgb(227_51_73/0.75)]${outline}`;
  return "border-[#2d3642]";
}
const PRIMARY_SOCKET =
  "relative grid size-16 place-items-center overflow-hidden rounded-full border bg-[#0b121a] p-0 text-[#9aacbf] max-[720px]:size-13";
// The active skill's round socket: dashed when empty, grabbed to reorder (lifted while dragged), cyan when a trait grants
// the skill, ringed red when its curse cannot apply.
function primarySocketState(state: { filled: boolean; granted: boolean; dragging: boolean; curseLimit: boolean }) {
  if (state.granted) return "cursor-default border-[#75d8f6] shadow-[0_0_0_2px_#75d8f633,0_0_12px_#4bbce555]";
  const look = state.filled ? "cursor-grab touch-none" : "cursor-pointer opacity-80";
  const frame = "border-dashed border-[#364354]";
  if (state.dragging)
    return `${frame} pointer-events-none z-30 cursor-grabbing opacity-85 shadow-[0_12px_24px_#0009,0_0_16px_#70c9ff88]`;
  return `${frame} ${look}${state.curseLimit ? " shadow-[0_0_0_2px_#e33349]" : ""}`;
}
// The hairline that links a row's five support sockets.
const SUPPORT_LINE =
  "before:absolute before:inset-x-[10%] before:top-1/2 before:z-0 before:h-0.75 before:-translate-y-1/2 before:rounded-full before:bg-[#243247] before:shadow-[0_0_0_1px_rgb(7_12_18/0.35)] before:content-['']";
// The art inside a frame: the image covers it, the frame's ◆ shows only when there is no image.
const FRAMED_IMAGE =
  "[&>img]:absolute [&>img]:inset-0 [&>img]:z-1 [&>img]:size-full [&>img]:max-w-none [&>img]:object-cover [&>img+span]:invisible [&>span]:relative [&>span]:z-0";
const SKILL_ART = `skill-glyph relative grid size-14.5 place-items-center overflow-hidden rounded-full border border-[#695039] bg-[linear-gradient(145deg,#241c16,#10151c)] text-ember shadow-[inset_0_0_12px_rgb(255_141_53/0.08)] max-[720px]:size-11.5 [&>img]:rounded-full ${FRAMED_IMAGE}`;
const SUPPORT_SOCKET =
  "relative z-1 grid aspect-square w-[min(42px,100%)] place-items-center justify-self-center rounded-full border-2 bg-[#101822] p-0 text-[#91a2b5] max-[720px]:w-[min(34px,100%)]";
// A support socket: a "+" when empty (ember on hover), dimmed while its support is dragged, cyan as a drop target or when
// a trait grants the support.
function supportSocketState(state: {
  filled: boolean;
  enabled: boolean;
  granted: boolean;
  dragSource: boolean;
  dropTarget: boolean;
}) {
  const dimmed = state.dragSource ? " opacity-35" : "";
  if (state.dropTarget) return `cursor-grab border-[#77d6f4] shadow-[0_0_0_3px_#77d6f466,0_0_18px_#4bbce599]${dimmed}`;
  if (state.granted) return "cursor-default border-[#75d8f6] shadow-[0_0_0_2px_#75d8f633,0_0_10px_#4bbce555]";
  if (state.filled) return `cursor-grab touch-none border-[#495564]${dimmed}`;
  if (!state.enabled) return "border-[#495564]";
  return "cursor-pointer border-[#495564] text-[1.15rem] text-[#9fb2c5] hover:border-[#ff862c] hover:bg-[#1d2022] hover:text-[#ff9b4d] hover:shadow-[0_0_12px_rgb(255_119_23/0.2)]";
}
// The support that follows the pointer while dragged (a clone of the socket appended to <body>); "+" when copying.
const SUPPORT_GHOST =
  "support-drag-ghost pointer-events-none fixed z-10020 grid size-11.5 -translate-1/2 place-items-center rounded-full border-2 border-[#ffb455] bg-[#17202a] shadow-[0_9px_22px_#000a] [&.copying]:after:absolute [&.copying]:after:-right-2 [&.copying]:after:-bottom-2 [&.copying]:after:grid [&.copying]:after:size-5.25 [&.copying]:after:place-items-center [&.copying]:after:rounded-full [&.copying]:after:border [&.copying]:after:border-[#9deec8] [&.copying]:after:bg-[#8ce7b9] [&.copying]:after:font-black [&.copying]:after:text-[#132a1d] [&.copying]:after:content-['+']";
const SUPPORT_ART = `lane-support-art relative block size-full overflow-hidden rounded-full max-[1100px]:size-7.25 [.support-drag-ghost_&]:size-9.5 [&>img]:scale-[1.14] ${FRAMED_IMAGE}`;

function BoardRows({ view }: { view: SkillsView }) {
  const commands = plannerCommands();
  const skillDrag = usePointerDrag<SkillDragSource>({
    targetAt: (element) =>
      element?.closest("#skill-groups [data-skill-board-row]")?.getAttribute("data-skill-board-row") ?? null,
    onStart: () => commands.hideTooltip(),
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
    onStart: () => commands.hideTooltip(),
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
        <button
          type="button"
          className={`skill-primary-socket ${PRIMARY_SOCKET} ${socketState}${skill ? "" : " empty-skill-slot"}${dragging ? " skill-dragging" : ""}`}
          data-selector-row={row.row}
          data-skill-tooltip={skill?.name}
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
              <button
                key={support.slot}
                type="button"
                className={`skill-support-socket ${SUPPORT_SOCKET} ${state}${dragSource ? " support-drag-source" : ""}${supportDropTarget ? " support-drop-target" : ""}`}
                data-selector-row={row.row}
                data-selector-support-slot={support.slot}
                data-support-tooltip={support.name ?? undefined}
                data-parent-skill={support.name ? (skill?.name ?? "") : undefined}
                disabled={!skill}
                title={support.title}
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
            );
          })}
        </div>
        <strong className="skill-row-energy text-center text-[#b9c8d7] max-[720px]:col-start-3 max-[720px]:row-start-1">
          {skill ? skill.energy : "−"}
        </strong>
      </article>
    );
  });
}

const ROW_NAME = "pl-3.5 text-[0.78rem] text-[#a9bfd5] max-[720px]:min-w-0 max-[720px]:wrap-anywhere";
const BADGE =
  "mb-1 inline-block rounded-[3px] border border-[#e33349] bg-[#e33349] px-1.25 py-0.75 text-[0.52rem] leading-none font-extrabold tracking-[0.04em] whitespace-nowrap text-white not-italic shadow-[0_1px_4px_rgb(0_0_0/0.65)]";

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
    <div className={`skill-row-name ${ROW_NAME}`} data-skill-tooltip={skill.name}>
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
      <small className="mt-1 block text-[0.65rem] text-muted group-[.trait-granted-row]:text-[#75d8f6]">
        {`Lv.${skill.baseLevel}`}
        {added ? (
          <>
            {" "}
            <span
              className={`font-bold ${added < 0 ? "text-[#ff777b]" : "text-[#6ee29b]"}`}
            >{`${added > 0 ? "+" : ""}${added}`}</span>
          </>
        ) : null}
        {skill.grantNote}
      </small>
    </div>
  );
}

// The Auras tab's Sealed Mana and Sealed Life cards, red when over capacity, and the warning under them (shown only when
// the aura setup cannot be fully activated).
const SUMMARY = "mx-2 mt-3 grid grid-cols-2 gap-2.5 max-[720px]:grid-cols-1";
const STATUS =
  "col-span-full flex items-center gap-2.5 border border-[#8e3438] bg-[#2a1318] px-3.5 py-2.5 text-[#91cfc5] max-[720px]:flex-col max-[720px]:items-start";

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
            <strong className="text-[#ff666b]">Aura setup cannot be fully activated</strong>
            <span className="text-[#a9bbc9]">{`${problems.join(" · ")}.`}</span>
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
  const meter = over ? "bg-[#e5474d]" : props.kind === "life" ? "bg-[#d75458]" : "bg-[#3aa8e8]";
  return (
    <div
      className={`border px-4 py-3.5 text-[#8ea3b9] ${over ? "border-[#8e3438] bg-[#2a1318]" : "border-[#29384a] bg-[#0b121a]"}`}
    >
      <span className="block">{props.label}</span>
      <strong
        id={`aura-sealed-${props.kind}`}
        className={`my-1 block text-[1.35rem] ${over ? "text-[#ff666b]" : "text-[#e6f2ff]"}`}
      >
        {props.sealed}
      </strong>
      <small id={`aura-${props.kind}-percent`} className="block text-[0.8333rem]">
        {props.detail}
      </small>
      <i className="mt-2.5 block h-1.75 overflow-hidden bg-[#202b38]">
        <b
          id={`aura-${props.kind}-meter`}
          className={`block h-full ${meter}`}
          style={props.meterPercent === null ? undefined : { width: `${props.meterPercent}%` }}
        />
      </i>
    </div>
  );
}
