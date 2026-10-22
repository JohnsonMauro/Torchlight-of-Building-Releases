import type { CoverageView } from "@legacy/app/bridge/gear-item-view.ts";
import type { PrismSectionLine, PrismSectionView } from "@legacy/app/bridge/prism-crafter-view.ts";
import { CoverageBadge } from "../../ui/CoverageBadge";
import { KeywordText } from "../../ui/KeywordText";

/** An Inverse Image mod value's colour, by sign. */
const SIGN_TEXT: Record<string, string> = { negative: "text-danger", positive: "text-ok" };
/** A section's left edge, by section. */
const SECTION_EDGES: Record<string, string> = {
  radiusAffix: "border-l-grade-magic",
  rareAffix: "border-l-ok",
  legendaryAffix: "border-l-grade-rare",
};
const LINE = "text-xs leading-normal text-text [overflow-wrap:anywhere]";

type Section = Omit<PrismSectionView, "lines"> & { lines: (PrismSectionLine & { coverage?: CoverageView })[] };

/**
 * A prism's affix sections (the crafter's preview, the prism's tooltip): its effect or base affix, its radius, rare
 * and legendary affixes, or an Inverse Image's fixed mod values; a line with coverage shows whether the calculation
 * uses it.
 */
export function PrismSections({ sections, inverse }: { sections: Section[]; inverse: boolean }) {
  return sections.map((section) => (
    <section
      key={section.className}
      className={`prism-affix-section ${section.className} mt-3 rounded-sm border border-l-3 border-line bg-raised px-3 py-2.5 ${SECTION_EDGES[section.className] ?? (inverse ? "border-l-grade-vorax" : "border-l-accent")}`}
    >
      <h4
        className={`mb-1.5 text-xs leading-tight font-bold tracking-wide uppercase ${inverse ? "text-grade-vorax" : "text-accent"}`}
      >
        {section.heading}
      </h4>
      {section.lines.map((line) => (
        <p key={line.kind} className={"value" in line ? `${LINE} my-1` : LINE}>
          {"value" in line ? (
            <>
              {`${line.label}: `}
              <strong className={`${line.sign} ${SIGN_TEXT[line.sign] ?? "text-muted"}`}>{line.value}</strong>{" "}
            </>
          ) : (
            <>
              <KeywordText text={line.text} />{" "}
            </>
          )}
          {line.coverage ? <CoverageBadge coverage={line.coverage} /> : null}
        </p>
      ))}
    </section>
  ));
}
