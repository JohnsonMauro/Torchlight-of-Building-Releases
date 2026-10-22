import type { GearSlotIconKind } from "@legacy/app/bridge/gear-slot-icon.ts";
import { GEAR_SLOT_PATHS } from "./gear-slot-paths";

/** A gear slot's silhouette, filled in the current color (an empty equipment slot, a crafter's gear group). */
export function GearSlotIcon({ kind, className }: { kind: GearSlotIconKind; className?: string }) {
  return (
    <svg className={`shrink-0 fill-current ${className ?? ""}`} viewBox="0 0 512 512" aria-hidden="true">
      <path d={GEAR_SLOT_PATHS[kind]} />
    </svg>
  );
}
