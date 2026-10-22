// Whether a component renders inside the page's tooltip (TooltipHost provides true): there it cannot open a tooltip of
// its own, since the page shows one tooltip at a time.
import { createContext, useContext } from "react";

export const InTooltip = createContext(false);

export function useInTooltip(): boolean {
  return useContext(InTooltip);
}
