// A list of choices (ChoiceList.tsx) read as plain options: its options out of their groups, and the label
// of the one it holds.
import type { OptionView, SelectChoice } from "@legacy/app/bridge/equipment-crafter-view.ts";

export const flatChoices = (choices: SelectChoice[]): OptionView[] =>
  choices.flatMap((choice) => ("group" in choice ? choice.options : [choice]));

/** The label of the choice a list holds; `none` when it holds none. */
export function choiceLabel(choices: SelectChoice[], value: string, none = "None"): string {
  return flatChoices(choices).find((option) => option.value === value)?.label ?? none;
}
