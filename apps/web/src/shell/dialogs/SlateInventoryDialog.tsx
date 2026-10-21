// The Slate Inventory (the slate board's Inventory button): the crafted slates with their state, affix count and god,
// Duplicate, Edit, Remove from grid and Delete, a right-click to place one on the grid, and Craft Slate, which shows
// the crafter (SlateCrafter.tsx) in the dialog's header and body. A slate keeps the crafted-slate-item class for the
// planner's tooltip, which moves into this dialog while it shows (so the dialog must not clip it).
import type { CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";
import { SlateCrafterBody, SlateCrafterHeader } from "./SlateCrafter";
import { godTile, SLATE_BUTTON } from "./talent-slate-styles";

const commands = plannerCommands;

/** The dialog, its header strip and its body; SlateEditorDialog shares the frame. */
const HEADER =
  "slate-inventory-tabs dialog-head shrink-0 justify-start gap-3 px-4 py-3.25 max-[760px]:flex-wrap max-[760px]:gap-2";
const CLOSE = "picker-close dialog-close ml-auto";
const ITEM =
  "crafted-slate-item grid min-h-17 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2.5 rounded border px-2.5 py-2.25 hover:border-[#e7b35d]";
/** A slate's look by its state: on the grid, in the workspace beside it, or in the inventory only. */
const ITEM_STATES: Record<string, string> = {
  equipped:
    "border-[#bb893e] bg-[linear-gradient(100deg,rgb(210_151_63/0.18),#192131_48%)] shadow-[inset_3px_0_#e8ad4f]",
  staged: "border-[#6d8291] bg-[linear-gradient(100deg,rgb(114_179_197/0.1),#192131_48%)] shadow-[inset_3px_0_#72b3c5]",
  "": "border-[#695437] bg-[linear-gradient(100deg,rgb(210_151_63/0.09),#192131_48%)]",
};
const BADGE =
  "crafted-slate-equipped-badge ml-2.25 inline-block rounded-[10px] border px-1.5 py-0.5 align-[2px] font-sans text-[0.52rem] font-semibold tracking-[0.06em] uppercase not-italic";
const ICON =
  "crafted-slate-icon grid size-10 place-items-center rounded border bg-[linear-gradient(145deg,#a85a12,#3b250e)] [&>img]:size-9 [&>img]:object-contain";
const SHAPE =
  "god-slate-shape relative block size-10.5 [&>i]:absolute [&>i]:top-[calc(var(--y)*16px+5px)] [&>i]:left-[calc(var(--x)*16px+5px)] [&>i]:size-3.75 [&>i]:border [&>i]:border-white/35 [&>i]:bg-(--tile) [&>i]:shadow-[inset_0_0_4px_#fff5]";
const TOOL =
  "grid size-7 cursor-pointer place-items-center rounded-[3px] p-0 text-base text-[#d5b77e] focus-visible:outline-none enabled:hover:bg-[#4b3824] enabled:hover:text-[#fff1bd] enabled:focus-visible:bg-[#4b3824] enabled:focus-visible:text-[#fff1bd] off:cursor-default off:opacity-28";
const DELETE_TOOL =
  "grid size-7 cursor-pointer place-items-center rounded-[3px] p-0 text-base text-[#d5b77e] focus-visible:outline-none hover:bg-[#633025] hover:text-[#ffbd8b] focus-visible:bg-[#633025] focus-visible:text-[#ffbd8b]";

export function SlateInventoryDialog() {
  const view = useViewSource("slateInventory");
  const crafter = view?.mode === "crafter" ? view.crafter : null;
  return (
    <dialog
      id="slate-inventory"
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
                      <article
                        key={slate.id}
                        className={`crafted-slate-item ${slate.state} ${ITEM} ${ITEM_STATES[slate.state] ?? ITEM_STATES[""]}`}
                        data-crafted-slate-inventory={slate.id}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          commands().placeCraftedSlate(slate.id);
                        }}
                      >
                        <span
                          className={`${ICON} ${slate.state === "equipped" ? "border-[#ffc054] shadow-[0_0_10px_rgb(255_157_45/0.28)]" : "border-[#8e571f]"}`}
                        >
                          {slate.shape ? (
                            <span className={`${slate.shape.godKey} ${SHAPE}`} style={godTile(slate.shape.godKey)}>
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
                                className={`${BADGE} ${slate.state === "equipped" ? "border-[#c87a24] bg-[#6a3514] text-[#ffd39a]" : "border-[#608694] bg-[#244653] text-[#d1eef4]"}`}
                              >
                                {slate.state === "equipped" ? "Equipped" : "Workspace"}
                              </em>
                            ) : null}
                          </strong>
                          <small className="mt-1 block text-[0.82rem] text-[#9aa6b5]">{slate.detail}</small>
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
                    ))
                  ) : (
                    <div className="crafted-slate-empty grid min-h-75 place-content-center gap-2 text-center text-[#8e9baa]">
                      <strong className="text-[#d8e0e8]">No crafted slates yet</strong>
                      <span>Craft a slate to add it to this build's inventory.</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`crafted-slate-create ${SLATE_BUTTON} min-h-12 shrink-0`}
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
