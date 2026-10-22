// The page's search box: ⌕, the field, a × that empties it (and focuses the field again), and, under it, why a typed
// /pattern/ cannot run. Every list search matches with src/app/bridge/search-match.ts searchMatcher (plain words in any
// order; /pattern/flags a regular expression), so the placeholder says so and the field's title explains it.
import { useRef, type InputHTMLAttributes } from "react";

type SearchAttributes = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "placeholder" | "className" | "ref"
> &
  Record<`data-${string}`, string | number | undefined>;

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** "Search kismets…"; " · /regex/" is added. */
  placeholder: string;
  /** Why the typed /pattern/ cannot run (searchMatcher's error); "" when it can. */
  error?: string;
  /** id, aria-label, data-* hooks. */
  input?: SearchAttributes;
  /** Called with the field when it mounts (setAutofocusAttribute, so a dialog's showModal focuses it). */
  inputRef?: (element: HTMLInputElement | null) => void;
  /** The wrapper's own classes (margins, a hook class). */
  className?: string;
}

const HINT = "Words in any order, over names and effects; /pattern/ for a regular expression";

export function SearchField({
  value,
  onChange,
  placeholder,
  error = "",
  input = {},
  inputRef,
  className = "",
}: SearchFieldProps) {
  const field = useRef<HTMLInputElement | null>(null);
  const setRefs = (element: HTMLInputElement | null) => {
    field.current = element;
    inputRef?.(element);
  };
  return (
    <div className={`grid min-w-0 gap-1 ${className}`}>
      <label className="field-search">
        <span className="text-lg leading-none text-accent" aria-hidden="true">
          ⌕
        </span>
        <input
          {...input}
          ref={setRefs}
          type="search"
          // The browser's own clear button would sit beside the field's ×: hidden.
          className="min-w-0 flex-1 placeholder:text-dim [&::-webkit-search-cancel-button]:appearance-none"
          autoComplete="off"
          placeholder={`${placeholder} · /regex/`}
          title={HINT}
          aria-invalid={error ? true : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="cursor-pointer px-1 text-muted hover:text-accent"
          aria-label="Clear search"
          hidden={!value}
          onClick={() => {
            onChange("");
            field.current?.focus();
          }}
        >
          ×
        </button>
      </label>
      {error ? <small className="text-xs text-danger">{error}</small> : null}
    </div>
  );
}
