// The talent tree picker (an empty tree tab, or Reselect), laid out as the game's: one column per god, its portrait and
// name over its God tree and its four class trees. The trees the open slot cannot take are off (their tooltip says
// why), the build's trees carry a check mark and the slot's tree is pressed. The planner opens it and announces the
// "talentPicker" source (src/app/bridge/talent-picker-view.ts) whenever the talent trees render; picking a tree is the
// selectTalentTree command.
import { useRef } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { TalentPickerTreeView } from "@legacy/app/bridge/talent-picker-view.ts";
import { useViewSource } from "../../ui/use-view-source";
import { familyTint, PICKER_CLOSE, PICKER_HEAD, PICKER_TITLE } from "../../ui/talent-slate-styles";
import { Tooltip } from "../../ui/tooltip/Tooltip";
import { TalentEmblem } from "./TalentEmblem";
import { useRegisteredDialog } from "../../ui/dialog-registry";

/** A god's column, in the god's colour (`--talent-emblem`). */
const COLUMN =
  "flex flex-col items-center gap-3 rounded-md border border-(--talent-emblem)/35 bg-(--talent-emblem)/10 px-2 pt-3 pb-4";
const PORTRAIT = "size-24 rounded-full border-2 border-(--talent-emblem)/70 object-cover max-[760px]:size-18";
const GOD_NAME = "text-center font-display text-sm leading-tight font-bold text-text";
/** A tree: its emblem in a ring, its name under it (the game shows the emblem alone). */
const TREE = "talent-picker-card group flex w-full flex-col items-center gap-1 p-0 focus-visible:outline-none";
const TREE_RING = "relative grid size-16 place-items-center rounded-full border-2 bg-sunken";
const TREE_NAME = "text-center text-xs leading-tight";
const CHECK =
  "absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full border border-line-strong bg-surface text-[10px] font-bold text-text";

/**
 * The slot's tree: accent ring and name; one it can take: the god's colour, the accent on hover and focus; one it
 * cannot: its emblem and name faded (the check mark stays clear, as in the game).
 */
const ringLook = (tree: TalentPickerTreeView) =>
  tree.current
    ? "border-accent ring-2 ring-accent/50"
    : tree.available
      ? "border-(--talent-emblem)/60 group-hover:border-accent group-focus-visible:border-accent"
      : "border-line";
const nameLook = (tree: TalentPickerTreeView) =>
  tree.current
    ? "font-bold text-accent"
    : tree.available
      ? "text-text group-hover:text-accent group-focus-visible:text-accent"
      : "text-dim";

const treeLabel = (tree: TalentPickerTreeView) =>
  [tree.name, tree.kind, `${tree.points} points`, tree.inBuild ? "in the build" : "", tree.note]
    .filter(Boolean)
    .join(", ");

function TreeTooltipCard({ tree }: { tree: TalentPickerTreeView }) {
  return (
    <div className="grid gap-0.5 text-sm">
      <strong className="font-display">{tree.name}</strong>
      <span className="text-xs text-muted">{`${tree.kind} · ${tree.points} points`}</span>
      {tree.note ? <span className="text-xs text-warn">{tree.note}</span> : null}
    </div>
  );
}

function Tree({ tree }: { tree: TalentPickerTreeView }) {
  return (
    <Tooltip content={() => ({ body: <TreeTooltipCard tree={tree} />, kind: "qol-help-tooltip" })}>
      <button
        type="button"
        className={`${TREE} ${tree.kind === "God tree" ? "god-tree" : "class-tree"} ${tree.current ? "selected" : ""} ${tree.available ? "cursor-pointer" : "cursor-not-allowed"}`}
        aria-label={treeLabel(tree)}
        aria-pressed={tree.current}
        aria-disabled={!tree.available}
        onClick={() => {
          if (tree.available) plannerCommands().selectTalentTree(tree.name);
        }}
      >
        <span className={`${TREE_RING} ${ringLook(tree)}`}>
          <TalentEmblem
            src={tree.art}
            alt=""
            className={`talent-picker-art size-11 ${tree.available ? "" : "opacity-35 grayscale"}`}
          />
          {tree.inBuild ? (
            <span className={CHECK} aria-hidden="true">
              ✓
            </span>
          ) : null}
        </span>
        <span className={`${TREE_NAME} ${nameLook(tree)}`}>{tree.name}</span>
      </button>
    </Tooltip>
  );
}

export function TalentPanelPickerDialog() {
  const view = useViewSource("talentPicker");
  const dialog = useRef<HTMLDialogElement>(null);
  useRegisteredDialog(dialog);
  return (
    <dialog
      id="talent-panel-picker"
      ref={dialog}
      className="talent-panel-picker dialog-panel w-262.5 leading-[normal]"
      aria-labelledby="talent-picker-title"
    >
      <div className={PICKER_HEAD}>
        <h2 id="talent-picker-title" className={PICKER_TITLE}>
          {view?.title ?? "Select a talent tree"}
        </h2>
        <button
          type="button"
          className={PICKER_CLOSE}
          aria-label="Close talent tree selector"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
      </div>
      <div
        id="talent-panel-picker-grid"
        className="talent-panel-picker-grid grid grid-cols-6 gap-3 p-4.5 max-[900px]:grid-cols-3 max-[520px]:grid-cols-2"
      >
        {(view?.columns ?? []).map((column) => (
          <section
            key={column.god}
            className={`talent-picker-god ${column.familyClass} ${COLUMN} ${familyTint(column.familyClass)}`}
            aria-label={column.god}
          >
            {column.portrait ? <img src={column.portrait} alt="" className={PORTRAIT} /> : null}
            <h3 className={GOD_NAME}>{column.god}</h3>
            {column.trees.map((tree) => (
              <Tree key={tree.name} tree={tree} />
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}
