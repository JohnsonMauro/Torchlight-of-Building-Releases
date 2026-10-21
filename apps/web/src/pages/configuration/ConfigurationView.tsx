import { ConfigurationPanel } from "../../features/configuration/ConfigurationPanel";
import { useViewSource } from "../../ui/use-view-source";

export function ConfigurationView() {
  return (
    <section id="configuration-view" className="app-view" hidden>
      <div id="combat-conditions" className="configuration-card">
        <Configuration />
      </div>
    </section>
  );
}

// A component of its own, so a planner change re-renders the card and not the static shell around it.
function Configuration() {
  const source = useViewSource("configuration");
  return source ? <ConfigurationPanel {...source} /> : null;
}
