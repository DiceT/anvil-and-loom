# Changelog

All notable changes to this project will be documented in this file. This project
adheres loosely to [Semantic Versioning](https://semver.org/) now that the dice
engine, filesystem foundation, and settings stack are in place.

## [0.1.0] - 2025-11-19

### Added
- Brand‑new DiceExpression parser and DiceRoller pipeline (challenge rolls, pool
  syntax, degrade triggers, modifier handling, DiceBox integration, roll
  highlighting).
- Rebuilt Dice Tray with icon-only controls, expression builder, templates,
  saved expressions, ADV/DIS toggles, entry logging toggle, and result cards
  that append to active entries.
- Dice Dev tool for testing arbitrary expressions plus documentation under
  `docs/dice-expression.md` and `docs/dice-roller.md`.
- Desktop Settings modal (General, Files & Threads, Dice categories) with
  persistent storage, filesystem-backed Tapestries root selector, Tape stry list,
  and create/select controls.
- Tapestry sidebar tree hooked to the filesystem with create/rename/delete
  modals, inline rename, folder filtering, and markdown entry editing plus view
  mode (using marked renderer).
- Light/dark themes with synchronized colors for toolbars, icons, result cards,
  and Dice Tray UI.
- Dice fade timing preference surfaced in Settings → Dice with slider + numeric
  control (clamped ≥0.5s).

### Changed
- Entry pane layout now centers at 90% width, and sidebar/tools panes feature
  draggable dividers with guardrails (≥260px sidebar, ≥450px tools) for better
  workspace balance.
- Package version bumped from `0.0.0` to `0.1.0` to mark the first feature-
  complete milestone.

### Fixed
- Dice result cards maintain header/footer visibility with collapsible metadata,
  ensuring identical styling in both the Dice Tray and appended entry logs.

[0.1.0]: https://github.com/your-org/anvil-and-loom/releases/tag/v0.1.0
