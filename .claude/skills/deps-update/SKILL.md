---
name: deps-update
description: Dependency policy and update procedure for this planner — whether a library earns its place, reading release notes for every version in the bump, re-checking the skills that teach the bumped package, and the guards to run. Run only when the owner invokes /deps-update or explicitly asks to add, remove or bump a dependency.
disable-model-invocation: true
---

# Dependencies

The runtime set is small on purpose (`react`, `react-dom`, `electron-updater`); everything else is a dev tool. Read
the versions in `package.json` and `pnpm-lock.yaml` at the time of the task; never write a version number into a skill.

## 1. Does it earn its place?

Keep or add a library only for a problem that is hard to get right (edge cases, security, accessibility-heavy widgets,
a protocol we do not own). Replace it with the platform or our own code when the platform already does it
(`<dialog>`, `Intl`, `structuredClone`, `fetch`), when it is a thin wrapper, or when we use one function of a kit.
Code is cheap to write and still costs tests, review and maintenance: say in the commit why the library and not the
platform.

## 2. Bumping

1. List what is outdated: `pnpm outdated`.
2. For each package to bump, read the release notes of **every** version between the installed one and the target.
3. Grep the skills (`.claude/skills/`) and `CLAUDE.md` for the package name and the APIs it touches; fix any rule the
   new version changes, in the same commit.
4. Bump, `pnpm install`, then the full gate: lint, typecheck, format:check, `pnpm test`, `pnpm test:e2e`, and
   `pnpm test:desktop` for Electron or electron-builder.
5. Tool-specific checks: a Tailwind bump re-runs `tests/unit/styling-rules.test.js` (it compiles with the installed
   Tailwind) and needs a look at both themes; a Playwright bump needs the installed Chrome to match; an
   `electron-builder` bump re-checks `build.publish` (`upstream-port` §4).
6. Stop and show the owner the plan (packages, notes read, skills changed) before committing.
