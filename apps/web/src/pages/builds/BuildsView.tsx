import { BuildsPage } from "../../features/builds/BuildsPage";

export function BuildsView() {
  return (
    <section id="builds-view" className="app-view mx-auto max-w-390 leading-[normal]" hidden>
      <BuildsPage />
    </section>
  );
}
