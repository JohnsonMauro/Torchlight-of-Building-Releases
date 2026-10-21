import { BuildsPage } from "../../features/builds/BuildsPage";
import { useViewOpen } from "../../ui/use-workspace";

export function BuildsView() {
  const open = useViewOpen("builds");
  return (
    <section id="builds-view" className="app-view mx-auto max-w-390 leading-[normal]" hidden={!open}>
      <BuildsPage />
    </section>
  );
}
