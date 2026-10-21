import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import {
  NOTICE_ACTIONS_CLASS,
  NOTICE_BUTTON_CLASS,
  NOTICE_CLASS,
  NOTICE_SECONDARY_BUTTON_CLASS,
} from "@legacy/app/notice-classes.js";
import { useViewSource } from "../ui/use-view-source";

// The notices over the page, from the "pageNotices" source (src/app/builds/build-library-controller.js): the open build
// could not be calculated (undo the last change, or open safe mode), and stored builds that could not be loaded (kept
// unchanged; a backup is offered, and an unreadable library can be set aside for a new one).
export function PageNotices() {
  const notices = useViewSource("pageNotices");
  if (!notices) return null;
  const { calculationFailure, library } = notices;
  return (
    <>
      {calculationFailure !== null && (
        <div className={NOTICE_CLASS} role="alert">
          <span>This build couldn't be calculated: {calculationFailure}</span>
          <span className={NOTICE_ACTIONS_CLASS}>
            <button className={NOTICE_BUTTON_CLASS} type="button" onClick={() => plannerCommands().undoLastChange()}>
              Undo last change
            </button>
            <button
              className={NOTICE_SECONDARY_BUTTON_CLASS}
              type="button"
              onClick={() => plannerCommands().openSafeMode()}
            >
              Open safe mode
            </button>
          </span>
        </div>
      )}
      {library && <LibraryNotice unreadable={library.unreadable} names={library.names} />}
    </>
  );
}

function LibraryNotice({ unreadable, names }: { unreadable: boolean; names: string[] }) {
  const count = names.length;
  return (
    <div className={NOTICE_CLASS} role="status">
      <span>
        {unreadable
          ? "Your saved builds couldn't be read. They are kept unchanged in this browser, and nothing is saved until you choose."
          : `${count} build${count === 1 ? "" : "s"} couldn't be loaded and ${count === 1 ? "is" : "are"} kept unchanged: ${names.join(", ")}.`}
      </span>
      <span className={NOTICE_ACTIONS_CLASS}>
        <button
          className={NOTICE_SECONDARY_BUTTON_CLASS}
          type="button"
          onClick={() => plannerCommands().backupBuilds()}
        >
          Download backup
        </button>
        {unreadable && (
          <button className={NOTICE_BUTTON_CLASS} type="button" onClick={() => plannerCommands().startNewLibrary()}>
            Start a new library (your unreadable data stays backed up)
          </button>
        )}
      </span>
    </div>
  );
}
