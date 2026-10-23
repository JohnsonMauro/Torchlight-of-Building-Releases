// The Pactspirits section of the Build page: the three pact slots (portrait; name, kind and level; the tree, which wraps
// instead of hiding nodes) and the Kismet counts.
// The data is the planner's "pacts" source (src/app/bridge/pacts-view-model.ts); every edit is a planner command. Slots,
// nodes and Kismets show their tooltips (PactTooltip).
import { useMemo, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { ExtraSlotView, PactNodeView, PactSlotView, PactsView } from "@legacy/app/bridge/pacts-view-model.ts";
import { RangeInput } from "../../ui/RangeInput";
import { useViewSource } from "../../ui/use-view-source";
import {
  CARD,
  EMPTY_PORTRAIT,
  FILLED_PORTRAIT,
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

// A pact slot's grid: the spirit (portrait; name, kind and level) and its tree; up to 1100 px the tree takes a row of its
// own (the +1 px keeps the legacy max-width breakpoints inclusive). The surface (border in the rarity's colour) and the
// nodes' drawing are in pact-classes.ts.
const SLOT_LAYOUT =
  "relative grid min-h-23 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] items-center gap-x-4.5 gap-y-2 py-3 pr-11.5 pl-3.5 " +
  "max-[1101px]:grid-cols-1";
const SPIRIT_LAYOUT = "grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3";
// The tree wraps onto more rows rather than scroll out of sight. The padding holds a node's ring (3 px) and its status
// badge (7 px above, 5 px right); the line that joins a row's first node to the previous row's last falls in the left
// padding and is clipped.
const TREE_LAYOUT =
  "relative flex w-full min-w-0 flex-wrap items-center justify-start gap-x-4.5 gap-y-3 overflow-hidden pt-2 pr-1.5 pb-1 pl-0.75";
const REMOVE_BUTTON = "btn-danger absolute top-3 right-3 size-6 rounded-md text-lg leading-none";

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
    if (node.allocatable) commands.togglePactNode(slot.name, node.index);
  };
  const nodeContextMenu = (event: MouseEvent, slot: PactSlotView, node: PactNodeView) => {
    if (drag.swallowContextMenu()) return event.preventDefault();
    if (!node.allocatable) return;
    event.preventDefault();
    if (node.fate) {
      if (node.allocated) commands.openFateSlotSelector(slot.name);
      else commands.showToast("Allocate Undetermined Fate Slots first");
    } else if (node.kismetKind) commands.openKismetCrafter(node.key, node.kismetKind);
  };
  const extraContextMenu = (event: MouseEvent, extra: ExtraSlotView) => {
    event.preventDefault();
    if (drag.swallowContextMenu()) return;
    commands.openKismetCrafter(extra.key, extra.kind);
  };

  return (
    <>
      {view.slots.map((slot) => (
        <article
          key={slot.index}
          className={`pact-slot ${rarityTone(slot.spirit?.rarity)} ${slotSurface(Boolean(slot.spirit))} ${SLOT_LAYOUT}`}
        >
          {slot.spirit ? (
            <div className={SPIRIT_LAYOUT}>
              <PactspiritSlotTooltip name={slot.name}>
                <button
                  type="button"
                  className={`pact-slot-select grid size-16 cursor-pointer place-items-center overflow-hidden rounded-md ${FILLED_PORTRAIT}`}
                  aria-label={`${slot.name}: change Pactspirit`}
                  onClick={() => commands.openPactspiritSelector(slot.index)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    commands.removePactspirit(slot.index);
                  }}
                >
                  <img className="w-full" src={slot.spirit.icon} alt="" />
                </button>
              </PactspiritSlotTooltip>
              <div className="grid min-w-0">
                <strong className="truncate text-sm text-(--pact-tone)">{slot.name}</strong>
                <small className="truncate text-xs text-muted">{`${slot.spirit.category} · ${slot.spirit.rarity}`}</small>
                <div className="mt-1 grid max-w-56 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
                  <span className="text-xs font-bold tracking-widest text-accent uppercase" aria-hidden="true">
                    Level
                  </span>
                  <RangeInput
                    min={1}
                    max={6}
                    value={slot.level}
                    field="commit"
                    slider={{ "aria-label": "Level" }}
                    number={{ "aria-label": "Level number" }}
                    onValue={(level) => commands.setPactspiritLevel(slot.name, level)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="pact-slot-select group flex w-full min-w-0 cursor-pointer items-center gap-3 text-left text-text"
              onClick={() => commands.openPactspiritSelector(slot.index)}
            >
              <span
                className={`grid size-16 flex-none place-items-center overflow-hidden rounded-md ${EMPTY_PORTRAIT}`}
              >
                <span aria-hidden="true">+</span>
              </span>
              <span className="pact-slot-empty min-w-0 text-xs font-bold tracking-widest text-accent uppercase">
                {`Select Pactspirit ${slot.index + 1}`}
              </span>
            </button>
          )}
          {slot.spirit ? (
            <>
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
                          drag={dragState(node.key)}
                          onActivate={() => {
                            if (!drag.swallowClick()) nodeClick(slot, node);
                          }}
                          onContextMenu={(event) => nodeContextMenu(event, slot, node)}
                          onPointerDown={
                            node.hasKismet && kind
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
                        onActivate={() => drag.swallowClick()}
                        onContextMenu={(event) => extraContextMenu(event, extra)}
                        onPointerDown={
                          extra.hasKismet
                            ? (event) => drag.start(event, { key: extra.key, kind: extra.kind, icon: extra.icon })
                            : undefined
                        }
                      />
                    ))}
                  </div>
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
  drag,
  onActivate,
  onContextMenu,
  onPointerDown,
}: NodeProps & { node: PactNodeView; slotName: string }) {
  const switchable = node.allocatable;
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
