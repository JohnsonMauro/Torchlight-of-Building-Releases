import { useRef } from "react";
import { heroById } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/planner-commands.js";
import type { LibraryBuild } from "./build-library";

/**
 * Name and notes of the open build. The fields restart from the saved values whenever those change. The summary, the
 * labels and the actions stay direct children of #build-editor: the stylesheet selects `#build-editor > label`.
 */
export function BuildDetails({ build }: { build: LibraryBuild | undefined }) {
  return (
    <div id="build-editor">
      {build ? (
        <BuildDetailsFields key={`${build.id}\n${build.name}\n${build.notes}`} build={build} />
      ) : (
        <div className="build-details-empty">
          <span aria-hidden="true">◇</span>
          <h3>Nothing selected</h3>
          <p>Your next build will appear here with its notes and recent autosaves.</p>
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
      <div className="build-active-summary">
        {hero?.image ? <img src={hero.image} alt="" /> : <span aria-hidden="true">✦</span>}
        <div>
          <small>CURRENTLY OPEN</small>
          <strong>{build.name}</strong>
          <em>{hero?.name || "No hero selected"}</em>
        </div>
      </div>
      <label>
        Build name
        <input ref={name} defaultValue={build.name} />
      </label>
      <label>
        Notes
        <textarea ref={notes} rows={3} placeholder="What are you testing in this build?" defaultValue={build.notes} />
      </label>
      <div className="build-editor-actions">
        <button className="button" type="button" data-save-build-meta="" onClick={save}>
          Save details
        </button>
      </div>
    </>
  );
}
