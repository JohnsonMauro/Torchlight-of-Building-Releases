import type { CoverageView } from "@legacy/app/bridge/gear-item-view.ts";

const BASE = "rounded-sm border text-[10px]/tight font-bold whitespace-nowrap";
const LOOKS: Record<CoverageView["look"], string> = {
  calculated: "border-ok/50 bg-ok/10 text-ok",
  neutral: "border-line bg-raised text-muted",
  pending: "border-warn/50 bg-warn/10 text-warn",
};

/** Whether the calculation uses a line ("In calc" green, a neutral status grey, else amber); `className` places it. */
export function CoverageBadge({
  coverage,
  className = "px-1.5 py-0.5",
}: {
  coverage: CoverageView;
  className?: string;
}) {
  return (
    <b className={`${BASE} ${LOOKS[coverage.look]} ${className}`} title={coverage.title || undefined}>
      {coverage.status}
    </b>
  );
}
