import { FollowerColumn } from "../../features/hero/HeroPanel";
import { buildSectionPlace } from "../../ui/section-card";

// The Follower tab: the follower card and its skill slots.
export function FollowerView() {
  return (
    <section id="follower-view" className={`app-view min-w-0 scroll-mt-[82px] ${buildSectionPlace}`} hidden>
      <FollowerColumn />
    </section>
  );
}
