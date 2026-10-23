// The Slate Inventory (the slate board's Inventory button): the crafted slates with their state, affix count and god,
// Duplicate, Edit, Remove from grid and Delete, a right-click to place one on the grid, and Craft Slate, which shows
// the crafter (SlateCrafter.tsx) in the dialog's header and body. A slate shows its tooltip (SlateTooltip), which
// renders inside this dialog while it shows (so the dialog must not clip it).
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { SlateCrafterBody, SlateCrafterHeader } from "./SlateCrafter";
import { godTile, SLATE_PRIMARY } from "../../ui/talent-slate-styles";
import { SlateTooltip } from "./SlateTooltip";
import { registerDialog } from "../../ui/dialog-registry";

const commands = plannerCommands;

/** The dialog, its header strip and its body. */
const HEADER =
  "slate-inventory-tabs dialog-head shrink-0 justify-start gap-3 px-4 py-3.25 max-[760px]:flex-wrap max-[760px]:gap-2";
const CLOSE = "picker-close dialog-close ml-auto";
const ITEM =
  "crafted-slate-item grid min-h-17 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border border-l-3 px-2.5 py-2 hover:border-accent";
/** A slate's look by its state: on the grid, in the workspace beside it, or in the inventory only. */
const ITEM_STATES: Record<string, string> = {
  equipped: "border-line border-l-accent bg-accent/10",
  staged: "border-line border-l-info bg-info/10",
  "": "border-line border-l-line-strong bg-raised",
};
const BADGE =
  "crafted-slate-equipped-badge ml-2 inline-block rounded-sm border px-1.5 py-0.5 align-[2px] text-[10px] font-semibold tracking-wider uppercase not-italic";
const ICON =
  "crafted-slate-icon grid size-10 place-items-center rounded-sm border bg-sunken [&>img]:size-9 [&>img]:object-contain";
const SHAPE =
  "god-slate-shape relative block size-10.5 [&>i]:absolute [&>i]:top-[calc(var(--y)*16px+5px)] [&>i]:left-[calc(var(--x)*16px+5px)] [&>i]:size-3.75 [&>i]:border [&>i]:border-surface";
const TOOL_BASE =
  "grid size-7 cursor-pointer place-items-center rounded-sm p-0 text-base text-muted focus-visible:outline-none";
const TOOL = `${TOOL_BASE} enabled:hover:bg-accent/15 enabled:hover:text-accent enabled:focus-visible:bg-accent/15 enabled:focus-visible:text-accent off:cursor-default off:opacity-30`;
const DELETE_TOOL = `${TOOL_BASE} hover:bg-danger/15 hover:text-danger focus-visible:bg-danger/15 focus-visible:text-danger`;

export function SlateInventoryDialog() {
  const view = useViewSource("slateInventory");
  const crafter = view?.mode === "crafter" ? view.crafter : null;
  return (
    <dialog
      id="slate-inventory"
      ref={registerDialog}
      className="slate-inventory dialog-panel h-177.5 w-245 leading-[normal] open:flex open:flex-col"
      aria-labelledby="slate-inventory-title"
    >
      {crafter ? (
        <>
          <div key="crafter-header" id="slate-inventory-header" className={HEADER}>
            <SlateCrafterHeader crafter={crafter} />
          </div>
          <div key="crafter-body" id="slate-crafter-body" className="min-h-0 flex-1 max-[760px]:overflow-auto">
            <SlateCrafterBody crafter={crafter} />
          </div>
        </>
      ) : (
        <>
          <div key="header" id="slate-inventory-header" className={HEADER}>
            <strong id="slate-inventory-title" className="dialog-title self-center">
              Slate Inventory
            </strong>
            <button
              type="button"
              className={CLOSE}
              aria-label="Close slate inventory"
              onClick={(event) => event.currentTarget.closest("dialog")?.close()}
            >
              ×
            </button>
          </div>
          <div key="body" id="slate-crafter-body" className="min-h-0 flex-1">
            {view ? (
              <div className="crafted-slate-inventory flex h-full flex-col gap-4 p-4">
                <div className="crafted-slate-list grid min-h-0 flex-1 content-start gap-2.25 overflow-auto">
                  {view.items.length ? (
                    view.items.map((slate) => (
                      <SlateTooltip key={slate.id} id={slate.id}>
                        <article
                          className={`crafted-slate-item ${slate.state} ${ITEM} ${ITEM_STATES[slate.state] ?? ITEM_STATES[""]}`}
                          data-crafted-slate-inventory={slate.id}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            commands().placeCraftedSlate(slate.id);
                          }}
                        >
                          <span
                            className={`${ICON} ${slate.state === "equipped" ? "border-accent" : "border-line-strong"}`}
                          >
                            {slate.shape ? (
                              <span className={`${slate.shape.godKey} ${SHAPE} ${godTile(slate.shape.godKey)}`}>
                                {slate.shape.cells.map(([x, y], index) => (
                                  <i key={index} style={{ "--x": x, "--y": y } as CSSProperties} />
                                ))}
                              </span>
                            ) : (
                              <img src={slate.icon} alt="" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <strong className="block text-base">
                              {slate.name}
                              {slate.state ? (
                                <em
                                  className={`${BADGE} ${slate.state === "equipped" ? "border-accent/60 bg-accent/15 text-accent" : "border-info/60 bg-info/15 text-info"}`}
                                >
                                  {slate.state === "equipped" ? "Equipped" : "Workspace"}
                                </em>
                              ) : null}
                            </strong>
                            <small className="mt-1 block text-sm text-muted">{slate.detail}</small>
                          </span>
                          <span className="crafted-slate-tools flex items-center gap-1">
                            <button
                              type="button"
                              title="Duplicate"
                              className={TOOL}
                              onClick={() => commands().duplicateCraftedSlate(slate.id)}
                            >
                              ▢
                            </button>
                            <button
                              type="button"
                              title="Edit"
                              className={TOOL}
                              onClick={() => commands().editCraftedSlate(slate.id)}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              title="Remove from grid"
                              className={TOOL}
                              disabled={!slate.state}
                              onClick={() => commands().removeCraftedSlate(slate.id)}
                            >
                              ⊘
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              className={DELETE_TOOL}
                              onClick={() => commands().deleteCraftedSlate(slate.id)}
                            >
                              ×
                            </button>
                          </span>
                        </article>
                      </SlateTooltip>
                    ))
                  ) : (
                    <div className="crafted-slate-empty grid min-h-75 place-content-center gap-2 text-center text-dim">
                      <strong className="text-text">No crafted slates yet</strong>
                      <span>Craft a slate to add it to this build's inventory.</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`crafted-slate-create ${SLATE_PRIMARY} min-h-12 shrink-0`}
                  data-open-slate-crafter=""
                  onClick={() => commands().startSlateCraft()}
                >
                  Craft Slate
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </dialog>
  );
}
