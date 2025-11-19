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

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 10:08:02</strong> &ndash; Completed: Established the UI foundation by logging our workflow, unifying icon treatment across every toolbar, wiring the bottom status bar, and launching the Sun/Moon toggle with paired palettes so dark and light themes stay perfectly synchronized.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 11:54:21</strong> &ndash; Completed: Rebuilt the Dice Tray interaction model with Lucide die icons, ADV/DIS toggles, modifier controls, and edge-to-edge result cards, then stripped every stray border so hover feedback relies solely on color and stroke weight.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 15:36:58</strong> &ndash; Completed: Delivered the Tapestry workspace stack by creating the <code>tapestries/</code> root, adding the full Settings modal and persistent store (General plus Files &amp; Threads), converting the preload bridge, and wiring the filesystem-backed tree with New/Rename/Delete modals, inline renaming, and Editor/View toggles powered by marked.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 16:34:20</strong> &ndash; Completed: Linked Dice Tray rolls to the active entry, appending formatted Result cards automatically and refining the accordion so headers/results stay visible while metadata collapses, keeping typography aligned across themes.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 16:47:09</strong> &ndash; Completed: Implemented the dice overlay fade pipeline&mdash;the DiceBox scene now appears instantly, fades on its own timer, and is controlled from the new Dice settings slider/number input with a safeguarded 0.5s minimum.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 11:50:27</strong> &ndash; Release Note: Dice tray light/dark mode, the advantage/disadvantage engine, and the refreshed controls/results are ready for broader testing.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 16:34:20</strong> &ndash; Release Note: Both Dice Tray and Entry Result cards now share the same header/footer treatment, outcome colors, and accordion behavior, so every roll looks identical whether you view it live or inside a Tapestry.
</div>
