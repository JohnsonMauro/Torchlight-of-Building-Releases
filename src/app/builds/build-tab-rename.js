// Inline rename of the active build from the build strip (apps/web/src/features/builds/ActiveBuildTab.tsx).
// Mirrors updateActiveBuildMetadata's rule: names are trimmed and a blank name
// keeps the old one. Returns the name to save, or null when nothing changes.
export function resolveBuildRename(input, currentName) {
  const name = String(input ?? "").trim();
  if (!name || name === String(currentName ?? "").trim()) return null;
  return name;
}
