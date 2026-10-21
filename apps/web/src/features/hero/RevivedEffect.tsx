import type { MemoryRevivedEffectView } from "@legacy/app/bridge/hero-memory-view.ts";
import { tierBadgeClasses, tierBadgeKey } from "@legacy/app/gear/tier-badge.ts";
import { useAltHeld } from "../../ui/use-alt-held";

/**
 * A memory's revived affix (the crafter's preview, the memory tooltip): its tier and effect; a Lunar Phase affix shows its
 * effects and hero trait exclusive while Alt is held. The memory-revived-* classes are hooks.
 */
export function RevivedEffect({ effect }: { effect: MemoryRevivedEffectView }) {
  const altHeld = useAltHeld();
  return (
    <div
      className={`memory-revived-effect ${effect.special ? "special" : ""} flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 whitespace-pre-line`}
    >
      {effect.tierBadge ? <i className={tierBadgeClasses(tierBadgeKey(effect.tierBadge))}>{effect.tierBadge}</i> : null}
      <span
        className={`memory-revived-name ${effect.special ? "font-bold text-info underline underline-offset-2" : ""}`}
      >
        {effect.effect}
      </span>
      {effect.details && !altHeld ? (
        <small className="memory-revived-hint text-xs whitespace-nowrap text-muted">Hold Alt for details</small>
      ) : null}
      {effect.details && altHeld ? (
        <div className="memory-revived-detail mt-1.25 basis-full border-l-2 border-info bg-info/10 px-2 py-1.75 text-xs leading-normal whitespace-normal text-text">
          <ul className="grid gap-1.25">
            {effect.details.effects.map((line, index) => (
              <li
                key={index}
                className="relative pl-2.5 before:absolute before:top-[0.48em] before:left-0 before:size-1 before:rounded-full before:bg-info before:content-['']"
              >
                {line}
              </li>
            ))}
          </ul>
          {effect.details.exclusive !== null ? (
            <div className="memory-revived-exclusive mt-2 grid gap-0.5 border-t border-line pt-1.75 text-muted">
              <small className="text-[10px] font-bold tracking-wide text-info uppercase">Hero trait exclusive</small>
              <span className="text-xs leading-snug">{effect.details.exclusive}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
