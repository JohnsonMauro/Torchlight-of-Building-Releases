// What the Skills section of the Build page shows, read from a calculated build: the skill board of the open tab (Skills:
// five active skill rows, Auras: four) with each row's supports and Energy, the Energy total, and the Mana and Life the
// auras seal. Pure; the React view (apps/web/src/features/skills) renders it and src/app/skills/skill-board.js publishes it
// (src/app/bridge/view-sources.ts "skills"), so the game data stays in the planner's bundle.
import {
  curseSlotSummary,
  energyCostForSupportPositions,
  equipmentSlots,
  skillBoardRows,
  supportSlotsForSetup,
  tliArt,
  tlidbSkillCatalog,
  tlidbSupportCatalog,
} from "#engine";
import type { InstalledSupport, PlannerResult, PlannerSkills, SkillSetup } from "#engine";

export type SkillBoardTab = "skills" | "auras";

/** A support socket of a board row. */
export interface SupportSocketView {
  slot: number;
  /** The support in the socket; null when it is empty. */
  name: string | null;
  art: string | null;
  /** The hero trait that put the support here: such a socket opens, moves and removes nothing. */
  grantedBy: string | null;
  /** The user's own support is here, so it can be dragged. */
  draggable: boolean;
  label: string;
  title: string;
}
/** The skill on a board row. */
export interface BoardSkillView {
  name: string;
  /** The key the build's skill settings use for this setup. */
  setupKey: string;
  art: string | null;
  baseLevel: number;
  /** Levels the build adds on top of the base level (negative when it takes levels away). */
  addedLevels: number;
  /** Trait-granted skill: " · replaces <skill>" or " · trait skill"; "" otherwise. */
  grantNote: string;
  /** The hero trait that put the skill here: its socket opens, moves and removes nothing. */
  grantedBy: string | null;
  /** The user's own skill is on this row, so it can be dragged and removed. */
  draggable: boolean;
  /** Why a board rule set the skill aside (a Spirit Magus in an active slot without Iris). */
  inactiveReason: string | null;
  /** Skills tab: why the curse limit leaves this curse out. */
  curseOffReason: string | null;
  energy: number;
}
export interface SkillRowView {
  row: number;
  skill: BoardSkillView | null;
  /** The name an empty row shows ("Active 3", "Aura 2"). */
  emptyName: string;
  /** The skill socket's accessible name. */
  label: string;
  supports: SupportSocketView[];
}
/**
 * Mana or Life the auras on the board leave free, as the game's skill screen shows it under "Sealed Mana / Life" (2026-10-22:
 * "64.70% · 1380/2133" is the Life left, with 35.30% sealed).
 */
export interface SealedResourceView {
  /** The share left free: "64.7%". */
  percent: string;
  /** "1,380.73 / 2,133.48": free / max. */
  sealed: string;
  /** "752.75 sealed", or "104.5% requested before cap" once the auras ask for 100% or more. */
  detail: string;
  /** Width of the meter (the free share), 0–100. */
  meterPercent: number;
  overCapacity: boolean;
}
/** The Energy total and where the available Energy comes from (the "i" beside the total). */
export interface EnergyView {
  used: number;
  available: number;
  /** Each equipped gear piece that gives Energy, weapons first; a slot switched off gives none and is left out. */
  gear: { slot: string; item: string; value: number }[];
  /** The character level's Energy (the energy profile's figure, read from a game sheet). */
  fromLevel: number;
}
export interface SkillsView {
  tab: SkillBoardTab;
  energy: EnergyView;
  rows: SkillRowView[];
  reservation: {
    mana: SealedResourceView;
    life: SealedResourceView;
    /** What stops the aura setup from activating in full ("Mana reservation reaches 100%"); empty when nothing does. */
    problems: string[];
  };
}

const SUPPORT_SOCKETS = 5;
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const format = (value: number) => number.format(value);
// The planner's art, else the catalog icon (src/app/planner/session.js fills tliArt the same way when it loads).
const artFor = (art: Record<string, string | undefined>, catalog: readonly { name: string; icon?: string }[]) => {
  const icons = new Map(catalog.map((entry) => [entry.name, entry.icon]));
  return (name: string) => art[name] || icons.get(name) || null;
};
const skillArt = artFor(tliArt.skills, tlidbSkillCatalog);
const supportArt = artFor(tliArt.supports, tlidbSupportCatalog);
export function skillsView(planner: PlannerResult, skills: PlannerSkills, tab: SkillBoardTab): SkillsView {
  const { profile, setups, energy } = planner.activation;
  const supportSlots = (setup: SkillSetup) =>
    supportSlotsForSetup(setup, skills.supportOrder[setup.setupKey], {
      traitGrants: true,
    }) as (InstalledSupport | null)[];
  const slotEnergy = (setup: SkillSetup) =>
    energyCostForSupportPositions(setup.role, setup.occupiedSupportSlots, profile) as number;
  const used = setups.filter((setup) => setup.enabled).reduce((sum, setup) => sum + slotEnergy(setup), 0);
  const shown = skillBoardRows(setups, skills.boardSlots, tab, { traitGrants: true }) as (SkillSetup | null)[];
  const own = skillBoardRows(setups, skills.boardSlots, tab) as (SkillSetup | null)[];
  const curses = tab === "auras" ? null : curseLeftOut(planner);
  const rowCount = tab === "auras" ? 4 : 5;
  const rows = Array.from({ length: rowCount }, (_, row): SkillRowView => {
    const setup = shown[row] || null;
    const emptyName = `${tab === "auras" ? "Aura" : "Active"} ${row + 1}`;
    if (!setup)
      return {
        row,
        skill: null,
        emptyName,
        label: `Select ${emptyName}`,
        supports: Array.from({ length: SUPPORT_SOCKETS }, (_, slot) => ({
          slot,
          name: null,
          art: null,
          grantedBy: null,
          draggable: false,
          label: `Add support ${slot + 1} to empty skill`,
          title: "Add support",
        })),
      };
    const grant = setup.traitGranted;
    const ownSupports = supportSlotsForSetup(setup, skills.supportOrder[setup.setupKey]) as (InstalledSupport | null)[];
    const installed = supportSlots(setup);
    return {
      row,
      skill: {
        name: setup.name,
        setupKey: setup.setupKey,
        art: skillArt(setup.name),
        baseLevel: setup.baseLevel,
        addedLevels: Number(setup.addedLevels) || 0,
        grantNote: grant
          ? ` · ${grant.replaces ? `replaces ${grant.replaces}` : grant.item ? "item skill" : "trait skill"}`
          : "",
        grantedBy: grant?.trait ?? null,
        draggable: !grant && Boolean(own[row]),
        inactiveReason: setup.slotInactive ?? null,
        curseOffReason: curses?.has(setup.name) ? curses.reason : null,
        energy: slotEnergy(setup),
      },
      emptyName,
      label: grant ? `${setup.name}, granted by ${grant.trait}` : `Replace ${setup.name}`,
      supports: Array.from({ length: SUPPORT_SOCKETS }, (_, slot): SupportSocketView => {
        const support = installed[slot];
        const supportGrant = support?.traitGranted;
        return {
          slot,
          name: support?.name ?? null,
          art: support ? supportArt(support.name) : null,
          grantedBy: supportGrant?.trait ?? null,
          draggable: Boolean(support && !supportGrant && ownSupports[slot]),
          label: support ? `Replace ${support.name}` : `Add support ${slot + 1} to ${setup.name}`,
          title: supportGrant
            ? `Granted by ${supportGrant.trait}`
            : support
              ? "Drag to move · right-click while dragging to duplicate"
              : "Add support",
        };
      }),
    };
  });
  return {
    tab,
    energy: {
      used,
      available: energy.available,
      gear: energy.sources
        .filter((source) => source.enabled)
        .sort((a, b) => Number(isWeapon(b.slot)) - Number(isWeapon(a.slot)))
        .map((source) => ({ slot: slotLabel(source.slot), item: source.name, value: source.value })),
      fromLevel: energy.nonEquipmentEnergy,
    },
    rows,
    reservation: reservationView(planner),
  };
}

/** The curses the curse limit leaves out of the skill bar (packages/engine/src/skills/curse-limit.js), and why. */
function curseLeftOut(planner: PlannerResult): { has: (name: string) => boolean; reason: string } | null {
  let summary: { leftOut: { kind: string; name: string }[]; reason?: string } | null;
  try {
    summary = curseSlotSummary(planner);
  } catch {
    return null;
  }
  if (!summary) return null;
  const names = new Set(summary.leftOut.filter((curse) => curse.kind === "skill").map((curse) => curse.name));
  return { has: (name) => names.has(name), reason: summary.reason || "curse limit reached" };
}

const isWeapon = (slot: string) => slot === "mainHand" || slot === "secondaryHand";
const slotLabel = (slot: string) => equipmentSlots.find(([key]) => key === slot)?.[1] ?? slot;

function reservationView(planner: PlannerResult): SkillsView["reservation"] {
  const ledger = planner.aura.planned || planner.aura;
  const resource = (maximum: number, reservedPercent: number, demandPercent: number): SealedResourceView => {
    const sealed = (maximum * reservedPercent) / 100;
    const freePercent = Math.max(0, Math.round((100 - reservedPercent) * 10000) / 10000);
    const overCapacity = demandPercent >= 100;
    return {
      percent: `${format(freePercent)}%`,
      sealed: `${format(Math.max(0, maximum - sealed))} / ${format(maximum)}`,
      detail: overCapacity ? `${format(demandPercent)}% requested before cap` : `${format(sealed)} sealed`,
      meterPercent: Math.min(100, freePercent),
      overCapacity,
    };
  };
  const mana = resource(
    planner.aura.pools?.maxMana ?? 0,
    ledger.manaReservedPercent,
    ledger.manaDemandPercent ?? ledger.manaReservedPercent,
  );
  const life = resource(
    planner.aura.pools?.maxLife ?? 0,
    ledger.lifeReservedPercent,
    ledger.lifeDemandPercent ?? ledger.lifeReservedPercent,
  );
  const problems = [
    mana.overCapacity ? "Mana reservation reaches 100%" : "",
    life.overCapacity ? "Life reservation reaches 100%" : "",
  ].filter(Boolean);
  return { mana, life, problems };
}
