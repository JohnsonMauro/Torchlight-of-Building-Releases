// The Divinity Slates board (Build page, shown in place of the talent tree by the talent column's Slates button): the
// statue grid, the equipped slates on it, the slates parked beside it, and the selected slate's tools. The data is the
// planner's "slates" source (src/app/bridge/slates-view-model.ts); every edit is a planner command, and the inventory,
// crafter and affix editor dialogs stay legacy. A piece shows its tooltip (SlateTooltip). The pieces' drawing (tiles,
// art, states) is in slate-classes.ts. Every size counts in --cell (set on the stage). Keyboard: with a slate selected, A / D rotate and W / S flip it (src/app/slates/slate-shortcuts.js).
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { slateShortcutAction } from "@legacy/app/slates/slate-shortcuts.js";
import {
  slateExtent,
  slateTiles,
  type SlatePieceView,
  type SlateToolsView,
  type SlatesView,
} from "@legacy/app/bridge/slates-view-model.ts";
import { HelpButton } from "../../ui/HelpButton";
import { StrokeIcon } from "../../ui/StrokeIcon";
import { SlateTooltip } from "./SlateTooltip";
import { useViewSource } from "../../ui/use-view-source";
import {
  CELL_ART,
  LABEL_COUNT,
  LABEL_NAME,
  LABEL_NUMBER,
  LOCK_ICON,
  LOCKED_CELL,
  judgmentEdge,
  PIECE_ART,
  pieceClasses,
  tileClasses,
} from "./slate-classes";
import { dragDrop, pendingDrop, type Rect } from "./slate-drop";
import { useSlateDrag, type SlateDragView } from "./use-slate-drag";
import { hideTooltip } from "../../ui/tooltip/tooltip-store";

const ART_CELL_PX = 72;
const WHEEL_QUIET_MS = 80;

export function SlateBoard() {
  const view = useViewSource("slates");
  if (!view) return null;
  return (
    <>
      <div className="slate-board-toolbar flex items-center justify-end gap-2.25">
        <HelpButton topic="slates" label="Slates" />
        <button
          type="button"
          className="btn min-h-8.5 px-3 text-xs font-bold tracking-wider uppercase"
          onClick={() => plannerCommands().openSlateInventory()}
        >
          Inventory
        </button>
      </div>
      <SlateStage view={view} />
    </>
  );
}

const rectOf = (element: Element): Rect => element.getBoundingClientRect();

function SlateStage({ view }: { view: SlatesView }) {
  const commands = plannerCommands();
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const lastMenuWheel = useRef(0);
  const drag = useSlateDrag({
    onStart: () => hideTooltip(),
    onCancel: () => commands.slateDragCancelled(),
    onDrop: (end) => {
      const piece = [...view.pieces, ...view.parked].find((item) => item.id === end.id);
      if (!piece || !stageRef.current || !boardRef.current) return;
      commands.dropSlate(
        end.id,
        dragDrop(end, end.pose, slateExtent(piece.shape, end.pose), rectOf(boardRef.current), rectOf(stageRef.current)),
      );
    },
  });
  const pending = view.pieces.find((piece) => piece.pending) ?? null;

  // The grid sits in the middle of the panel's height while the board replaces the talent tree.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const panel = stage?.closest(".slate-board-panel");
    if (!stage || !panel) return;
    const center = () => {
      const grid = boardRef.current;
      if (!grid || !panel.clientHeight) return;
      const panelRect = panel.getBoundingClientRect(),
        stageRect = stage.getBoundingClientRect();
      const top = panelRect.top + panelRect.height / 2 - stageRect.top - grid.offsetHeight / 2;
      stage.style.setProperty("--slate-grid-top", `${Math.max(0, Math.round(top))}px`);
    };
    const frame = requestAnimationFrame(center);
    const observer = new ResizeObserver(center);
    observer.observe(panel);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  // The pointer's last position: a slate that starts waiting is drawn under it.
  useEffect(() => {
    const track = (event: PointerEvent) => {
      lastPointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", track);
    return () => window.removeEventListener("pointermove", track);
  }, []);

  // A waiting slate follows the pointer; the next click places it (or parks it, or puts it back).
  useEffect(() => {
    if (!pending) return;
    const piece = boardRef.current?.querySelector<HTMLElement>(
      `.slate-piece[data-slate-id="${CSS.escape(pending.id)}"]`,
    );
    const follow = (x: number, y: number) => {
      const board = boardRef.current;
      if (!piece || !board) return;
      const rect = board.getBoundingClientRect();
      piece.style.left = `${x - rect.left - piece.offsetWidth / 2}px`;
      piece.style.top = `${y - rect.top - piece.offsetHeight / 2}px`;
    };
    if (lastPointer.current) follow(lastPointer.current.x, lastPointer.current.y);
    const move = (event: PointerEvent) => follow(event.clientX, event.clientY);
    const place = (event: globalThis.MouseEvent) => {
      if (!stageRef.current || !boardRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      commands.finishPendingSlate(
        pendingDrop(
          event.clientX,
          event.clientY,
          pending.pose,
          [pending.width, pending.height],
          rectOf(boardRef.current),
          rectOf(stageRef.current),
        ),
      );
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("click", place, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("click", place, true);
      piece?.style.removeProperty("left");
      piece?.style.removeProperty("top");
    };
  }, [pending, commands]);

  // With a slate selected: A / D / W / S transform it, a click elsewhere deselects it.
  const tools = view.tools;
  useEffect(() => {
    if (!tools) return;
    const keyDown = (event: KeyboardEvent) => {
      const action = slateShortcutAction(event) as { rotate?: 1 | -1; flip?: "x" | "y" } | null;
      if (!action || drag.dragging() || !stageRef.current?.getClientRects().length) return;
      if (action.rotate ? !tools.rules.rotate : !tools.rules.flip) return;
      event.preventDefault();
      commands.transformSlate(tools.id, action.rotate ? { rotate: action.rotate } : { flip: action.flip ?? "x" });
    };
    const click = (event: globalThis.MouseEvent) => {
      if (!(event.target as Element | null)?.closest?.("[data-slate-id],.slate-quick-tools"))
        commands.clearSlateSelection();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("click", click);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("click", click);
    };
  }, [tools, drag, commands]);

  // The wheel: during a drag it flips the slate; otherwise, over the stage with a slate selected, it rotates (or flips) it.
  useEffect(() => {
    const board = stageRef.current?.parentElement;
    if (!board) return;
    const wheel = (event: WheelEvent) => {
      if (drag.wheel(event)) return;
      if (!tools || !(event.target as Element | null)?.closest?.(".slate-stage")) return;
      if (!tools.rules.rotate && !tools.rules.flip) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastMenuWheel.current < WHEEL_QUIET_MS) return;
      lastMenuWheel.current = now;
      commands.wheelTransformSlate(event.deltaY >= 0);
    };
    board.addEventListener("wheel", wheel, { passive: false });
    return () => board.removeEventListener("wheel", wheel);
  }, [tools, drag, commands]);

  const select = (event: MouseEvent, piece: SlatePieceView) => {
    if (drag.swallowClick() || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    commands.selectSlate(piece.id, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };
  const pieceProps = (piece: SlatePieceView) => ({
    piece,
    drag: drag.view?.id === piece.id ? drag.view : null,
    onClick: (event: MouseEvent) => select(event, piece),
    onContextMenu: (event: MouseEvent) => {
      if (commands.rightClickRemoveSlate(piece.id)) event.preventDefault();
    },
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
      drag.start(event, { id: piece.id, pose: piece.pose, rules: piece.rules }),
  });

  return (
    <div
      className="slate-stage relative grid h-full min-h-0 min-w-[calc(var(--cell)*14)] place-items-center [--cell:72px] max-[520px]:[--cell:min(15vw,64px)]"
      ref={stageRef}
    >
      {/* Centred across the stage, at the height that centres it in the panel (--slate-grid-top, set above). */}
      <div
        className={`${view.editMode ? "editing " : ""}divinity-board absolute top-(--slate-grid-top,109px) left-1/2 grid size-[calc(var(--cell)*6)] -translate-x-1/2 grid-cols-[repeat(6,var(--cell))] grid-rows-[repeat(6,var(--cell))]`}
        ref={boardRef}
      >
        {view.cells.map((cell) =>
          cell.locked ? (
            <div
              key={`${cell.column},${cell.row}`}
              className={LOCKED_CELL}
              style={{ gridColumn: cell.column, gridRow: cell.row }}
              data-slate-cell={`${cell.column},${cell.row}`}
              role="img"
              aria-label={`Board cell ${cell.column}, ${cell.row}: opens at character level ${view.unlockLevel}`}
            >
              <StrokeIcon className={LOCK_ICON}>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </StrokeIcon>
              {`Lv.${view.unlockLevel}`}
            </div>
          ) : (
            <button
              key={`${cell.column},${cell.row}`}
              type="button"
              className="slate-cell pointer-events-none border border-line-strong bg-raised editmode:pointer-events-auto editmode:cursor-crosshair hover:border-info hover:bg-info/15"
              style={{ gridColumn: cell.column, gridRow: cell.row }}
              data-slate-cell={`${cell.column},${cell.row}`}
              aria-label={`Board cell ${cell.column}, ${cell.row}`}
              onClick={() => commands.placeSlateAtCell(cell.column, cell.row)}
            />
          ),
        )}
        {view.pieces.map((piece) => (
          <SlatePiece key={piece.id} {...pieceProps(piece)} />
        ))}
      </div>
      {view.parked.map((piece) => (
        <SlatePiece key={piece.id} {...pieceProps(piece)} />
      ))}
      {tools ? <SlateTools tools={tools} /> : null}
    </div>
  );
}

interface SlatePieceProps {
  piece: SlatePieceView;
  /** Set while this piece is dragged: its offset and current pose. */
  drag: SlateDragView | null;
  onClick: (event: MouseEvent) => void;
  onContextMenu: (event: MouseEvent) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

function SlatePiece({ piece, drag, onClick, onContextMenu, onPointerDown }: SlatePieceProps) {
  const pose = drag?.pose ?? piece.pose;
  const posed = drag ? null : piece;
  const [width, height] = posed ? [piece.width, piece.height] : slateExtent(piece.shape, pose);
  const tiles = posed ? piece.tiles : slateTiles(piece.shape, pose);
  const parked = piece.number === null;
  const place: Record<string, string | number> =
    "x" in piece.at
      ? { "--park-x": `${piece.at.x}%`, "--park-y": `${piece.at.y}%` }
      : { "--slate-column": piece.at.column, "--slate-row": piece.at.row };
  const style = {
    ...place,
    "--slate-width": width,
    "--slate-height": height,
    "--slate-base-width": piece.baseWidth,
    "--slate-base-height": piece.baseHeight,
    "--slate-art-width": `${piece.baseWidth * ART_CELL_PX}px`,
    "--slate-art-height": `${piece.baseHeight * ART_CELL_PX}px`,
    "--slate-rotation": `${pose.rotation}deg`,
    "--slate-flip-x": pose.flipX,
    "--slate-flip-y": pose.flipY,
    ...(drag?.moved ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : {}),
  } as CSSProperties;
  const look = { piece, parked, dragged: Boolean(drag?.moved) };
  // State classes the planner and the tests read; the drawing comes from slate-classes.ts.
  const states = [
    "slate-piece",
    parked && "parked-slate",
    piece.overlay && "overlay-slate",
    piece.copy && "copy-slate",
    piece.judgmentAffected && "judgment-affected",
    piece.copiedByNeighbor && "copied-by-neighbor",
    piece.selected && "selected",
    drag?.moved && "dragging",
    piece.pending && "pending-drop",
  ]
    .filter(Boolean)
    .join(" ");
  const tile = tileClasses(look);
  const labelled = !piece.icon && !piece.cellIcon;
  return (
    <SlateTooltip id={piece.id}>
      <button
        type="button"
        className={pieceClasses(look, states)}
        style={style}
        data-slate-id={piece.id}
        aria-label={piece.label}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
      >
        {tiles.map((cell, index) => (
          <i
            key={index}
            className={piece.judgmentAffected ? `${tile} ${judgmentEdge(cell.outline)}` : tile}
            style={{ "--piece-column": cell.column, "--piece-row": cell.row } as CSSProperties}
          >
            {piece.cellIcon ? <img className={CELL_ART} src={piece.cellIcon} alt="" /> : null}
          </i>
        ))}
        {piece.icon ? <img className={PIECE_ART} src={piece.icon} alt="" /> : null}
        {parked ? null : <span className={labelled ? LABEL_NUMBER : "hidden"}>{piece.number}</span>}
        <strong className={labelled ? LABEL_NAME : "hidden"}>{piece.name}</strong>
        {piece.adjacentCount !== null ? (
          <em className={labelled ? LABEL_COUNT : "hidden"}>{`${piece.adjacentCount} adjacent`}</em>
        ) : null}
      </button>
    </SlateTooltip>
  );
}

// The selected slate's tool buttons, Remove at the far end.
const TOOL = "size-8 p-0 text-sm";

function SlateTools({ tools }: { tools: SlateToolsView }) {
  const commands = plannerCommands();
  const tool = (title: string, symbol: string, action: () => void, danger = false) => (
    <button
      type="button"
      className={`${TOOL} ${danger ? "btn-danger ml-auto" : "btn"}`}
      title={title}
      aria-label={title}
      onClick={action}
    >
      {symbol}
    </button>
  );
  return (
    <div
      className="slate-quick-tools absolute top-[clamp(8px,var(--tool-y),calc(100%-82px))] left-[clamp(8px,var(--tool-x),calc(100%-265px))] z-30 min-w-57.5 rounded-md border border-line-strong bg-surface p-2.5 text-text shadow-lg shadow-shadow"
      style={{ "--tool-x": `${tools.x}px`, "--tool-y": `${tools.y}px` } as CSSProperties}
    >
      <strong className="mb-2 block border-b border-line pb-1.5 font-display text-xs/snug font-bold text-accent">
        {tools.name}
      </strong>
      <div className="flex gap-1">
        {tool("Move", "✥", () => commands.startSlateMove(tools.id))}
        {tools.rules.rotate ? (
          <>
            {tool("Rotate clockwise (D)", "↻", () => commands.transformSlate(tools.id, { rotate: 1 }))}
            {tool("Rotate counter-clockwise (A)", "↶", () => commands.transformSlate(tools.id, { rotate: -1 }))}
          </>
        ) : null}
        {tools.rules.flip ? (
          <>
            {tool("Flip horizontal (S)", "↔", () => commands.transformSlate(tools.id, { flip: "x" }))}
            {tool("Flip vertical (W)", "↕", () => commands.transformSlate(tools.id, { flip: "y" }))}
          </>
        ) : null}
        {tool("Edit affixes", "✎", () => commands.editSlate(tools.id))}
        {tool("Remove", "×", () => commands.removeSlate(tools.id), true)}
      </div>
    </div>
  );
}
