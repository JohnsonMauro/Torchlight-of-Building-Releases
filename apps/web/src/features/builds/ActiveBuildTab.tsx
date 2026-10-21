import { useEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { isRenameKey } from "@legacy/app/builds/build-tab-rename.js";
import { useViewSource } from "../../ui/use-view-source";
import { ACTIVE_BUILD_CAPTION, ACTIVE_BUILD_NAME, ACTIVE_BUILD_RENAME, ACTIVE_BUILD_TAB } from "./build-classes";

/**
 * The open build's name in the build strip, from the "buildStatus" source. A right-click or the rename key (F2) renames
 * it in place: Enter or leaving the field saves, Escape keeps the old name. With no build open it asks for one.
 */
export function ActiveBuildTab() {
  const status = useViewSource("buildStatus");
  const name = status?.name ?? null;
  const [renaming, setRenaming] = useState(false);
  const tab = useRef<HTMLDivElement>(null);
  const startRename = () => {
    if (name !== null) setRenaming(true);
  };
  const finishRename = (text: string | null) => {
    setRenaming(false);
    if (text !== null) plannerCommands().renameBuild(text);
    tab.current?.focus({ preventScroll: true });
  };
  return (
    <div
      ref={tab}
      className={ACTIVE_BUILD_TAB}
      tabIndex={0}
      title={name === null ? undefined : "Right-click to rename"}
      onContextMenu={(event) => {
        if (renaming) return;
        event.preventDefault();
        startRename();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !isRenameKey(event)) return;
        event.preventDefault();
        startRename();
      }}
    >
      <span className={ACTIVE_BUILD_CAPTION}>{status && name === null ? "No active build" : "Active build"}</span>
      {renaming && name !== null ? (
        <RenameField name={name} onFinish={finishRename} />
      ) : (
        <strong className={ACTIVE_BUILD_NAME}>{status ? (name ?? "Start a new build") : "Loading build…"}</strong>
      )}
    </div>
  );
}

/** The name's field: `onFinish` gets the typed text (Enter, or leaving the field) or null (Escape), once. */
function RenameField({ name, onFinish }: { name: string; onFinish: (text: string | null) => void }) {
  const field = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const finish = (text: string | null) => {
    if (finished.current) return;
    finished.current = true;
    onFinish(text);
  };
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);
  return (
    <input
      ref={field}
      type="text"
      className={ACTIVE_BUILD_RENAME}
      defaultValue={name}
      aria-label="Build name"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          finish(event.currentTarget.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(null);
        }
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
    />
  );
}
