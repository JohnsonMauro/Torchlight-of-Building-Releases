import { HeroPanel } from "../../features/hero/HeroPanel";
import { buildSectionPlace } from "../../ui/section-card";
import { useViewOpen } from "../../ui/use-workspace";

// The Hero Trait tab: the hero's trait tabs and trait tree.
export function HeroView() {
  const open = useViewOpen("hero");
  return (
    <section id="hero-view" className={`app-view min-w-0 scroll-mt-[82px] ${buildSectionPlace}`} hidden={!open}>
      <HeroPanel />
    </section>
  );
}
