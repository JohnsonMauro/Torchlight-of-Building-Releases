import { heroById } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { BuildLibrary, LibraryBuild } from "./build-library";
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
import { newBuildWithHero } from "./build-actions";

/** The Delete button on a card, after `btn-danger`. */
const CARD_BUTTON = "m-0 min-h-8 px-2.5 text-xs font-bold";

interface BuildListProps {
  library: BuildLibrary;
  onDelete: (build: LibraryBuild) => void;
}

export function BuildList({ library, onDelete }: BuildListProps) {
  return (
    <div id="build-list" className="grid gap-2 p-3">
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
        <div className={`build-empty-state ${BUILD_EMPTY}`}>
          <span className={BUILD_EMPTY_ICON} aria-hidden="true">
            ✦
          </span>
          <h3 className={BUILD_EMPTY_TITLE}>No saved builds</h3>
          <p className={BUILD_EMPTY_TEXT}>Start a new build to plan a hero, talents, gear, and pacts.</p>
          <button className="btn-primary px-3.5 py-2 text-xs font-bold" type="button" onClick={newBuildWithHero}>
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
    <article
      className={`build-list-card grid grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-md border ${
        active ? "active border-accent bg-accent/10 shadow-[inset_3px_0_var(--color-accent)]" : "border-line bg-raised"
      }`}
    >
      <button
        className="flex min-w-0 cursor-pointer items-center gap-3 px-3 py-2 text-left text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        type="button"
        aria-label={`Open ${build.name}`}
        onClick={() => plannerCommands().editBuild(build.id)}
      >
        {hero?.image ? (
          <img className={BUILD_HERO_ART} src={hero.image} alt="" />
        ) : (
          <span className={`${BUILD_HERO_ART} ${BUILD_HERO_GLYPH}`}>✦</span>
        )}
        <span className={BUILD_SUMMARY}>
          <small className={BUILD_SUMMARY_CAPTION}>{active ? "ACTIVE BUILD" : "SAVED BUILD"}</small>
          <strong className={BUILD_SUMMARY_NAME}>{build.name}</strong>
          <em
            className={BUILD_SUMMARY_META}
          >{`${hero?.name || "No hero selected"} · Updated ${new Date(build.updatedAt).toLocaleDateString()}`}</em>
        </span>
      </button>
      <div className="flex items-center gap-2 pr-2.5 pl-1">
        <button
          className={`btn-danger ${CARD_BUTTON}`}
          type="button"
          aria-label={`Delete ${build.name}`}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
