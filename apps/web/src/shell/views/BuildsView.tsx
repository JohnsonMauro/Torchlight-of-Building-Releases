import { BuildsPage } from "../../features/builds/BuildsPage";

export function BuildsView() {
  return (
    <section id="builds-view" className="app-view builds-page" hidden>
      <BuildsPage />
    </section>
  );
}
