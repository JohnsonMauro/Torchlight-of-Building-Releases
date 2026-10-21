import { SiteHeader } from "./SiteHeader";
import { LoadoutStrip } from "./LoadoutStrip";
import { ViewRail } from "./ViewRail";
import { BuildsView } from "../pages/builds/BuildsView";
import { CharacterView } from "../pages/stats/CharacterView";
import { SkillsView } from "../pages/build/SkillsView";
import { ConfigurationView } from "../pages/configuration/ConfigurationView";
import { TalentsView } from "../pages/build/TalentsView";
import { HeroView } from "../pages/build/HeroView";
import { FollowerView } from "../pages/build/FollowerView";
import { EquipmentView } from "../pages/build/EquipmentView";
import { PactsView } from "../pages/build/PactsView";
import { SlatesView } from "../pages/build/SlatesView";
import { SiteDisclaimer } from "./SiteDisclaimer";
import { CharacterColumn } from "../features/hero/HeroPanel";
import { PactspiritSelectorDialog } from "../features/pacts/PactspiritSelectorDialog";
import { KismetCrafterDialog } from "../features/pacts/KismetCrafterDialog";
import { FateSlotSelectorDialog } from "../features/pacts/FateSlotSelectorDialog";
import { PrismInventoryDialog } from "../features/talents/PrismInventoryDialog";
import { PrismCrafterDialog } from "../features/talents/PrismCrafterDialog";
import { HeroSelectorDialog } from "../features/hero/HeroSelectorDialog";
import { FollowerSelectorDialog } from "../features/follower/FollowerSelectorDialog";
import { HeroMemorySelectorDialog } from "../features/hero/HeroMemorySelectorDialog";
import { SageScentSelectorDialog } from "../features/hero/SageScentSelectorDialog";
import { CarinoAmmoSelectorDialog } from "../features/hero/CarinoAmmoSelectorDialog";
import { TalentPanelPickerDialog } from "../features/talents/TalentPanelPickerDialog";
import { CoreTalentPickerDialog } from "../features/talents/CoreTalentPickerDialog";
import { SlateInventoryDialog } from "../features/slates/SlateInventoryDialog";
import { SlateEditorDialog } from "../features/slates/SlateEditorDialog";
import { EquipmentCrafterDialog } from "../features/gear/EquipmentCrafterDialog";
import { InventoryItemDialog } from "../features/gear/InventoryItemDialog";
import { SkillSelectorDialog } from "../features/skills/SkillSelectorDialog";
import { ImportBuildDialog } from "../features/builds/ImportBuildDialog";
import { FeedbackDialog } from "../features/feedback/FeedbackDialog";
import { ImportGameLogDialog } from "../features/builds/ImportGameLogDialog";
import { ResetBuildConfirmDialog } from "../features/builds/ResetBuildConfirmDialog";
import { PlannerTooltip } from "./PlannerTooltip";
import { Toast } from "./Toast";
import { RestoreBuildsFileInput } from "./RestoreBuildsFileInput";

/**
 * The planner's static page structure, rendered once before the planner (src/app/app.js and its controllers) starts. The legacy code
 * finds these elements by id and changes them in place, so this tree must never re-render.
 */
export function AppShell() {
  return (
    <>
      <SiteHeader />
      <ViewRail />
      <LoadoutStrip />
      {/* The build's tabs (body.unified-planner): the character column, and the open tab's section beside it; the other views show one, padded. */}
      <main className="ml-16 px-6 pt-6 pb-20 max-[760px]:px-3 max-[760px]:pt-4 max-[760px]:pb-28 in-[.unified-planner]:grid in-[.unified-planner]:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] in-[.unified-planner]:items-start in-[.unified-planner]:gap-6 max-[900px]:in-[.unified-planner]:grid-cols-1 max-[900px]:in-[.unified-planner]:gap-4">
        <CharacterColumn className="hidden in-[.unified-planner]:block col-start-1 row-start-1 self-start" />
        <BuildsView />
        <CharacterView />
        <SkillsView />
        <ConfigurationView />
        <HeroView />
        <FollowerView />
        <TalentsView />
        <EquipmentView />
        <PactsView />
        <SlatesView />
        <SiteDisclaimer />
      </main>
      <PactspiritSelectorDialog />
      <KismetCrafterDialog />
      <FateSlotSelectorDialog />
      <PrismInventoryDialog />
      <PrismCrafterDialog />
      <HeroSelectorDialog />
      <FollowerSelectorDialog />
      <HeroMemorySelectorDialog />
      <SageScentSelectorDialog />
      <CarinoAmmoSelectorDialog />
      <TalentPanelPickerDialog />
      <CoreTalentPickerDialog />
      <SlateInventoryDialog />
      <SlateEditorDialog />
      <EquipmentCrafterDialog />
      <InventoryItemDialog />
      <SkillSelectorDialog />
      <ImportBuildDialog />
      <FeedbackDialog />
      <ImportGameLogDialog />
      <ResetBuildConfirmDialog />
      <PlannerTooltip />
      <Toast />
      <RestoreBuildsFileInput />
    </>
  );
}
