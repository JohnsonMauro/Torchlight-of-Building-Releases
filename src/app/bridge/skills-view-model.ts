// What the Skills section of the Build page shows, read from a calculated build: the skill board of the open tab (Skills:
// five active skill rows, Auras: four) with each row's supports and Energy, the Energy total, and the Mana and Life the
// auras seal. Pure; the React view (apps/web/src/features/skills) renders it and src/app/skills/skill-board.js publishes it
// (src/app/bridge/view-sources.ts "skills"), so the game data stays in the planner's bundle.
import { tliArt } from "../../data/assets/tli-art.js";
import { tlidbSkillCatalogSs13, tlidbSupportCatalogSs13 } from "../../data/catalogs/tlidb-ss13.js";
import { selenaCompleteSkillLoadoutSs13 } from "../../data/skills/selena-complete-skill-loadout-ss13.js";
import { curseSlotSummary } from "../../engine/skills/curse-limit.js";
import { energyCostForSupportPositions } from "../../engine/engine.js";
import { skillBoardRows } from "../../engine/skills/skill-board-slots.js";
import { supportSlotsForSetup } from "../../engine/supports/support-slot-transfer.js";
import type { InstalledSupport, PlannerResult, SkillSetup } from "../../engine/planner-api.ts";
import type { PlannerSkills } from "../../engine/state/planner-state.ts";

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
/** Mana or Life sealed by the auras on the board. */
export interface SealedResourceView {
  /** "494.64 / 525" */
  sealed: string;
  /** "94.22% sealed · 30.36 usable", or "…% requested before cap" once the auras ask for 100% or more. */
  detail: string;
  /** Width of the meter, 0–100. */
  meterPercent: number;
  overCapacity: boolean;
}
export interface SkillsView {
  tab: SkillBoardTab;
  /** Enabled setups the user placed (trait-granted ones not counted). */
  setupCount: number;
  energy: { used: number; available: number };
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
const skillArt = artFor(tliArt.skills, tlidbSkillCatalogSs13);
const supportArt = artFor(tliArt.supports, tlidbSupportCatalogSs13);
/** The captured character's Mana and Life (the reservation is shown against them). */
const observedReservation = selenaCompleteSkillLoadoutSs13.observedReservation as {
  mana: { maximum: number };
  life: { maximum: number };
};

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
        grantNote: grant ? ` · ${grant.replaces ? `replaces ${grant.replaces}` : "trait skill"}` : "",
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
    setupCount: setups.filter((setup) => setup.enabled && !setup.traitGranted).length,
    energy: { used, available: energy.available },
    rows,
    reservation: reservationView(planner),
  };
}

/** The curses the curse limit leaves out of the skill bar (src/engine/skills/curse-limit.js), and why. */
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

function reservationView(planner: PlannerResult): SkillsView["reservation"] {
  const ledger = planner.aura.planned || planner.aura;
  const resource = (maximum: number, reservedPercent: number, demandPercent: number): SealedResourceView => {
    const sealed = (maximum * reservedPercent) / 100;
    const overCapacity = demandPercent >= 100;
    return {
      sealed: `${format(sealed)} / ${format(maximum)}`,
      detail: `${format(reservedPercent)}% sealed${overCapacity ? ` · ${format(demandPercent)}% requested before cap` : ` · ${format(Math.max(0, maximum - sealed))} usable`}`,
      meterPercent: Math.min(100, reservedPercent),
      overCapacity,
    };
  };
  const mana = resource(
    observedReservation.mana.maximum,
    ledger.manaReservedPercent,
    ledger.manaDemandPercent ?? ledger.manaReservedPercent,
  );
  const life = resource(
    observedReservation.life.maximum,
    ledger.lifeReservedPercent,
    ledger.lifeDemandPercent ?? ledger.lifeReservedPercent,
  );
  const problems = [
    mana.overCapacity ? "Mana reservation reaches 100%" : "",
    life.overCapacity ? "Life reservation reaches 100%" : "",
  ].filter(Boolean);
  return { mana, life, problems };
}
