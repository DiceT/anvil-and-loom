# Changelog

All notable changes to this project will be documented in this file. This project
adheres loosely to [Semantic Versioning](https://semver.org/) now that the dice
engine, filesystem foundation, and settings stack are in place.

## [0.1.5] - 2025-11-20

### Added
- Dice Appearance controls now drive DiceBox directly (theme color, tens color, scale, fade timer), and a shared DiceBox manager ensures a single 3D instance for both Dice Tray and Dice Dev with audio cues and fade timing safeguards.
- Result card logging is unified with on-screen cards: challenge, pool, degrade, exploding, percentile, and multi-term rolls all render collapsible cards in Entries with headers/results always visible; multi-die expressions now list each die group plus modifiers.

### Changed
- Percentile handling updated to use native d100 (no extra d10) and custom tens/ones colors for d%66/d%88; DiceBox rolls are cleared/pruned before each roll to avoid lingering dice/canvases.
- Dice fade now has a minimum delay to prevent mid-roll disappearances, and settings changes rebuild the DiceBox overlay cleanly.

### Fixed
- Fixed missing results/stray markup in entry logs for generic and mixed-die rolls, ensuring totals, modifiers, and all dice values display consistently.
- Prevented extra canvases/dice from persisting between rolls by pruning the DiceBox container and clearing before each roll.

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

[0.1.5]: https://github.com/your-org/anvil-and-loom/releases/tag/v0.1.5
[0.1.0]: https://github.com/your-org/anvil-and-loom/releases/tag/v0.1.0
