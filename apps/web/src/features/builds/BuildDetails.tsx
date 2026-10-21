import { useRef } from "react";
import { heroById } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { LibraryBuild } from "./build-library";
import { BUILD_EMPTY, BUILD_EMPTY_ICON, BUILD_EMPTY_TEXT, BUILD_EMPTY_TITLE } from "./build-empty";

const LABEL = "mb-3 grid gap-1.5 text-[11px] font-semibold text-[#b8c1cd]";

const FIELD =
  "w-full rounded-md border border-[#394657] bg-[#111922] p-[0.65rem] text-[#f2f4f7] focus:outline-1 focus:outline-offset-1 focus:outline-gold";

/**
 * Name and notes of the open build. The fields restart from the saved values whenever those change.
 */
export function BuildDetails({ build }: { build: LibraryBuild | undefined }) {
  return (
    <div id="build-editor" className="px-4 pt-3.25 pb-4">
      {build ? (
        <BuildDetailsFields key={`${build.id}\n${build.name}\n${build.notes}`} build={build} />
      ) : (
        <div className={BUILD_EMPTY}>
          <span className={BUILD_EMPTY_ICON} aria-hidden="true">
            ◇
          </span>
          <h3 className={BUILD_EMPTY_TITLE}>Nothing selected</h3>
          <p className={BUILD_EMPTY_TEXT}>Your next build will appear here with its notes and recent autosaves.</p>
        </div>
      )}
    </div>
  );
}

function BuildDetailsFields({ build }: { build: LibraryBuild }) {
  const hero = heroById(build.state.hero?.selectedHeroId);
  const name = useRef<HTMLInputElement>(null);
  const notes = useRef<HTMLTextAreaElement>(null);
  const save = () =>
    plannerCommands().saveBuildDetails({ name: name.current?.value ?? "", notes: notes.current?.value ?? "" });
  return (
    <>
      <div className="build-active-summary mb-3.5 flex items-center gap-2.75 rounded-sm border border-[#6b593d] bg-[linear-gradient(90deg,#29271f,#1b2228)] px-2.75 py-2.25">
        {hero?.image ? (
          <img className="size-11.5 rounded-md object-cover" src={hero.image} alt="" />
        ) : (
          <span className="grid size-11.5 place-items-center rounded-md text-[25px] text-[#ff9f50]" aria-hidden="true">
            ✦
          </span>
        )}
        <div className="grid min-w-0 gap-0.75">
          <small className="text-[9px] font-bold tracking-[0.1em] text-gold">CURRENTLY OPEN</small>
          <strong className="truncate text-sm/[normal] font-bold text-[#f2e6cb]">{build.name}</strong>
          <em className="text-[11px] text-[#b1bac6] not-italic">{hero?.name || "No hero selected"}</em>
        </div>
      </div>
      <label className={LABEL}>
        Build name
        <input ref={name} className={FIELD} defaultValue={build.name} />
      </label>
      <label className={LABEL}>
        Notes
        <textarea
          ref={notes}
          className={`${FIELD} min-h-18 resize-y`}
          rows={3}
          placeholder="What are you testing in this build?"
          defaultValue={build.notes}
        />
      </label>
      <div className="flex flex-wrap gap-[0.55rem]">
        <button
          className="btn-gold min-h-8.75 px-3.5 py-2.25 text-[11px] off:opacity-45"
          type="button"
          data-save-build-meta=""
          onClick={save}
        >
          Save details
        </button>
      </div>
    </>
  );
}
