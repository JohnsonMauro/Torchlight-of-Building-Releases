---
name: react-guide
description: React conventions of apps/web — where a component goes (shell, pages, features, ui), .tsx exports only components, view sources through useViewSource, the shared inputs, dialogs and pointer drag, accessible names the e2e tests use, and the React traps already measured here. Use before writing or changing a React component, hook or dialog in apps/web, or before adding a shared piece to apps/web/src/ui.
---

# React in `apps/web`

React 19 without the React Compiler (`@vitejs/plugin-react` with no compiler plugin), so nothing is memoized for
you; `eslint-plugin-react-hooks` recommended rules and `react-refresh/only-export-components` are errors.

## 1. Where a component goes

| It is | It lives in |
|---|---|
| the app frame (header, rail, build strip, footer, toast, tooltip host) | `apps/web/src/shell/` |
| a page's composition (which features, in which order) | `apps/web/src/pages/<page>/` — little markup |
| a feature's components, its dialogs, its `*-classes.ts` | `apps/web/src/features/<feature>/` |
| a piece two or more features use (`SectionHeading`, `HelpButton`, `Artwork`, inputs, hooks, class constants) | `apps/web/src/ui/` |

Something one feature uses stays in that feature; it moves to `ui/` when a second one needs it, and the copy it
replaces is deleted (`styling-guide` §4). Do it without asking (owner, 2026-10-22): a repeated element is
componentized in the change that sees it, and the report says so.

## 2. Data and actions

- Read planner data with `useViewSource("name")` (null until provided: render a placeholder such as "—"). Open/closed
  state of a build tab: `useViewOpen("skills")`. Never read `plannerState` or a controller (`planner-guide`).
- Act with `plannerCommands().name(...)`; read on demand with `plannerQueries()`.
- UI-only state (a hover, an open menu) is `useState` in the component that owns it. State of a dialog the planner
  opens (a search box) uses `useSessionState(source.session, initial)` (`ui/use-session-state.ts`): it starts over
  each time the dialog opens again.

## 3. Shared pieces to use instead of rewriting

- Number fields: `CommitNumberInput` (reports on the native `change`: Enter, blur, spin arrows) and `LiveNumberInput`
  (reports every typed number). React's `onChange` on `<input type="number">` is the `input` event: a plain one would
  recalculate the build on "1", "12", "120".
- Dialogs: native `<dialog>` registered with `useRegisteredDialog` (`ui/dialog-registry.ts`) so the planner and the
  header can open it by id; `ConfirmDialog` for confirmations; classes in `ui/dialog-classes.ts`.
- `autoFocus` only calls `focus()` on mount and never writes the attribute, while `showModal()` focuses the descendant
  that carries it: use `setAutofocusAttribute` (`shell/autofocus.ts`) as a ref.
- Drag and drop: `usePointerDrag` (`ui/use-pointer-drag.ts`): 5 px threshold, ghost, right-click copy, swallows the
  click after a drop. Call `hideTooltip()` in `onStart`.
- A slider with its number field: `RangeInput` (`field="live"` for rolls, `"commit"` for a level); a slider alone takes
  `RANGE_FIELD` (`ui/range-classes.ts`).
- A list search: `SearchField` (⌕, ×, the /regex/ hint and its error) over `searchMatcher(query).matches(text)`, the
  text built with `searchText([...])` (`src/app/bridge/search-match.ts`): plain words in any order, or /pattern/flags.
- Images: `Artwork` (the ◆ placeholder when there is no image); headings: `SectionHeading`; help: `HelpButton`.

## 4. Hooks

- No `useEffect` to derive data from props or sources: compute during render.
- External stores go through `useSyncExternalStore`, and its `getSnapshot` must return the same reference while
  nothing changed (`readViewSource` caches by version for that reason).
- `useCallback`/`useMemo` only where identity matters (the `subscribe` of a store, a dependency of an effect), not by
  habit.
- `ref` is a normal prop: no `forwardRef` in new code.

## 5. Accessible names are the test API

The e2e tests find controls by role and accessible name (`getByRole("button", { name: "Reset Skills", exact: true })`,
"Select Active 5", "Replace Aim"). So:

- A control without visible text gets an `aria-label` that says what it does to what ("Add support 5 to Aim").
- Changing a visible label or an `aria-label` changes the tests: update the page object in the same change
  (`e2e-guide`).
- An image that carries meaning has an `alt` (the Energy icon: "Energy"); a decorative glyph is `aria-hidden`.
- A `title` is a hint, not the name: do not move the only name of a control into `title`.

## 6. Lists

`key` from an id only when the ids are unique: generated game data does not guarantee it (a repeated key makes React
keep stale rows when the list is filtered). Check with
`new Set(ids).size` before keying a catalog list by id; otherwise key by position (a list without reorder or
per-row state) or id + position.
