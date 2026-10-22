---
name: tooltip-guide
description: The tooltip architecture of this planner — the Tooltip component and TooltipHost, hideTooltip, and the per-domain recipe (pure display model, controller query, feature wrapper, exported card) with gear as the guide. Use before adding a tooltip kind, changing what a tooltip shows, showing one domain's card inside another tooltip, or touching drag/keyboard code that must hide a tooltip.
---

# Tooltips

## 1. The pieces

- `apps/web/src/ui/tooltip/`: `<Tooltip content>` wraps one element; `TooltipHost` places it, follows the pointer,
  hides it on scroll and on any press outside it, and shows it inside an open dialog.
- An edit or a drag that a press does not start (the keyboard; pointer capture keeps a dragged anchor "hovered" until
  the drop) hides it with `hideTooltip()` from `tooltip-store.ts` (the skill board calls it in `onStart` of each drag).
- The "?" help is a tooltip too (`HelpButton`, topics in `apps/web/src/ui/help-topics.ts`).

## 2. Per-domain recipe (gear is the guide)

1. **Display model**: the item's view and its pure builder in `src/app/bridge/<domain>-…-view.ts`
   (`gear-item-view.ts` `gearTooltipView`), with a unit test (`tests/unit/gear-tooltip-view.test.js`). What depends on
   the open build is passed in.
2. **Query**: in the domain's controller, gathering that input inside `withRenderPass` (`gear-controller.js`
   `gearTooltip`), provided in `app.js` (`planner-guide` §2).
3. **Wrapper**: a component in the feature (`features/gear/GearTooltip.tsx`: `<GearTooltip target>{element}</GearTooltip>`)
   that reads the query when the tooltip opens and renders the content, its classes in `*-tooltip-classes.ts`.
   Pieces several domains share sit in `ui/` (`ModifierText` with Alt via `useAltHeld`, `CoverageBadge`).
4. **Card**: exported (`GearTooltipCard`, `SkillCard`, `TraitCard`…) with its frame kind in its classes module, so
   another tooltip can show it: a Stats damage path source (`features/stats/DamageSourceTooltip.tsx`, query
   `damageSourceTooltip` in `src/app/stats/damage-source-tooltip.js`) shows the card of what it names.

## 3. Tests

Find a tooltip by `getByRole("tooltip")` and tell kinds apart by their content: the frame's kind variants
(`[&.skill-tooltip]:…`) spell every kind in its class list, so `toHaveClass(/skill-tooltip/)` always matches and
proves nothing (`styling-guide` §6). Hover with `page.mouse.move(0, 0)` first when a previous tooltip may still show.
