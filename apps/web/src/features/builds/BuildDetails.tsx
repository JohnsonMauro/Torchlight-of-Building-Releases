import { useRef } from "react";
import { heroById } from "@legacy/engine/index.ts";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { LibraryBuild } from "./build-library";
import {
  BUILD_EMPTY,
  BUILD_EMPTY_ICON,
  BUILD_EMPTY_TEXT,
  BUILD_EMPTY_TITLE,
  BUILD_HERO_ART,
  BUILD_HERO_GLYPH,
  BUILD_SUMMARY,
  BUILD_SUMMARY_CAPTION,
  BUILD_SUMMARY_META,
  BUILD_SUMMARY_NAME,
} from "./build-classes";

const LABEL = "mb-3 grid gap-1.5 text-xs font-semibold text-muted";

const FIELD = "field w-full p-2.5 text-sm";

/**
 * The open build's hero (Change Hero), name and notes. The fields restart from the saved values whenever those change.
 */
export function BuildDetails({ build }: { build: LibraryBuild | undefined }) {
  return (
    <div id="build-editor" className="px-4 pt-3 pb-4">
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
      <div className="build-active-summary mb-3.5 flex items-center gap-3 rounded-md border border-line bg-raised px-3 py-2">
        {hero?.image ? (
          <img className={BUILD_HERO_ART} src={hero.image} alt="" />
        ) : (
          <span className={`${BUILD_HERO_ART} ${BUILD_HERO_GLYPH}`} aria-hidden="true">
            ✦
          </span>
        )}
        <div className={BUILD_SUMMARY}>
          <small className={BUILD_SUMMARY_CAPTION}>CURRENTLY OPEN</small>
          <strong className={BUILD_SUMMARY_NAME}>{build.name}</strong>
          <em className={BUILD_SUMMARY_META}>{hero?.name || "No hero selected"}</em>
        </div>
        <button
          type="button"
          className="change-hero-button btn ml-auto h-8 shrink-0 px-2.5 text-xs"
          onClick={() => plannerCommands().openHeroSelector()}
        >
          Change Hero
        </button>
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
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary h-9 px-3.5 text-xs font-bold"
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
