# Codex Change History

<!-- Status Key -->

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">Completed:</strong> Used for work that is finished and merged into the project.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.6);box-shadow:0 0 12px rgba(255,255,255,0.3);">
  <strong style="color:#FFFFFF;">Brainstorm / Pending:</strong> Captures ideas or tasks awaiting kickoff or feedback.
</div>
<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(140,90,255,0.15);border:1px solid rgba(140,90,255,0.35);">
  <strong style="color:#CFA8FF;">Testing / Validation:</strong> Work that is coded but needs QA, verification, or platform checks.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,64,64,0.12);border:1px solid rgba(255,64,64,0.35);">
  <strong style="color:#FF6060;">Known Bug:</strong> Defects or regressions we've identified and still need to fix.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">Release Note:</strong> Milestones or features that are polished and ready to ship.
</div>

<!-- Actual Entries -->

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-22 12:45:00</strong> &ndash; Release Note: Tables & Oracles pane revamp — three-zone layout (top: ORACLES AND TABLES header + search/log controls; middle: scrollable table tree; bottom: anchored Result Card). Table rolls now go through the dice engine via rollOracleD100, per-row Dices icon triggers the engine, and results map to table rows and the anchored Result Card. When "Log to Entry" is enabled, the same dice-log-card HTML used by the Dice Tool is appended into the active Entry for consistent logging. UX polish: tighter row spacing, smaller per-row icons, and consistent Result Card styling to match Dice Tray results.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-21 12:00:00</strong> &ndash; Completed: Dev-only Table Forge (Developer Mode) added to the right tools&mdash;empty Aspect/Domain generators with correct macro ranges, AI fill via OpenAI (one request per table, preserves macros), new Settings &rarr; AI (API key + model), and IPC save to repo tables (aspects/domains). Also renamed the macro label to ACTION + THEME across code and hard-fixed existing JSON files. UI polished to match Dice Tray components.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-20 17:30:00</strong> &ndash; Release Note: Dice overhaul v0.1.5&mdash;single shared DiceBox manager with appearance controls (theme/tens color, scale, fade), crate pruning and audio cues; native d100 plus colored d%66/d%88 tens rolls; unified Result Cards (challenge, pool, degrade, exploding, percentile, mixed dice) now mirror the live tray in Entries with headers/results always visible; fixed multi-die logging/markup and raised fade floor to stop mid-roll disappearances.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-20 11:30:00</strong> &ndash; Completed: Added Exploding Dice support with a new template (3d6!6 default), full roller integration (sequential explosions, DiceBox-aware), and result cards that list each roll/explosion group, bold exploding values, and color PASS results green when explosions occur.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-20 10:45:00</strong> &ndash; Release Note: Center pane now uses tabbed editors; Home opens by default, sidebar buttons open/focus Home/Journal/Tables tabs, tapestry clicks spawn Tome tabs, and tabs can be closed independently with sensible focus fallback when the last one closes (empty state shown). Layout updated with a tab bar plus scrollable content so multiple docs stay open at once without disrupting the right-side tools.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-20 09:30:00</strong> &ndash; Completed: Polished the Dice Tray UX with unified 40px/32px controls, persistent DIS/ADV toggles that mirror the logging toggle (mutually exclusive and reset on clear), smarter modifier handling (increment/decrement the trailing modifier, show it in headers/cards, and include it in totals), and a tidied CSS pass to keep spacing and active states consistent.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 22:05:00</strong> &ndash; Completed: Enabled draggable dividers with guardrails (sidebar min 260px, tools min 450px) and recentered the entry canvas to 90% width so the workspace stays balanced regardless of pane sizes.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 21:45:00</strong> &ndash; Release Note: Shipped the modular DiceExpression + DiceRoller engine (with pools, degradation, challenge rolls, and DiceBox-backed results) and rebuilt the Dice Tools UI so every roll runs through the new parser, single-call renderer, and expression builder.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 21:06:40</strong> &ndash; Completed: Polished the dice tool UX (icon-only row, smarter die stacking, template clears, entry logging toggle) and taught the roller to fire DiceBox once per expression&mdash;including proper percentile (d100+d10) handling.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 20:39:51</strong> &ndash; Completed: Rebuilt the Dice Tray around the expression builder&mdash;die buttons now build DiceExpression strings, templates exist for challenge/pool/degrade rolls, modifiers can be tweaked, expressions saved/loaded, and every roll runs through DiceBox + the highlight system.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 20:17:26</strong> &ndash; Completed: Wired the Dice Dev tool to the DiceBox provider so every test expression now triggers the 3D dice animation and pulls real die values through the new async roller.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 20:14:03</strong> &ndash; Completed: Added the DiceBox value provider + DiceRoller async pipeline so parsed expressions can request actual 3D dice results (provider interface, adapter, reusable highlights hook ready for UI integration).
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 19:52:27</strong> &ndash; Completed: Extended DiceExpression/DiceRoller with native challenge-roll support (custom action/challenge dice + modifiers), updated the dev tool hint, and documented the behavior in `docs/dice-expression.md` and `docs/dice-roller.md`.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 19:41:19</strong> &ndash; Completed: Added a temporary Dice Dev tool in the right pane so we can type any DiceExpression, roll it through the new DiceRoller, and inspect structured JSON results directly inside the app.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 19:36:40</strong> &ndash; Completed: Built the DiceExpression module (with pool + degrade syntax), stood up the DiceRoller/roll result objects, and documented every supported expression in `docs/dice-expression.md` so future tools/macros share the same API.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.6);box-shadow:0 0 12px rgba(255,255,255,0.3);">
  <strong style="color:#FFFFFF;">2025-11-19 18:40:41</strong> &ndash; Brainstorm: When generating a new Tapestry, automatically create a default onboarding `.md` entry that explains the workspace layout and serves as a hands-on tutorial page.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.6);box-shadow:0 0 12px rgba(255,255,255,0.3);">
  <strong style="color:#FFFFFF;">2025-11-19 17:15:10</strong> &ndash; Brainstorm: Architect the Oracles/Tables tool as a universal table manager (independent of Tapestries) with a filesystem-like hierarchy so users can add/edit/delete tables and roll on them directly inside the app.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.6);box-shadow:0 0 12px rgba(255,255,255,0.3);">
  <strong style="color:#FFFFFF;">2025-11-19 17:10:36</strong> &ndash; Brainstorm: Extract the filesystem/Tapestry CRUD operations into a shared service or hook so the sidebar, upcoming context menus, and any other panes can reuse the same logic without duplicating IPC calls.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 16:47:09</strong> &ndash; Completed: Implemented the dice overlay fade pipeline&mdash;the DiceBox scene now appears instantly, fades on its own timer, and is controlled from the new Dice settings slider/number input with a safeguarded 0.5s minimum.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 16:34:20</strong> &ndash; Completed: Linked Dice Tray rolls to the active entry, appending formatted Result cards automatically and refining the accordion so headers/results stay visible while metadata collapses, keeping typography aligned across themes.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 16:34:20</strong> &ndash; Release Note: Both Dice Tray and Entry Result cards now share the same header/footer treatment, outcome colors, and accordion behavior, so every roll looks identical whether you view it live or inside a Tapestry.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 15:36:58</strong> &ndash; Completed: Delivered the Tapestry workspace stack by creating the <code>tapestries/</code> root, adding the full Settings modal and persistent store (General plus Files &amp; Threads), converting the preload bridge, and wiring the filesystem-backed tree with New/Rename/Delete modals, inline renaming, and Editor/View toggles powered by marked.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 11:54:21</strong> &ndash; Completed: Rebuilt the Dice Tray interaction model with Lucide die icons, ADV/DIS toggles, modifier controls, and edge-to-edge result cards, then stripped every stray border so hover feedback relies solely on color and stroke weight.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 11:50:27</strong> &ndash; Release Note: Dice tray light/dark mode, the advantage/disadvantage engine, and the refreshed controls/results are ready for broader testing.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 10:08:02</strong> &ndash; Completed: Established the UI foundation by logging our workflow, unifying icon treatment across every toolbar, wiring the bottom status bar, and launching the Sun/Moon toggle with paired palettes so dark and light themes stay perfectly synchronized.
</div>
