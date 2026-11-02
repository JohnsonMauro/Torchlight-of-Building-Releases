# Changelog

All notable changes to TLI Planner. Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html); the
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Releases of the original Torchlight of Building
app (up to its 0.2.0) are not described here.

## [Unreleased]

### Fixed

- On a slow computer, dropping a dragged skill or Kismet no longer also clicks where it lands (which opened that skill's
  selector or took the Kismet off its node).

## [0.2.0] - 2026-11-02

### Added

- Holding Alt moves a tooltip's keyword explanations to a panel beside it, on the side away from the pointer, so the
  tooltip no longer runs past the bottom of the window.

### Changed

- Slate tooltips list talent affixes as the game does: a diamond in the node type's colour (Micro blue, Medium purple,
  Legendary Medium and core orange) and the effect alone, one stat per line; a core shows its name, its effect under Alt.
- The slate tools say what they do (with their keys) and stand one under the other.
- Nether King's Divinity: Judgment no longer rotates or flips: it lies as placed.

### Fixed

- A core talent granted by gear ("[Beacon] +2 Max Spell Burst") counts once, however many items grant it, and not at all
  while the talent panel has that core.
- Long damage source names (a follower's) no longer push the damage summary past the character column, hiding the shares.

## [0.1.0] - 2026-10-31

### Added

- First release of TLI Planner for Windows: an installer that updates itself from this repository's releases, and a
  portable exe. It installs beside the original Torchlight of Building app, with its own folder, shortcuts and build
  library.

[Unreleased]: https://github.com/JohnsonMauro/Torchlight-of-Building-Releases/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/JohnsonMauro/Torchlight-of-Building-Releases/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/JohnsonMauro/Torchlight-of-Building-Releases/releases/tag/v0.1.0
