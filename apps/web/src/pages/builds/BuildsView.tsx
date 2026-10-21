import { BuildsPage } from "../../features/builds/BuildsPage";
import { SafeModeNotice } from "../../features/builds/SafeModeNotice";
import { useViewOpen } from "../../ui/use-workspace";

export function BuildsView() {
  const open = useViewOpen("builds");
  return (
    <section id="builds-view" className="app-view mx-auto max-w-390 leading-[normal]" hidden={!open}>
      <SafeModeNotice />
      <BuildsPage />
    </section>
  );
}
