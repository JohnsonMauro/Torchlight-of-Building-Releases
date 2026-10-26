// The character column's damage summary: the build's average DPS over the recount span (the Stats page's recount card,
// same figure) with each source's share, and the main skill. It updates on every edit, beside whatever tab is open.
// Data: the planner's "damageSummary" source (src/app/bridge/damage-summary-view-model.ts).
import { useViewSource } from "../../ui/use-view-source";

export function DamageSummary() {
  const view = useViewSource("damageSummary");
  if (!view) return null;
  return (
    <section id="damage-summary" className="grid gap-2 border-t border-line px-4 py-3" aria-label="Damage summary">
      <h3 className="text-xs font-bold tracking-wider text-accent uppercase">Damage</h3>
      {view.modeled && view.averageDps ? (
        <>
          <div>
            <p className="text-[10px] tracking-wider text-muted uppercase">Average DPS · first {view.spanSeconds} s</p>
            <strong
              className="text-2xl font-semibold text-accent-strong tabular-nums"
              title={view.averageDps.full}
              data-damage-summary-dps=""
            >
              {view.averageDps.short ?? view.averageDps.full}
            </strong>
          </div>
          {view.sources.length ? (
            <>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                {view.sources.map((source) => (
                  <span key={source.key} style={{ width: source.width, backgroundColor: source.color }} />
                ))}
              </div>
              <ul className="grid gap-1 text-xs">
                {view.sources.map((source) => (
                  <li key={source.key} className="flex items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: source.color }} />
                    <span className="min-w-0 flex-1 truncate text-muted">{source.label}</span>
                    <span className="text-text tabular-nums">{source.share}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-dim">No modeled damage yet: add an active damage skill.</p>
      )}
      {view.mainSkill ? (
        <p className="text-xs text-muted">
          Main skill: <span className="text-text">{view.mainSkill.name}</span> · Lv.{view.mainSkill.level}
        </p>
      ) : null}
    </section>
  );
}
