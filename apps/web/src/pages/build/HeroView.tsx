import { HeroPanel } from "../../features/hero/HeroPanel";
import { buildSectionPlace } from "../../ui/section-card";

// The Hero Trait tab: the hero's trait tabs and trait tree.
export function HeroView() {
  return (
    <section id="hero-view" className={`app-view min-w-0 scroll-mt-[82px] ${buildSectionPlace}`}>
      <HeroPanel />
    </section>
  );
}
