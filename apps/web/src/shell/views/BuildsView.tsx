import { BuildsPage } from "../../features/builds/BuildsPage";

export function BuildsView() {
  return (
    <section
      id="builds-view"
      className="app-view mx-auto max-w-390 px-[clamp(16px,2.3vw,38px)] pt-4.5 pb-9.5 leading-[normal]"
      hidden
    >
      <BuildsPage />
    </section>
  );
}
