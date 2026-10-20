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
      className={`panel energy-panel compact-energy-panel${energy && energy.used > energy.available ? " overused" : ""}`}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Activation budget</p>
          <h2>Energy allocator</h2>
        </div>
        <div className="energy-total">
          <strong id="energy-total">{energy ? `${energy.used}/${energy.available}` : "—"}</strong>
          <span>used / available</span>
        </div>
      </div>
      <div id="energy-meter" className="energy-meter" style={style}>
        <i />
      </div>
    </section>
  );
}

export function SkillBoard() {
  const view = useViewSource("skills");
  const tab = view?.tab ?? "skills";
  return (
    <section className="panel compendium-skill-panel">
      <div className="compendium-tabs">
        {TABS.map((entry) => (
          <button
            key={entry.tab}
            type="button"
            className={entry.tab === tab ? "active" : undefined}
            aria-pressed={entry.tab === tab}
            onClick={() => plannerCommands().setSkillBoardTab(entry.tab)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="skill-energy-scale">
        <span />
        <span />
        <span>0</span>
        <span>10</span>
        <span>15</span>
        <span>50</span>
        <span>100</span>
        <strong>Energy</strong>
      </div>
      <div id="skill-groups" className="compendium-skill-rows">
        {view ? <BoardRows view={view} /> : null}
      </div>
      <ReservationSummary view={view} />
      <footer>
        <button
          className="button button-secondary"
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
      ghost.className = "support-drag-ghost";
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
    const rowClasses = `${skill?.grantedBy ? " trait-granted-row" : ""}${skill?.inactiveReason || skill?.curseOffReason ? " curse-limit-row" : ""}${skillDrag.target === String(row.row) ? " skill-drop-target" : ""}`;
    return (
      <article key={row.row} className={`compendium-skill-row${rowClasses}`} data-skill-board-row={row.row}>
        <button
          type="button"
          className={`skill-primary-socket ${skill ? "" : "empty-skill-slot"}${skill?.grantedBy ? " trait-granted-socket" : ""}${skillDrag.source === String(row.row) ? " skill-dragging" : ""}`}
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
          {skill ? <Artwork src={skill.art} alt={skill.name} className="skill-glyph" /> : "−"}
        </button>
        <RowName row={row} />
        <div className="skill-support-sockets">
          {row.supports.map((support) => {
            const key = supportKey(row.row, support.slot);
            return (
              <button
                key={support.slot}
                type="button"
                className={`skill-support-socket ${support.name ? "" : "empty-support-socket"}${support.grantedBy ? " trait-granted-socket" : ""}${supportDrag.source === key ? " support-drag-source" : ""}${supportDrag.target === key ? " support-drop-target" : ""}`}
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
                  <Artwork src={support.art} alt={support.name} className="lane-support-art" />
                ) : skill ? (
                  "+"
                ) : (
                  ""
                )}
              </button>
            );
          })}
        </div>
        <strong className="skill-row-energy">{skill ? skill.energy : "−"}</strong>
      </article>
    );
  });
}

function RowName({ row }: { row: SkillRowView }) {
  const skill = row.skill;
  if (!skill)
    return (
      <div className="skill-row-name">
        <strong>{row.emptyName}</strong>
      </div>
    );
  const added = skill.addedLevels;
  const curseLabel = skill.curseOffReason ? `Curse not applied: ${skill.curseOffReason}` : "";
  return (
    <div className="skill-row-name" data-skill-tooltip={skill.name}>
      {skill.curseOffReason ? (
        <em className="curse-off-badge" title={curseLabel} aria-label={curseLabel}>
          CURSE OFF
        </em>
      ) : null}
      {skill.inactiveReason ? (
        <em className="curse-off-badge" title={skill.inactiveReason} aria-label={skill.inactiveReason}>
          INACTIVE
        </em>
      ) : null}
      <strong>{skill.name}</strong>
      <small>
        {`Lv.${skill.baseLevel}`}
        {added ? (
          <>
            {" "}
            <span
              className={`skill-level-bonus ${added < 0 ? "negative" : ""}`}
            >{`${added > 0 ? "+" : ""}${added}`}</span>
          </>
        ) : null}
        {skill.grantNote}
      </small>
    </div>
  );
}

function ReservationSummary({ view }: { view: SkillsView | null }) {
  if (!view)
    return (
      <section id="aura-reservation-summary" className="aura-reservation-summary" hidden aria-live="polite">
        <SealedCard kind="mana" label="Sealed Mana" sealed="0 / 0" detail="0% sealed" meterPercent={null} />
        <SealedCard kind="life" label="Sealed Life" sealed="0 / 0" detail="0% sealed" meterPercent={null} />
        <div id="aura-reservation-status" className="aura-reservation-status" />
      </section>
    );
  const { mana, life, problems } = view.reservation;
  return (
    <section
      id="aura-reservation-summary"
      className={`aura-reservation-summary${problems.length ? " over-capacity" : ""}${mana.overCapacity ? " mana-over-capacity" : ""}${life.overCapacity ? " life-over-capacity" : ""}`}
      hidden={view.tab !== "auras"}
      aria-live="polite"
    >
      <SealedCard
        kind="mana"
        label="Sealed Mana"
        sealed={mana.sealed}
        detail={mana.detail}
        meterPercent={mana.meterPercent}
      />
      <SealedCard
        kind="life"
        label="Sealed Life"
        sealed={life.sealed}
        detail={life.detail}
        meterPercent={life.meterPercent}
      />
      <div id="aura-reservation-status" className="aura-reservation-status" hidden={!problems.length}>
        {problems.length ? (
          <>
            <strong>Aura setup cannot be fully activated</strong>
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
}) {
  return (
    <div className={`aura-resource-card ${props.kind}`}>
      <span>{props.label}</span>
      <strong id={`aura-sealed-${props.kind}`}>{props.sealed}</strong>
      <small id={`aura-${props.kind}-percent`}>{props.detail}</small>
      <i>
        <b
          id={`aura-${props.kind}-meter`}
          style={props.meterPercent === null ? undefined : { width: `${props.meterPercent}%` }}
        />
      </i>
    </div>
  );
}
