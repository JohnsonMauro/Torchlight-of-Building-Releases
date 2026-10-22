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
import { SiteDisclaimer } from "./SiteDisclaimer";
import { PageMain } from "./PageMain";
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
import { ImportGameLogDialog } from "../features/builds/ImportGameLogDialog";
import { ResetBuildConfirmDialog } from "../features/builds/ResetBuildConfirmDialog";
import { TooltipHost } from "../ui/tooltip/TooltipHost";
import { Toast } from "./Toast";
import { OtherTabNotice } from "./OtherTabNotice";
import { RestoreBackupInput } from "../features/builds/RestoreBackupInput";

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
      <PageMain>
        <BuildsView />
        <CharacterView />
        <SkillsView />
        <ConfigurationView />
        <HeroView />
        <FollowerView />
        <TalentsView />
        <EquipmentView />
        <PactsView />
        <SiteDisclaimer />
      </PageMain>
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
      <ImportGameLogDialog />
      <ResetBuildConfirmDialog />
      <TooltipHost />
      <Toast />
      <OtherTabNotice />
      <RestoreBackupInput />
    </>
  );
}
