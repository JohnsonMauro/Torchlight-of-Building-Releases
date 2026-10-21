// The Pactspirits section of the Build page: the pact count, the three pact slots with their trees, and the Kismet counts.
// The data is the planner's "pacts" source (src/app/bridge/pacts-view-model.ts); every edit is a planner command. Slots,
// nodes and Kismets show their tooltips (PactTooltip).
import { useMemo, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { ExtraSlotView, PactNodeView, PactSlotView, PactsView } from "@legacy/app/bridge/pacts-view-model.ts";
import { useViewSource } from "../../ui/use-view-source";
import {
  CARD,
  EMPTY_PORTRAIT,
  FILLED_PORTRAIT,
  LEVEL_LABEL,
  LEVEL_SELECT,
  extraClasses,
  nodeClasses,
  nodeImage,
  nodeStatus,
  rarityTone,
  slotSurface,
  type DragState,
} from "./pact-classes";
import { useKismetDrag, type DropSlot } from "./use-kismet-drag";
import { PactNodeTooltip, PactspiritTooltip } from "./PactTooltip";
import type { TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";

const LEVELS = [1, 2, 3, 4, 5, 6];

// A pact slot's grid: portrait and name, LEVEL, the tree, the count; up to 1100 px the tree takes a row of its own,
// up to 560 px the count too (the +1 px keeps the legacy max-width breakpoints inclusive). The surface (border in the
// rarity's colour) and the nodes' drawing are in pact-classes.ts.
const SLOT_LAYOUT =
  "relative grid min-h-23 grid-cols-[minmax(260px,310px)_84px_minmax(0,1fr)_80px] items-center gap-x-4.5 gap-y-4 py-3 pr-11.5 pl-3.5 " +
  "max-[1101px]:grid-cols-[minmax(0,1fr)_84px_80px] max-[1101px]:gap-y-2 max-[701px]:items-start " +
  "max-[561px]:grid-cols-[minmax(0,1fr)_84px] max-[561px]:gap-x-2.5";
const TREE_LAYOUT =
  "relative flex w-full min-w-0 items-center justify-start gap-4.5 overflow-x-auto px-1 py-1.75 [scrollbar-width:none] " +
  "[&::-webkit-scrollbar]:hidden max-[1101px]:col-span-full max-[1101px]:row-start-2";
const COUNT_LAYOUT =
  "block flex-none justify-self-end text-xs font-bold whitespace-nowrap text-muted " +
  "max-[1101px]:col-start-3 max-[1101px]:row-start-1 " +
  "max-[561px]:col-span-full max-[561px]:row-start-3 max-[561px]:justify-self-start";
const REMOVE_BUTTON = "btn-danger absolute top-3 right-3 size-6 rounded-md text-lg leading-none";

/** "2/3": filled pact slots. */
export function PactspiritCount() {
  const view = useViewSource("pacts");
  return <>{view ? `${view.filled}/3` : "3/3"}</>;
}

export function KismetSummary() {
  const view = useViewSource("pacts");
  if (!view) return null;
  const group = (kind: string, count: number, max: number) => (
    <section className={`pact-kismet-group ${CARD} flex min-h-11.5 items-center border-line px-3.5 py-2.5`}>
      <h3 className="text-sm font-bold whitespace-nowrap text-muted">
        {`${kind} Kismets `}
        <strong className="font-black text-accent">
          {count}
          <span className="text-dim">{` / ${max}`}</span>
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
    onStart: () => hideTooltip(),
    onDrop: (source, target, copy) => commands.moveKismet(source.key, target, source.kind, copy),
    onInvalidDrop: () => commands.showToast("Invalid drop · Kismet returned to its slot"),
  });
  const dragState = (key: string): DragState => ({ source: drag.source === key, target: drag.target === key });

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
          className={`pact-slot ${rarityTone(slot.spirit?.rarity)} ${slotSurface(Boolean(slot.spirit))} ${SLOT_LAYOUT}`}
        >
          <PactspiritSlotTooltip name={slot.spirit ? slot.name : null}>
            <button
              type="button"
              className="pact-slot-select group flex w-full min-w-0 cursor-pointer items-center gap-3 text-left text-text"
              onClick={() => commands.openPactspiritSelector(slot.index)}
              onContextMenu={(event) => {
                if (!slot.spirit) return;
                event.preventDefault();
                commands.removePactspirit(slot.index);
              }}
            >
              <span
                className={`grid size-16 flex-none place-items-center overflow-hidden rounded-md ${slot.spirit ? FILLED_PORTRAIT : EMPTY_PORTRAIT}`}
              >
                {slot.spirit ? (
                  <img className="w-full" src={slot.spirit.icon} alt="" />
                ) : (
                  <span aria-hidden="true">+</span>
                )}
              </span>
              {slot.spirit ? (
                <span className="min-w-0">
                  <strong className="block max-w-42.5 truncate text-sm text-(--pact-tone)">{slot.name}</strong>
                  <small className="block max-w-42.5 truncate text-xs text-muted">
                    {`${slot.spirit.category} · ${slot.spirit.rarity}`}
                  </small>
                </span>
              ) : (
                <span className="pact-slot-empty min-w-0 text-xs font-bold tracking-widest text-accent uppercase">
                  {`Select Pactspirit ${slot.index + 1}`}
                </span>
              )}
            </button>
          </PactspiritSlotTooltip>
          {slot.spirit ? (
            <>
              <label className={LEVEL_LABEL}>
                Level
                <select
                  className={LEVEL_SELECT}
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
                  <div className={`pact-tree ${TREE_LAYOUT}`} aria-label={`${slot.name} Pactspirit tree`}>
                    {slot.nodes.map((node) => {
                      const kind = node.kismetKind;
                      return (
                        <PactNode
                          key={node.key}
                          node={node}
                          slotName={slot.name}
                          slotMode={view.slotMode}
                          drag={dragState(node.key)}
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
                        spirit={slot.name}
                        drag={dragState(extra.key)}
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
                  <small className={`pact-node-count ${COUNT_LAYOUT}`}>{`${slot.allocatedCount} allocated`}</small>
                </>
              ) : null}
              <button
                type="button"
                className={`pact-slot-remove ${REMOVE_BUTTON}`}
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
  drag: DragState;
  onActivate: () => void;
  onContextMenu: (event: MouseEvent) => void;
  onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
}

function PactNode({
  node,
  slotName,
  slotMode,
  drag,
  onActivate,
  onContextMenu,
  onPointerDown,
}: NodeProps & { node: PactNodeView; slotName: string; slotMode: boolean }) {
  const switchable = slotMode && node.allocatable;
  const acts = switchable || node.fate || node.kismetKind !== null;
  const target = {
    spirit: slotName,
    key: node.kismetKind ? node.key : null,
    name: node.name,
    effect: node.effect,
    ring: node.ring,
    icon: node.icon,
    allocated: switchable && node.allocated,
    extra: false,
  };
  return (
    <PactNodeTooltip target={target}>
      <span
        className={nodeClasses(node, switchable, drag)}
        tabIndex={0}
        role={switchable ? "button" : undefined}
        aria-pressed={switchable ? node.allocated : undefined}
        data-pact-node-allocate={switchable ? `${slotName}:${node.index}` : undefined}
        data-kismet-node={node.kismetKind ? node.key : undefined}
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
        <img className={nodeImage(switchable && !node.allocated)} src={node.icon} alt="" />
        {switchable ? (
          <i className={nodeStatus(node.allocated)} aria-hidden="true">
            {node.allocated ? "✓" : "+"}
          </i>
        ) : null}
      </span>
    </PactNodeTooltip>
  );
}

function ExtraSlot({
  extra,
  spirit,
  drag,
  onActivate,
  onContextMenu,
  onPointerDown,
}: NodeProps & { extra: ExtraSlotView; spirit: string }) {
  const ring = extra.kind === "micro" ? "inner" : "mid";
  const target = {
    spirit,
    key: extra.key,
    name: extra.name,
    effect: extra.effect,
    ring,
    icon: extra.icon,
    allocated: false,
    extra: true,
  };
  return (
    <PactNodeTooltip target={target}>
      <span
        className={extraClasses(extra, drag)}
        tabIndex={0}
        data-kismet-node={extra.key}
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
        {extra.hasKismet ? (
          <img className="size-full object-contain" src={extra.icon} alt="" />
        ) : (
          <span aria-hidden="true">+</span>
        )}
      </span>
    </PactNodeTooltip>
  );
}

/** A slot's Pactspirit tooltip; an empty slot has none. */
function PactspiritSlotTooltip({ name, children }: { name: string | null; children: TooltipAnchor }) {
  return name ? <PactspiritTooltip name={name}>{children}</PactspiritTooltip> : children;
}
