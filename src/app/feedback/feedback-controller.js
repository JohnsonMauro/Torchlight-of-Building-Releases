// The in-planner feedback dialog and the build code it attaches.
import { encodePlannerState } from "../../engine/state/planner-state.ts";
import { APP_VERSION } from "../app-version.js";
import { openDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { $ } from "../planner/page.js";
import { persistPlannerState, plannerState } from "../planner/session.js";
import { ui } from "../planner/ui-state.js";
import { bugAreaForView, platformName } from "./feedback-links.js";

export const feedbackViewSources = {
  // The feedback dialog.
  feedback: () => ({ session: feedbackSession, ...feedbackRequest }),
};
// Report buttons: each opens the in-planner feedback dialog (apps/web/src/features/feedback/FeedbackDialog.tsx) with its GitHub
// form's fields; "Send to GitHub" puts the compact build code in the URL when it is included and fits (else copies it)
// and opens the pre-filled issue form in a new tab (the desktop app hands it to the system browser,
// electron/main.cjs setWindowOpenHandler). The dialog reads the "feedback" source: the form and its context.
let feedbackSession = 0,
  feedbackRequest = { formKey: "", context: {} };
export function openFeedback(formKey, context) {
  feedbackSession++;
  feedbackRequest = { formKey, context };
  viewSourceChanged("feedback");
  openDialog("feedback-dialog");
}
export function currentBuildCode() {
  try {
    return encodePlannerState(plannerState);
  } catch {
    return "";
  }
}
// The header's Report a bug button.
export function installFeedbackEvents() {
  $("[data-report-bug]").addEventListener("click", () => {
    persistPlannerState();
    openFeedback("bug", {
      area: bugAreaForView({
        view: ui.activeWorkspaceView,
        statsPanel: ui.activeStatsPanel,
        slateMode: ui.talentSlateMode,
      }),
      version: APP_VERSION,
      platform: platformName(window),
      buildCode: currentBuildCode(),
    });
  });
}
