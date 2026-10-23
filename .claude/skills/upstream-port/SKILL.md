---
name: upstream-port
description: How to bring a change from TomSelleck09's repository (the upstream remote) into this fork — read his diff since the last ported commit, map his paths to ours, port by hand, keep src/data byte for byte, record the ported commit. Use when the owner asks to port, sync or check upstream changes, or when new game data arrives from upstream.
---

# Porting from upstream

Upstream (`upstream` remote, TomSelleck09/Torchlight-of-Building-Releases) is reference only: we never merge or
rebase onto it and never open PRs there. We read his diff and port by hand.

## 1. Read the right version

**Last upstream commit ported: `7059768` (2026-10-19).** Update this line in the port's commit.

1. `git fetch upstream` and read `upstream/main`, never a stale local copy.
2. Read `git diff 7059768..upstream/main` (the commit above), file by file.
3. The upstream commit you port up to goes in the commit body and in the line above.

## 2. Map his paths to ours

- His `src/` root modules live in folders here: pure domain code in `src/engine/<domain>/`, the page in `src/app/`,
  the log import in `src/game-log/`.
- His `src/app.js` code is split into the section controllers (`planner-guide` §1): find the controller that owns the
  section his change touches.
- His page code imports engine and data modules directly; ours imports them only from `src/engine/index.ts`
  (`engine-guide` §1): a ported import becomes a name in the entry, added to its domain's group if it is new.
- His `src/data/**` paths are unchanged but for the season: his files and identifiers say `ss13` / `Ss13`, ours
  `ss14` / `Ss14` (`engine-guide` §1). A copied file is renamed and its identifiers changed the same way
  (`sed -e 's/Ss13/Ss14/g' -e 's/-ss13\b/-ss14/g'`); nothing else in it changes, so a `*.generated.js` can probably be
  copied whole. Not tried yet: on the first port, check that nothing of ours imports a
  name his new copy dropped (typecheck + `pnpm test`), then delete this note.
- His UI (legacy markup and CSS) is not ported as markup: port the behaviour into our React feature and Tailwind
  classes (`react-guide`, `styling-guide`).

## 3. Prove the port

- A calculation change shows in `pnpm golden:diff`: the moved paths must be the ones his change explains; then
  `pnpm golden:update` in the same commit.
- A UI behaviour gets an e2e assertion in the feature's spec.
- A deviation from his code (a bug of his we do not copy, an API we replaced) is named in the commit body with the
  reason.

## 4. Desktop builds

`package.json` `build.publish` still points at his releases: electron-updater would replace our build with his.
Repoint or disable it before shipping a desktop build of ours.
