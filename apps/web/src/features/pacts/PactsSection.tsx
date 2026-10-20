// The Pactspirits section of the Build page: the pact count, the three pact slots with their trees, and the Kismet counts.
// The data is the planner's "pacts" source (src/app/bridge/pacts-view-model.ts); every edit is a planner command. The legacy hover
// tooltip still reads the nodes' data-node-* and data-pactspirit-name attributes, so they stay.
import { useMemo, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { ExtraSlotView, PactNodeView, PactSlotView, PactsView } from "@legacy/app/bridge/pacts-view-model.ts";
import { useViewSource } from "../../ui/use-view-source";
import { useKismetDrag, type DropSlot } from "./use-kismet-drag";

const LEVELS = [1, 2, 3, 4, 5, 6];

/** "2/3": filled pact slots. */
export function PactspiritCount() {
  const view = useViewSource("pacts");
  return <>{view ? `${view.filled}/3` : "3/3"}</>;
}

export function KismetSummary() {
  const view = useViewSource("pacts");
  if (!view) return null;
  const group = (kind: string, count: number, max: number) => (
    <section className="pact-kismet-group">
      <h3>
        {`${kind} Kismets `}
        <strong>
          {count}
          <span>{` / ${max}`}</span>
        </strong>
      </h3>
    </section>
  );
  return (
    <>
      {group("Micro", view.kismets.microCount, view.kismets.microMax)}
      {group("Medium", view.kismets.mediumCount, view.kismets.mediumMax)}
    </>
  );
}

export function PactSlots() {
  const view = useViewSource("pacts");
  return view ? <PactSlotList view={view} /> : null;
}

const isActivationKey = (event: KeyboardEvent) => event.key === "Enter" || event.key === " ";

function PactSlotList({ view }: { view: PactsView }) {
  const slots = useMemo(() => {
    const byKey = new Map<string, DropSlot>();
    for (const slot of view.slots) {
      for (const node of slot.nodes) byKey.set(node.key, { kind: node.kismetKind, droppable: node.allocated });
      for (const extra of slot.extras) byKey.set(extra.key, { kind: extra.kind, droppable: true });
    }
    return byKey;
  }, [view]);
  const commands = plannerCommands();
  const drag = useKismetDrag({
    slotAt: (key) => slots.get(key),
    onStart: () => commands.hideTooltip(),
    onDrop: (source, target, copy) => commands.moveKismet(source.key, target, source.kind, copy),
    onInvalidDrop: () => commands.showToast("Invalid drop · Kismet returned to its slot"),
  });
  const dragClasses = (key: string) =>
    `${drag.source === key ? " kismet-drag-source" : ""}${drag.target === key ? " kismet-drop-target" : ""}`;

  const nodeClick = (slot: PactSlotView, node: PactNodeView) => {
    if (view.slotMode) {
      if (node.allocatable) commands.togglePactNode(slot.name, node.index);
    } else if (node.fate) commands.openFateSlotSelector(slot.name);
    else if (node.kismetKind) commands.openKismetCrafter(node.key, node.kismetKind);
  };
  const nodeContextMenu = (event: MouseEvent, slot: PactSlotView, node: PactNodeView) => {
    if (drag.swallowContextMenu()) return event.preventDefault();
    if (view.slotMode && node.allocatable) {
      event.preventDefault();
      if (node.fate) {
        if (node.allocated) commands.openFateSlotSelector(slot.name);
        else commands.showToast("Allocate Undetermined Fate Slots first");
      } else if (node.kismetKind) commands.openKismetCrafter(node.key, node.kismetKind);
    } else if (node.fate) {
      event.preventDefault();
      commands.clearFateSlots(slot.name);
    } else if (node.kismetKind) {
      event.preventDefault();
      if (view.slotMode) commands.openKismetCrafter(node.key, node.kismetKind);
      else commands.clearKismetSlot(node.key);
    }
  };
  const extraClick = (extra: ExtraSlotView) => {
    if (!view.slotMode) commands.openKismetCrafter(extra.key, extra.kind);
  };
  const extraContextMenu = (event: MouseEvent, extra: ExtraSlotView) => {
    event.preventDefault();
    if (drag.swallowContextMenu()) return;
    if (view.slotMode) commands.openKismetCrafter(extra.key, extra.kind);
    else commands.clearKismetSlot(extra.key);
  };

  return (
    <>
      {view.slots.map((slot) => (
        <article
          key={slot.index}
          className={`pact-slot${slot.spirit ? ` rarity-${slot.spirit.rarity.toLowerCase()}` : ""}`}
        >
          <button
            type="button"
            className="pact-slot-select"
            data-pactspirit-name={slot.spirit ? slot.name : undefined}
            onClick={() => commands.openPactspiritSelector(slot.index)}
            onContextMenu={(event) => {
              if (!slot.spirit) return;
              event.preventDefault();
              commands.removePactspirit(slot.index);
            }}
          >
            <span className={`pact-slot-portrait ${slot.spirit ? "filled" : "empty"}`}>
              {slot.spirit ? <img src={slot.spirit.icon} alt="" /> : <span aria-hidden="true">+</span>}
            </span>
            {slot.spirit ? (
              <span>
                <strong>{slot.name}</strong>
                <small>{`${slot.spirit.category} · ${slot.spirit.rarity}`}</small>
              </span>
            ) : (
              <span className="pact-slot-empty">{`Select Pactspirit ${slot.index + 1}`}</span>
            )}
          </button>
          {slot.spirit ? (
            <>
              <label>
                Level
                <select
                  value={slot.level}
                  onChange={(event) => commands.setPactspiritLevel(slot.name, Number(event.currentTarget.value))}
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              {slot.nodes.length ? (
                <>
                  <div className="pact-tree" aria-label={`${slot.name} Pactspirit tree`}>
                    {slot.nodes.map((node) => {
                      const kind = node.kismetKind;
                      return (
                        <PactNode
                          key={node.key}
                          node={node}
                          slotName={slot.name}
                          slotMode={view.slotMode}
                          extraClasses={dragClasses(node.key)}
                          onActivate={() => {
                            if (!drag.swallowClick()) nodeClick(slot, node);
                          }}
                          onContextMenu={(event) => nodeContextMenu(event, slot, node)}
                          onPointerDown={
                            view.slotMode && node.hasKismet && kind
                              ? (event) => drag.start(event, { key: node.key, kind, icon: node.icon })
                              : undefined
                          }
                        />
                      );
                    })}
                    {slot.extras.map((extra) => (
                      <ExtraSlot
                        key={extra.key}
                        extra={extra}
                        extraClasses={dragClasses(extra.key)}
                        onActivate={() => {
                          if (!drag.swallowClick()) extraClick(extra);
                        }}
                        onContextMenu={(event) => extraContextMenu(event, extra)}
                        onPointerDown={
                          view.slotMode && extra.hasKismet
                            ? (event) => drag.start(event, { key: extra.key, kind: extra.kind, icon: extra.icon })
                            : undefined
                        }
                      />
                    ))}
                  </div>
                  <small className="pact-node-count">{`${slot.allocatedCount} allocated`}</small>
                </>
              ) : null}
              <button
                type="button"
                className="pact-slot-remove"
                aria-label={`Remove ${slot.name}`}
                title="Remove Pactspirit"
                onClick={() => commands.removePactspirit(slot.index)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  commands.removePactspirit(slot.index);
                }}
              >
                ×
              </button>
            </>
          ) : null}
        </article>
      ))}
    </>
  );
}

interface NodeProps {
  extraClasses: string;
  onActivate: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}

function PactNode({
  node,
  slotName,
  slotMode,
  extraClasses,
  onActivate,
  onContextMenu,
  onPointerDown,
}: NodeProps & { node: PactNodeView; slotName: string; slotMode: boolean }) {
  const switchable = slotMode && node.allocatable;
  const acts = switchable || node.fate || node.kismetKind !== null;
  const className =
    `pact-tree-node pact-tree-${node.ring}${node.allocated ? " allocated" : ""}` +
    `${switchable && !node.allocated ? " unallocated" : ""}${node.hasKismet ? " has-kismet" : ""}` +
    `${node.kismetKind || node.fate ? " craftable" : ""}${node.fateUnlocked ? " fate-unlocked" : ""}${extraClasses}`;
  return (
    <span
      className={className}
      tabIndex={0}
      role={switchable ? "button" : undefined}
      aria-pressed={switchable ? node.allocated : undefined}
      data-pact-node-allocate={switchable ? `${slotName}:${node.index}` : undefined}
      data-pact-node-tooltip=""
      data-kismet-node={node.kismetKind ? node.key : undefined}
      data-node-name={node.name}
      data-node-effect={node.effect}
      data-node-ring={node.ring}
      data-node-icon={node.icon}
      aria-label={node.label}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (!acts || !isActivationKey(event)) return;
        event.preventDefault();
        onActivate();
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
    >
      <img src={node.icon} alt="" />
      {switchable ? (
        <i className="pact-node-status" aria-hidden="true">
          {node.allocated ? "✓" : "+"}
        </i>
      ) : null}
    </span>
  );
}

function ExtraSlot({
  extra,
  extraClasses,
  onActivate,
  onContextMenu,
  onPointerDown,
}: NodeProps & { extra: ExtraSlotView }) {
  const ring = extra.kind === "micro" ? "inner" : "mid";
  return (
    <span
      className={`pact-tree-node pact-tree-${ring} pact-tree-extra${extra.hasKismet ? " has-kismet" : ""} craftable${extraClasses}`}
      tabIndex={0}
      data-pact-node-tooltip=""
      data-kismet-node={extra.key}
      data-node-name={extra.name}
      data-node-effect={extra.effect}
      data-node-ring={ring}
      data-node-icon={extra.icon}
      aria-label={extra.label}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (!isActivationKey(event)) return;
        event.preventDefault();
        onActivate();
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
    >
      {extra.hasKismet ? <img src={extra.icon} alt="" /> : <span aria-hidden="true">+</span>}
    </span>
  );
}
