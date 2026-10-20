// State of a dialog the legacy planner opens: it starts over each time the planner opens the dialog again (its source's
// `session` goes up), as the legacy code cleared a dialog's search box on every opening.
import { useState } from "react";

export function useSessionState<T>(session: number, initial: T): [T, (value: T) => void] {
  const [state, setState] = useState({ session, value: initial });
  if (state.session !== session) {
    setState({ session, value: initial });
    return [initial, (value) => setState({ session, value })];
  }
  return [state.value, (value) => setState({ session, value })];
}
