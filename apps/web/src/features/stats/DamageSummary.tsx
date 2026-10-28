// The character column's damage summary: the build's average DPS over the recount span (the Stats page's recount card,
// same figure) with each source's share, and the main skill. It updates on every edit, beside whatever tab is open.
// Data: the planner's "damageSummary" source (src/app/bridge/damage-summary-view-model.ts).
import type { DamageSummarySource } from "@legacy/app/bridge/damage-summary-view-model.ts";
import { useViewSource } from "../../ui/use-view-source";
import { SkillTooltip } from "../skills/SkillTooltip";
import { CompositionButton } from "./CompositionDialog";

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
          <CompositionButton />
          {view.sources.length ? (
            <>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
                {view.sources.map((source) => (
                  <span key={source.key} style={{ width: source.width, backgroundColor: source.color }} />
                ))}
              </div>
              <ul className="grid gap-1.5 text-xs">
                {view.sources.map((source) => (
                  <SourceRow key={source.key} source={source} />
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

/** A damage source: a skill shows its icon, its uses and its Spell Burst status, and its card on hover. */
function SourceRow({ source }: { source: DamageSummarySource }) {
  const swatch = <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: source.color }} />;
  const share = <span className="text-text tabular-nums">{source.share}</span>;
  if (!source.skill)
    return (
      <li className="flex items-center gap-1.5">
        {swatch}
        <span className="min-w-0 flex-1 truncate text-muted">{source.label}</span>
        {share}
      </li>
    );
  const skill = source.skill;
  return (
    <SkillTooltip target={{ skill: skill.name }}>
      <li className="flex items-center gap-2" tabIndex={0} aria-label={`${skill.name}: ${source.share} of the damage`}>
        {swatch}
        {skill.icon ? (
          <img
            className="size-7 shrink-0 rounded-sm border border-line bg-sunken object-contain"
            src={skill.icon}
            alt=""
          />
        ) : null}
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-text">{skill.name}</span>
          {skill.detail || skill.spellBurst ? (
            <span className={`truncate text-[10px] ${skill.spellBurstOk ? "text-ok" : "text-dim"}`}>
              {[skill.detail, skill.spellBurst].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
        {share}
      </li>
    </SkillTooltip>
  );
}
