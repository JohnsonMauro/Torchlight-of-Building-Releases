// A hero's memory socket (the Hero Trait tab's rows, and the trait stage of a hero drawn on its game screen): the
// memory's art with its tooltip and revival moon, or the socket's memory type in black and white; a click opens the
// memory picker (the memories of that type), a right-click empties it.
import type { MouseEvent } from "react";
import { plannerCommands } from "@legacy/app/bridge/planner-commands.js";
import type { MemorySocketView } from "@legacy/app/bridge/hero-traits-view-model.ts";
import type { TooltipAnchor } from "../../ui/tooltip/Tooltip";
import { Artwork } from "../../ui/Artwork";
import { MemoryTooltip } from "./MemoryTooltip";
import { memoryArt, memoryEmpty, memorySocket } from "./hero-classes";

const rightClick = (event: MouseEvent, act: () => boolean) => {
  if (act()) event.preventDefault();
};

/** A memory socket's look: the button, the memory's art by rarity, the empty socket's +. */
export interface MemorySocketLook {
  button: string;
  art: (rarity: string | null | undefined) => string;
  empty: string;
}
const ROW_LOOK: MemorySocketLook = { button: memorySocket, art: memoryArt, empty: memoryEmpty };

/** A memory socket: a click opens the memory picker, a right-click takes the memory out. */
export function MemorySocket({ socket, look = ROW_LOOK }: { socket: MemorySocketView; look?: MemorySocketLook }) {
  const memory = socket.memory;
  return (
    <OptionalMemoryTooltip tier={memory ? socket.tier : null}>
      <button
        type="button"
        className={`hero-memory-socket ${memory ? "filled " : ""}${look.button}`}
        data-memory-tier={socket.tier}
        aria-label={socket.label}
        onClick={() => plannerCommands().openMemorySocket(socket.tier)}
        onContextMenu={(event) => rightClick(event, () => plannerCommands().removeMemory(socket.tier))}
      >
        {memory ? (
          <>
            <Artwork src={memory.art} alt={memory.name} className={look.art(memory.rarity)} />
            {memory.revivedId ? <RevivalBadge id={memory.revivedId} /> : null}
          </>
        ) : (
          <b className={look.empty}>
            {/* The type the socket takes, in black and white until a memory brings its colours. */}
            <img
              src={socket.typeIcon}
              alt=""
              className="size-[78%] object-contain opacity-55 grayscale group-hover/socket:opacity-90 group-focus-visible/socket:opacity-90"
            />
          </b>
        )}
      </button>
    </OptionalMemoryTooltip>
  );
}

// The moon on a revived memory's socket.
function RevivalBadge({ id }: { id: string }) {
  const symbol = `memory-moon-${id.replace(/[^a-z0-9_-]/gi, "")}`;
  return (
    <span
      className="pointer-events-none absolute -top-1.25 -left-1 z-2 grid size-[23px] place-items-center rounded-full border border-info bg-surface"
      aria-hidden="true"
    >
      <svg className="block size-5" viewBox="0 0 24 24" focusable="false">
        <defs>
          {/* The mask's white keeps, its black cuts the crescent: luminance, not colour. */}
          <mask id={`${symbol}-cut`} maskUnits="userSpaceOnUse">
            <rect className="fill-white" width="24" height="24" />
            <circle className="fill-black" cx="14.9" cy="9" r="5.9" />
          </mask>
        </defs>
        <circle className="fill-info" cx="12" cy="12" r="6.7" mask={`url(#${symbol}-cut)`} />
      </svg>
    </span>
  );
}

/** A filled memory socket's tooltip; an empty one has none. */
function OptionalMemoryTooltip({ tier, children }: { tier: string | null; children: TooltipAnchor }) {
  return tier ? <MemoryTooltip target={{ tier }}>{children}</MemoryTooltip> : children;
}
