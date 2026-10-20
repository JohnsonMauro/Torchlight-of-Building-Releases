// The Slate Inventory (the slate board's Inventory button): the crafted slates with their state, affix count and god,
// Duplicate, Edit, Remove from grid and Delete, a right-click to place one on the grid, and Craft Slate. The crafter
// stays the planner's markup: in its mode React renders the header and body empty and marked data-legacy-editor (new
// elements, whose children React never touches) and asks the planner to write the crafter into them. A slate keeps
// data-crafted-slate-inventory for the planner's tooltip, and Craft Slate data-open-slate-crafter for the CSS.
import { useLayoutEffect, type CSSProperties } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { useViewSource } from "../../ui/use-view-source";

const commands = plannerCommands;

export function SlateInventoryDialog() {
  const view = useViewSource("slateInventory");
  const crafter = view?.mode === "crafter";
  useLayoutEffect(() => {
    if (crafter) commands().writeSlateCrafter();
  }, [crafter]);
  return (
    <dialog id="slate-inventory" className="slate-inventory" aria-labelledby="slate-inventory-title">
      {crafter ? (
        <>
          <div
            key="crafter-header"
            id="slate-inventory-header"
            className="slate-inventory-tabs"
            data-legacy-editor=""
          />
          <div key="crafter-body" id="slate-crafter-body" data-legacy-editor="" />
        </>
      ) : (
        <>
          <div key="header" id="slate-inventory-header" className="slate-inventory-tabs">
            <strong id="slate-inventory-title">Slate Inventory</strong>
            <button
              type="button"
              className="picker-close"
              aria-label="Close slate inventory"
              onClick={(event) => event.currentTarget.closest("dialog")?.close()}
            >
              ×
            </button>
          </div>
          <div key="body" id="slate-crafter-body">
            {view ? (
              <div className="crafted-slate-inventory">
                <div className="crafted-slate-list">
                  {view.items.length ? (
                    view.items.map((slate) => (
                      <article
                        key={slate.id}
                        className={`crafted-slate-item ${slate.state}`}
                        data-crafted-slate-inventory={slate.id}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          commands().placeCraftedSlate(slate.id);
                        }}
                      >
                        <span className="crafted-slate-icon">
                          {slate.shape ? (
                            <span className={`god-slate-shape ${slate.shape.godKey}`}>
                              {slate.shape.cells.map(([x, y], index) => (
                                <i key={index} style={{ "--x": x, "--y": y } as CSSProperties} />
                              ))}
                            </span>
                          ) : (
                            <img src={slate.icon} alt="" />
                          )}
                        </span>
                        <span>
                          <strong>
                            {slate.name}
                            {slate.state ? (
                              <em className="crafted-slate-equipped-badge">
                                {slate.state === "equipped" ? "Equipped" : "Workspace"}
                              </em>
                            ) : null}
                          </strong>
                          <small>{slate.detail}</small>
                        </span>
                        <span className="crafted-slate-tools">
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={() => commands().duplicateCraftedSlate(slate.id)}
                          >
                            ▢
                          </button>
                          <button type="button" title="Edit" onClick={() => commands().editCraftedSlate(slate.id)}>
                            ✎
                          </button>
                          <button
                            type="button"
                            title="Remove from grid"
                            disabled={!slate.state}
                            onClick={() => commands().removeCraftedSlate(slate.id)}
                          >
                            ⊘
                          </button>
                          <button type="button" title="Delete" onClick={() => commands().deleteCraftedSlate(slate.id)}>
                            ×
                          </button>
                        </span>
                      </article>
                    ))
                  ) : (
                    <div className="crafted-slate-empty">
                      <strong>No crafted slates yet</strong>
                      <span>Craft a slate to add it to this build's inventory.</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="button crafted-slate-create"
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
