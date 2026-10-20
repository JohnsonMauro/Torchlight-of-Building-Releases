import { heroById } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/planner-commands.js";
import type { BuildLibrary, LibraryBuild } from "./build-library";

interface BuildListProps {
  library: BuildLibrary;
  onDelete: (build: LibraryBuild) => void;
}

export function BuildList({ library, onDelete }: BuildListProps) {
  return (
    <div id="build-list" className="build-list">
      {library.builds.length ? (
        library.builds.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            active={build.id === library.activeBuildId}
            onDelete={() => onDelete(build)}
          />
        ))
      ) : (
        <div className="build-empty-state">
          <span className="build-empty-icon" aria-hidden="true">
            ✦
          </span>
          <h3>No saved builds</h3>
          <p>Start a new build to plan a hero, talents, gear, and pacts.</p>
          <button className="button" type="button" onClick={() => plannerCommands().newBuild()}>
            + New Build
          </button>
        </div>
      )}
    </div>
  );
}

interface BuildCardProps {
  build: LibraryBuild;
  active: boolean;
  onDelete: () => void;
}

function BuildCard({ build, active, onDelete }: BuildCardProps) {
  const hero = heroById(build.state.hero?.selectedHeroId);
  return (
    <article className={`build-list-card ${active ? "active" : ""}`}>
      <button
        className="build-open"
        type="button"
        aria-label={`Select ${build.name}`}
        onClick={() => plannerCommands().openBuild(build.id)}
      >
        {hero?.image ? (
          <img className="build-hero-art" src={hero.image} alt="" />
        ) : (
          <span className="build-hero-art fallback">✦</span>
        )}
        <span className="build-card-copy">
          <small>{active ? "ACTIVE BUILD" : "SAVED BUILD"}</small>
          <strong>{build.name}</strong>
          <em>{`${hero?.name || "No hero selected"} · Updated ${new Date(build.updatedAt).toLocaleDateString()}`}</em>
        </span>
      </button>
      <div className="build-card-actions">
        <button
          className="build-edit"
          type="button"
          aria-label={`Edit ${build.name}`}
          onClick={() => plannerCommands().editBuild(build.id)}
        >
          Edit
        </button>
        <button className="build-delete" type="button" aria-label={`Delete ${build.name}`} onClick={onDelete}>
          Delete
        </button>
      </div>
    </article>
  );
}
