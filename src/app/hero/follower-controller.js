// The hero panel's FOLLOWER tab and the follower selector.
import { followerById, followerRarityById } from "../../engine/followers/follower-model.js";
import { closeDialog, openDialog } from "../bridge/dialogs.ts";
import { viewSourceChanged } from "../bridge/view-sources.ts";
import { followerPanelView, followerPickerView, pickFollower, setFollowerSkill } from "./follower-panel.js";
import { escapeHtml } from "../html.js";
import { plannerState } from "../planner/session.js";
import { openFollowerSkillSelector } from "../skills/skill-selector.js";
import { hidePlannerTooltip } from "../tooltips/tooltip-host.js";
import { commitFollower } from "./hero-controller.js";

let followerSelectorSession = 0; // the follower selector's openings (apps/web/src/features/follower/FollowerSelectorDialog.tsx)
export const followerCommands = {
  // Follower tab (apps/web/src/features/follower).
  openFollowerSelector: () => {
    followerSelectorSession++;
    viewSourceChanged("followerSelector");
    openDialog("follower-selector");
  },
  selectFollower: (followerId, rarityId) => {
    const next = pickFollower(plannerState, followerId, rarityId);
    closeDialog("follower-selector");
    commitFollower(
      next,
      `${escapeHtml(followerById(next.followerId)?.displayName || "Follower")} · ${escapeHtml(followerRarityById(next.rarity)?.name || "")} selected`,
    );
  },
  openFollowerSkillSelector: (slot) => {
    hidePlannerTooltip();
    openFollowerSkillSelector(slot);
  },
  clearFollowerSkill: (slot) => {
    hidePlannerTooltip();
    commitFollower(setFollowerSkill(plannerState, slot, null), "Skill slot cleared");
  },
};
export const followerViewSources = {
  // The FOLLOWER tab's data (src/app/hero/follower-panel.js).
  follower: () => followerPanelView(plannerState),
  // The follower selector's data (apps/web/src/features/follower/FollowerSelectorDialog.tsx).
  followerSelector: () => ({
    session: followerSelectorSession,
    cards: followerPickerView(plannerState),
  }),
};
