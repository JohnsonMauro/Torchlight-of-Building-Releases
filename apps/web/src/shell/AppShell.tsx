import { SiteHeader } from "./SiteHeader";
import { LoadoutStrip } from "./LoadoutStrip";
import { OverviewView } from "./views/OverviewView";
import { BuildsView } from "./views/BuildsView";
import { CharacterView } from "./views/CharacterView";
import { SkillsView } from "./views/SkillsView";
import { ConfigurationView } from "./views/ConfigurationView";
import { TalentsView } from "./views/TalentsView";
import { EquipmentView } from "./views/EquipmentView";
import { PactsView } from "./views/PactsView";
import { SlatesView } from "./views/SlatesView";
import { SiteDisclaimer } from "./SiteDisclaimer";
import { PactspiritSelectorDialog } from "./dialogs/PactspiritSelectorDialog";
import { KismetCrafterDialog } from "./dialogs/KismetCrafterDialog";
import { FateSlotSelectorDialog } from "./dialogs/FateSlotSelectorDialog";
import { PrismInventoryDialog } from "./dialogs/PrismInventoryDialog";
import { PrismCrafterDialog } from "./dialogs/PrismCrafterDialog";
import { HeroSelectorDialog } from "./dialogs/HeroSelectorDialog";
import { FollowerSelectorDialog } from "./dialogs/FollowerSelectorDialog";
import { HeroMemorySelectorDialog } from "./dialogs/HeroMemorySelectorDialog";
import { SageScentSelectorDialog } from "./dialogs/SageScentSelectorDialog";
import { CarinoAmmoSelectorDialog } from "./dialogs/CarinoAmmoSelectorDialog";
import { TalentPanelPickerDialog } from "./dialogs/TalentPanelPickerDialog";
import { CoreTalentPickerDialog } from "./dialogs/CoreTalentPickerDialog";
import { SlateInventoryDialog } from "./dialogs/SlateInventoryDialog";
import { SlateEditorDialog } from "./dialogs/SlateEditorDialog";
import { EquipmentCrafterDialog } from "./dialogs/EquipmentCrafterDialog";
import { InventoryItemDialog } from "./dialogs/InventoryItemDialog";
import { SkillSelectorDialog } from "./dialogs/SkillSelectorDialog";
import { ImportBuildDialog } from "./dialogs/ImportBuildDialog";
import { FeedbackDialog } from "./dialogs/FeedbackDialog";
import { ImportGameLogDialog } from "./dialogs/ImportGameLogDialog";
import { ResetBuildConfirmDialog } from "./dialogs/ResetBuildConfirmDialog";
import { DeleteAllBuildsConfirmDialog } from "./dialogs/DeleteAllBuildsConfirmDialog";
import { DeleteBuildConfirmDialog } from "./dialogs/DeleteBuildConfirmDialog";
import { PlannerTooltip } from "./PlannerTooltip";
import { Toast } from "./Toast";
import { RestoreBuildsFileInput } from "./RestoreBuildsFileInput";

/**
 * The planner's static page structure, rendered once before the legacy planner (src/app.js) starts. The legacy code
 * finds these elements by id and changes them in place, so this tree must never re-render.
 */
export function AppShell() {
  return (
    <>
      <SiteHeader />
      <LoadoutStrip />
      <main>
        <OverviewView />
        <BuildsView />
        <CharacterView />
        <SkillsView />
        <ConfigurationView />
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
      <DeleteAllBuildsConfirmDialog />
      <DeleteBuildConfirmDialog />
      <PlannerTooltip />
      <Toast />
      <RestoreBuildsFileInput />
    </>
  );
}
