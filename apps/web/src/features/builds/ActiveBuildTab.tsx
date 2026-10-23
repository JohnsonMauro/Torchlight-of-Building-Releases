import { useEffect, useRef, useState } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import { StrokeIcon } from "../../ui/StrokeIcon";
import { useViewSource } from "../../ui/use-view-source";
import {
  ACTIVE_BUILD_CAPTION,
  ACTIVE_BUILD_NAME,
  ACTIVE_BUILD_RENAME,
  ACTIVE_BUILD_ROW,
  ACTIVE_BUILD_TAB,
  ICON_BUTTON,
} from "./build-classes";

/**
 * The open build's name in the build strip, from the "buildStatus" source, with a pencil beside it that renames it in
 * place: Enter or leaving the field saves, Escape keeps the old name. Without an open build it shows nothing: the strip
 * only shows on a build's pages, and with no build the planner stays on the Workspace.
 */
export function ActiveBuildTab() {
  const status = useViewSource("buildStatus");
  const name = status?.name ?? null;
  const [renaming, setRenaming] = useState(false);
  const pencil = useRef<HTMLButtonElement>(null);
  // The pencil comes back once the field is gone: it takes the focus then, so the keyboard stays where it was.
  const refocus = useRef(false);
  useEffect(() => {
    if (renaming || !refocus.current) return;
    refocus.current = false;
    pencil.current?.focus({ preventScroll: true });
  }, [renaming]);
  const finishRename = (text: string | null) => {
    refocus.current = true;
    setRenaming(false);
    if (text !== null) plannerCommands().renameBuild(text);
  };
  if (name === null) return null;
  return (
    <div className={ACTIVE_BUILD_TAB}>
      <span className={ACTIVE_BUILD_CAPTION}>Active build</span>
      <div className={ACTIVE_BUILD_ROW}>
        {renaming ? (
          <RenameField name={name} onFinish={finishRename} />
        ) : (
          <>
            <strong className={ACTIVE_BUILD_NAME}>{name}</strong>
            <button
              ref={pencil}
              type="button"
              className={ICON_BUTTON}
              aria-label="Rename build"
              title="Rename build"
              onClick={() => setRenaming(true)}
            >
              <StrokeIcon className="size-3.5">
                <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
                <path d="m13.5 6.5 4 4" />
              </StrokeIcon>
            </button>
          </>
        )}
      </div>
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
