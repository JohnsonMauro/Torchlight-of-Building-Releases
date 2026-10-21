import { KismetSummary, PactSlots, PactspiritCount } from "../../features/pacts/PactsSection";
import { sectionCardClass } from "../../ui/section-card";
import { SectionHeading } from "../../ui/SectionHeading";

export function PactsView() {
  return (
    <section id="pacts-view" className={`${sectionCardClass} order-3 col-span-full`} hidden>
      <SectionHeading
        title="Pactspirits"
        help="pacts"
        total={{ label: "Pactspirits", id: "pactspirit-count", value: <PactspiritCount /> }}
      />
      <div id="pactspirits" className="pactspirit-grid m-3.5 grid grid-cols-1 gap-3 leading-[normal]">
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
