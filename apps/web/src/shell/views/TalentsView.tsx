import { FollowerPanel } from "../../features/follower/FollowerPanel";

export function TalentsView() {
  return (
    <section id="talents-view" className="app-view">
      <aside className="planner-hero-panel">
        <div className="planner-section-title hero-panel-tabs">
          <div className="hero-panel-tab-list" role="tablist" aria-label="Hero and follower">
            <button
              type="button"
              role="tab"
              id="hero-panel-tab-hero"
              className="active"
              aria-selected="true"
              aria-controls="hero-panel-hero"
              data-hero-panel-tab="hero"
            >
              Hero
            </button>
            <button
              type="button"
              role="tab"
              id="hero-panel-tab-follower"
              aria-selected="false"
              aria-controls="follower-panel"
              tabIndex={-1}
              data-hero-panel-tab="follower"
            >
              Follower
            </button>
          </div>
          <button type="button" className="qol-help" data-qol-help="hero" aria-label="Hero controls">
            ?
          </button>
        </div>
        <div id="hero-panel-hero" className="hero-panel-content" role="tabpanel" aria-labelledby="hero-panel-tab-hero">
          <div className="hero-showcase">
            <div className="hero-portrait" id="selected-hero-portrait" />
            <div className="hero-identity">
              <span id="selected-hero-name">Selena</span>
              <strong id="selected-hero-trait">Sing with the Tide</strong>
              <button type="button" className="change-hero-button" data-change-hero="">
                Change Hero
              </button>
            </div>
          </div>
          <div id="hero-detail-tabs" className="hero-detail-tabs" hidden>
            <button type="button" data-hero-detail-tab="traits">
              Hero Trait
            </button>
            <button type="button" data-hero-detail-tab="scent">
              Scent Bottle
            </button>
          </div>
          <div id="hero-trait-tree" className="hero-trait-tree" aria-label="Selena hero traits and memories" />
        </div>
        <div
          id="follower-panel"
          className="hero-panel-content follower-panel"
          role="tabpanel"
          aria-labelledby="hero-panel-tab-follower"
          hidden
        >
          <FollowerPanel />
        </div>
      </aside>
      <div className="talent-page-heading">
        <div>
          <p className="eyebrow">Captured build</p>
          <h1>Talent trees</h1>
          <p className="muted">
            Left-click a node to add a point. Right-click to remove one. Hover for its exact effect.
          </p>
        </div>
        <div className="talent-total">
          <span>Total allocated</span>
          <strong id="talent-total">—</strong>
        </div>
      </div>
      <div id="talent-board-tabs" className="talent-board-tabs" role="tablist" aria-label="Talent boards" />
      <div className="talent-layout">
        <section className="panel talent-tree-panel">
          <div className="talent-board-heading">
            <div>
              <p className="eyebrow" id="talent-board-kind">
                Talent panel
              </p>
              <h2 id="talent-board-name">—</h2>
            </div>
            <div className="talent-board-header-side">
              <strong id="talent-board-points" className="point-total">
                —
              </strong>
              <div className="talent-board-actions" aria-label="Talent tree actions">
                <button type="button" className="talent-action talent-action-prism" data-install-prism="">
                  Install Prism
                </button>{" "}
                <button type="button" className="talent-action talent-action-reselect" data-reselect-tree="">
                  Reselect
                </button>{" "}
                <button
                  type="button"
                  className="talent-action talent-action-reset"
                  data-reset-talents=""
                  title="Reset points on the open talent tree"
                >
                  Reset
                </button>{" "}
                <button type="button" className="qol-help" data-qol-help="talents" aria-label="Talents controls">
                  ?
                </button>
              </div>
            </div>
          </div>
          <div id="prism-placement-prompt" className="prism-placement-prompt" hidden>
            <span>
              {"Click a talent node to install "}
              <strong id="prism-placement-name" />.
            </span>
            <button type="button" data-cancel-prism-placement="">
              Cancel
            </button>
          </div>
          <div id="core-talents" className="core-talents" />
          <div className="talent-stage-wrap">
            <div className="talent-thresholds" aria-hidden="true">
              <span>0</span>
              <span>3</span>
              <span>6</span>
              <span>9</span>
              <span>12</span>
              <span>15</span>
              <span>18</span>
            </div>
            <div id="talent-stage" className="talent-stage" role="grid" aria-label="Allocated talent nodes" />
          </div>
        </section>
      </div>
      <section className="panel allocation-audit">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Verification</p>
            <h2>Allocated effects</h2>
          </div>
        </div>
        <div id="talent-audit" />
      </section>
    </section>
  );
}
