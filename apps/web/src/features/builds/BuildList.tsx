import { heroById } from "@legacy/data/heroes/hero-catalog-ss13.js";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { BuildLibrary, LibraryBuild } from "./build-library";
import { BUILD_EMPTY, BUILD_EMPTY_ICON, BUILD_EMPTY_TEXT, BUILD_EMPTY_TITLE } from "./build-empty";

/** The Edit / Delete buttons on a card; each adds its colors. */
const CARD_BUTTON =
  "m-0 min-h-7.75 cursor-pointer rounded-[3px] border px-2.5 py-1.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

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
          <button
            className="btn-gold px-3.5 py-2.25 text-[0.68rem]"
            type="button"
            onClick={() => plannerCommands().newBuild()}
          >
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

/** The hero portrait on a card (or the ✦ stand-in when the build has no hero). */
const HERO_ART = "size-11.5 shrink-0 rounded-[7px] border border-[#58687a] bg-[#111820] object-cover";

function BuildCard({ build, active, onDelete }: BuildCardProps) {
  const hero = heroById(build.state.hero?.selectedHeroId);
  return (
    <article
      className={`build-list-card grid grid-cols-[minmax(0,1fr)_auto] items-center overflow-hidden rounded-[5px] border ${
        active
          ? "active border-[#b48644] bg-[linear-gradient(90deg,#302a20,#1b2630_70%)] shadow-[inset_3px_0_var(--color-gold)]"
          : "border-[#354252] bg-[#18212b]"
      }`}
    >
      <button
        className="flex min-w-0 cursor-pointer items-center gap-3 px-2.75 py-2.25 text-left text-[#f0f2f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        type="button"
        aria-label={`Select ${build.name}`}
        onClick={() => plannerCommands().openBuild(build.id)}
      >
        {hero?.image ? (
          <img className={HERO_ART} src={hero.image} alt="" />
        ) : (
          <span className={`${HERO_ART} grid place-items-center text-2xl/[normal] text-[#ffad62]`}>✦</span>
        )}
        <span className="grid min-w-0 gap-0.75 text-[0.68rem] text-muted">
          <small className="truncate text-[9px] font-bold tracking-[0.1em] text-gold">
            {active ? "ACTIVE BUILD" : "SAVED BUILD"}
          </small>
          <strong className="truncate text-sm/[normal] font-bold text-[#f2e6cb]">{build.name}</strong>
          <em className="truncate text-[11px] text-[#aeb8c6] not-italic">{`${hero?.name || "No hero selected"} · Updated ${new Date(build.updatedAt).toLocaleDateString()}`}</em>
        </span>
      </button>
      <div className="flex items-center gap-1.75 pr-2.5 pl-1">
        <button
          className={`${CARD_BUTTON} border-[#9d783e] bg-[#29251e] text-gold hover:border-[#e7b35d] hover:bg-[#443522] hover:text-[#fff1bd]`}
          type="button"
          aria-label={`Edit ${build.name}`}
          onClick={() => plannerCommands().editBuild(build.id)}
        >
          Edit
        </button>
        <button
          className={`${CARD_BUTTON} border-[#68403e] bg-[#352427] text-[#ffaaa2] hover:border-[#aa6259] hover:bg-[#513034]`}
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
