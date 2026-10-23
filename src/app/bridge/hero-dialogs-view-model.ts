// What the HERO tab's Sage scent selector and Carino Special Ammo selector list (apps/web/src/shell/dialogs). The planner
// passes in what depends on the open build (the slot, its supports, Well Prepared); the texts are as the legacy markup
// printed them (src/app/bridge/display-text.ts). Pure.
import { sageElixirsSs13, sageScentIngredientsSs13 } from "../../engine/index.ts";
import { displayTexts } from "./display-text.ts";
import { searchText } from "./search-match.ts";

export type SageScentKind = "elixir" | "damage" | "defense" | "functional";

export interface SageScentChoiceView {
  name: string;
  icon: string;
  /** An elixir's skill tags; null for an ingredient. */
  tags: string[] | null;
  /** An ingredient's effect; "" for an elixir. */
  description: string;
  /** What the search box matches (name, tags, effect; src/app/bridge/search-match.ts searchText). */
  search: string;
}
export interface SageScentSelectorView {
  kind: SageScentKind;
  title: string;
  placeholder: string;
  choices: SageScentChoiceView[];
}

const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());

/** The Basic Scent's elixirs, or one kind of ingredient. */
export function sageScentSelectorView(kind: SageScentKind): SageScentSelectorView {
  const elixir = kind === "elixir";
  const entries: { name: string; icon: string; tags?: string[]; description?: string }[] = elixir
    ? sageElixirsSs13
    : sageScentIngredientsSs13[kind];
  return {
    kind,
    title: elixir ? "Select Elixir Skill" : `Select ${titleCase(kind)} Ingredient`,
    placeholder: elixir ? "Search skills…" : "Search ingredients…",
    choices: entries.map((entry) => ({
      ...displayTexts({
        name: entry.name,
        icon: entry.icon,
        tags: elixir ? [...(entry.tags || [])] : null,
        description: elixir ? "" : entry.description || "",
      }),
      search: searchText([entry.name, ...(elixir ? entry.tags || [] : []), elixir ? "" : entry.description]),
    })),
  };
}

/** A support the Special Ammo selector lists (src/engine/heroes/carino-special-ammo.js carinoSpecialAmmoOptions). */
export interface CarinoAmmoOption {
  name: string;
  icon?: string;
  category: string;
  exclusiveFor?: string;
  effects?: string[];
}
export interface CarinoAmmoChoiceView {
  name: string;
  /** The name without its " (Magnificent)" / " (Noble)" suffix. */
  label: string;
  icon: string;
  category: string;
  /** Its exclusive skill, else "Projectile compatible". */
  exclusive: string;
  effects: string;
  /** In another Special Ammo slot already (shown, not pickable). */
  installed: boolean;
  /** What the search box matches (name, exclusive skill and category), lower case. */
  search: string;
}
export interface CarinoAmmoSelectorView {
  /** The slot it was opened for (0–2). */
  slot: number;
  help: string;
  choices: CarinoAmmoChoiceView[];
}

export function carinoAmmoSelectorView(
  slot: number,
  options: readonly CarinoAmmoOption[],
  installed: readonly string[],
  wellPrepared: boolean,
): CarinoAmmoSelectorView {
  return {
    slot,
    help: wellPrepared
      ? "Choose a compatible Projectile support that is not installed on the skill panel."
      : "Choose a compatible regular Projectile support. Well Prepared unlocks Magnificent and Noble supports.",
    choices: options.map((entry) => ({
      ...displayTexts({
        name: entry.name,
        label: entry.name.replace(/ \((Magnificent|Noble)\)$/, ""),
        category: titleCase(entry.category),
        exclusive: entry.exclusiveFor || "Projectile compatible",
        effects: (entry.effects || []).join(" "),
      }),
      icon: entry.icon || "",
      installed: installed.includes(entry.name),
      search: searchText([entry.name, entry.exclusiveFor, entry.category]),
    })),
  };
}
