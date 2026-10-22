import { KismetSummary, PactSlots } from "../../features/pacts/PactsSection";
import { buildSectionPlace, sectionCardClass } from "../../ui/section-card";
import { BuildTabs } from "../../ui/BuildTabs";
import { useViewOpen } from "../../ui/use-workspace";

export function PactsView() {
  const open = useViewOpen("pacts");
  return (
    <section id="pacts-view" className={`${sectionCardClass} ${buildSectionPlace}`} hidden={!open}>
      <BuildTabs />
      <div id="pactspirits" className="pactspirit-grid m-3 grid grid-cols-1 gap-3 leading-[normal]">
        <PactSlots />
      </div>
      <div
        id="pact-kismet-summary"
        className="pact-kismet-summary mx-3 mb-3 grid grid-cols-2 gap-3 leading-[normal] max-[901px]:grid-cols-1"
        aria-live="polite"
      >
        <KismetSummary />
      </div>
    </section>
  );
}
