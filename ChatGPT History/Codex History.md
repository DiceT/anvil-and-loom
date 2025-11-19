# Codex Change History

<!-- Status Key -->

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">Completed:</strong> Used for work that is finished and merged into the project.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.6);box-shadow:0 0 12px rgba(255,255,255,0.3);">
  <strong style="color:#FFFFFF;">Brainstorm / Pending:</strong> Captures ideas or tasks awaiting kickoff or feedback.
</div>
<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,190,120,0.2);border:1px solid rgba(255,190,120,0.45);">
  <strong style="color:#FFD8A6;">Spec / Ready for Codex:</strong> Finalized implementation instructions written for the Agent to execute.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(140,90,255,0.15);border:1px solid rgba(140,90,255,0.35);">
  <strong style="color:#CFA8FF;">Testing / Validation:</strong> Work that is coded but needs QA, verification, or platform checks.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,64,64,0.12);border:1px solid rgba(255,64,64,0.35);">
  <strong style="color:#FF6060;">Known Bug:</strong> Defects or regressions we’ve identified and still need to fix.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">Release Note:</strong> Milestones or features that are polished and ready to ship.
</div>

<!-- Actual Entries -->

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 09:20:28</strong> – Documented current UI/toolbar updates and initialized Codex change log tracking.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 09:21:13</strong> – Toolbar overhaul: unified icon styling, custom tooltips, bottom status bar, and focus ring removal for consistent dark theme UI.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 09:47:55</strong> – Added left/top/bottom toolbar enhancements with consistent hover weight changes, custom status bar icons, and color-coded history log formatting.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 10:08:02</strong> – Introduced a Sun/Moon theme toggle, synchronized icon colors with CSS variables, and defined complementary light-mode palette for the entire UI.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 10:13:11</strong> – Restyled DiceTray buttons/results to use theme-aware classes and align with light/dark palettes.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 10:54:40</strong> – Rebuilt DiceTray toolbar (polyhedral icons, ADV/DIS controls, modifier input) and extended diceEngine with advantage/disadvantage + action modifiers.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 11:50:27</strong> – Polished DiceTray result cards with edge-to-edge headers, bolded outcomes, and cleaner challenge math/labels.
</div>

<div style="margin-bottom:12px;padding:6px 10px;border-radius:8px;background:rgba(60,190,120,0.2);border:1px solid rgba(60,190,120,0.35);">
  <strong style="color:#7CFF8C;">2025-11-19 11:50:27</strong> – Release Ready: Dice tray light/dark mode, advantage/disadvantage engine, and formatted result cards feel shippable.
</div>

<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(80,180,180,0.2);border:1px solid rgba(80,180,180,0.4);">
  <strong style="color:#9FEAEA;">2025-11-19 11:54:21</strong> – Completed: removed all borders/outlines from ADV/DIS toggles and +/- controls so the dice toolbar uses color-only feedback.
</div>
<div style="margin-bottom:6px;padding:6px 10px;border-radius:8px;background:rgba(255,190,120,0.2);border:1px solid rgba(255,190,120,0.45);">
  <strong style="color:#FFD8A6;">2025-11-19 12:34:56</strong> – Spec / Ready for Codex – Implement the left-hand <em>Entries</em> pane for the current Tapestry, including its toolbar icons and behavior.

  <br><br>
  <strong>Context</strong>: The app uses a three-pane layout. The left pane should act as an Obsidian-style navigator for the current <strong>Tapestry</strong>, showing a list of <strong>Entries</strong>. Clicking an Entry opens it in the center pane for editing. Entries will eventually support multiple types (journal, map, table, character, etc.), but for now we only handle simple journal-style text entries.

  <br><br>
  <strong>Data model</strong>:
  <br>
  • Define an <code>EntryType</code> union, starting with: <code>"journal"</code> (future-proof for <code>"map"</code>, <code>"table"</code>, <code>"character"</code>, etc.).<br>
  • Define an <code>Entry</code> type:
  <br>
  <code>
  type EntryType = "journal"; // extend later as needed<br>
  type Entry = {<br>
  &nbsp;&nbsp;id: string;<br>
  &nbsp;&nbsp;tapestryId: string;<br>
  &nbsp;&nbsp;title: string;<br>
  &nbsp;&nbsp;type: EntryType;<br>
  &nbsp;&nbsp;createdAt: string;  // ISO<br>
  &nbsp;&nbsp;updatedAt: string;  // ISO<br>
  &nbsp;&nbsp;content: string;    // markdown / plain text for now<br>
  };
  </code>
  <br>
  • Assume a single active <code>tapestryId</code> is already known at the app level (current project). All Entries belong to that Tapestry.

  <br><br>
  <strong>State & APIs</strong>:
  <br>
  Implement a lightweight state module (or reuse the existing global state pattern) that manages Entries for the current Tapestry:
  <br>
  • <code>getEntriesForCurrentTapestry(): Entry[]</code> – returns all Entries belonging to the active Tapestry, sorted by <code>updatedAt</code> descending by default.<br>
  • <code>createEntry(partial?: { title?: string; type?: EntryType; content?: string }): Entry</code> – creates a new Entry for the current Tapestry, with sensible defaults (title: "Untitled Entry", type: "journal"). Sets <code>createdAt</code> and <code>updatedAt</code> to now.<br>
  • <code>updateEntry(id: string, updates: Partial&lt;Entry&gt;)</code> – merges updates, always refreshing <code>updatedAt</code> when content or title changes.<br>
  • <code>deleteEntry(id: string)</code> – removes an Entry, and if it was active, clears or switches to a remaining Entry.<br>
  • <code>setActiveEntry(id: string | null)</code> – tracks which Entry is currently open in the center pane.<br>
  • <code>getActiveEntry(): Entry | null</code> – convenience selector for the editor and other components.
  <br>
  Persistence can be in-memory for now; if a persistence layer already exists, store Entries there, grouped by <code>tapestryId</code>.

  <br><br>
  <strong>Left pane UI – Entries list</strong>:
  <br>
  • The left pane shows a vertical list of Entries for the current Tapestry.<br>
  • Each row displays:
  <br>
  &nbsp;&nbsp;– Entry title (fallback to "Untitled Entry" if empty).<br>
  &nbsp;&nbsp;– A small secondary line or subtle text for <code>updatedAt</code> (e.g., "Updated 5 min ago") if space allows.<br>
  &nbsp;&nbsp;– Optional: a tiny type icon placeholder (right now everything is <code>journal</code>, but structure should allow different icons later).<br>
  • The currently active Entry is visually highlighted (background or border consistent with the existing theme system).<br>
  • Single-click on a row calls <code>setActiveEntry(id)</code> and opens that Entry in the center editor.<br>
  • Double-click on the title toggles inline rename mode (simple text input) that commits back through <code>updateEntry</code>.

  <br><br>
  <strong>Left pane toolbar – icons and actions</strong>:
  <br>
  Use the same icon library already used for the dice toolbar (e.g., lucide-react or equivalent). The toolbar sits at the top of the left pane, aligned with existing dark/light theme styling.
  <br><br>
  <em>Icons (left-to-right):</em>
  <br>
  1) <strong>New Entry</strong><br>
  &nbsp;&nbsp;• Icon: "document with plus" style (e.g., <code>FilePlus</code> / <code>DocumentPlus</code> from the existing icon set).<br>
  &nbsp;&nbsp;• Tooltip: "New Entry".<br>
  &nbsp;&nbsp;• Behavior: calls <code>createEntry()</code>, inserts the new Entry at the top of the list, and immediately sets it active so it opens in the center pane.<br>
  <br>
  2) <strong>Duplicate Entry</strong><br>
  &nbsp;&nbsp;• Icon: "copy" style (e.g., <code>Copy</code>).<br>
  &nbsp;&nbsp;• Tooltip: "Duplicate Entry".<br>
  &nbsp;&nbsp;• Behavior: if an Entry is active, creates a new Entry with:<br>
  &nbsp;&nbsp;&nbsp;&nbsp;– <code>title</code> = original title + " (copy)"<br>
  &nbsp;&nbsp;&nbsp;&nbsp;– <code>type</code> = same as source<br>
  &nbsp;&nbsp;&nbsp;&nbsp;– <code>content</code> = same as source<br>
  &nbsp;&nbsp;  and sets the duplicate as active. If no Entry is active, the button is disabled or shows a neutral tooltip explaining why.<br>
  <br>
  3) <strong>Delete Entry</strong><br>
  &nbsp;&nbsp;• Icon: trash can (e.g., <code>Trash2</code>).<br>
  &nbsp;&nbsp;• Tooltip: "Delete Entry".<br>
  &nbsp;&nbsp;• Behavior: if an Entry is active, opens a simple confirmation (modal or inline confirm) like “Delete this Entry? This cannot be undone.” On confirm, calls <code>deleteEntry(id)</code>. After deletion:<br>
  &nbsp;&nbsp;&nbsp;&nbsp;– If other Entries exist, select the most recently updated one.<br>
  &nbsp;&nbsp;&nbsp;&nbsp;– If none remain, clear the active Entry and show the empty-state message in the center pane.<br>
  &nbsp;&nbsp;• If no Entry is selected, disable this icon.
  <br><br>
  (Optional, only if it fits current layout cleanly)<br>
  4) <strong>Search / Filter</strong><br>
  &nbsp;&nbsp;• Icon: magnifying glass.<br>
  &nbsp;&nbsp;• Tooltip: "Search Entries".<br>
  &nbsp;&nbsp;• Behavior: toggles a small search input field under the toolbar that filters visible Entries by title (case-insensitive substring match). This is a simple UI filter only; it does not change underlying state.

  <br><br>
  <strong>Center pane integration</strong>:
  <br>
  • The center editor reads <code>getActiveEntry()</code>. If it returns <code>null</code>, display a friendly empty state: e.g., “No Entry selected. Create a new Entry to begin this Tapestry.”<br>
  • When the user types in the editor, changes go through <code>updateEntry(id, { content })</code> and refresh <code>updatedAt</code>.<br>
  • If the Entry title is editable from the editor header, that also uses <code>updateEntry</code> and should stay in sync with the left pane list.

  <br><br>
  <strong>Constraints</strong>:
  <br>
  • Reuse the existing theme system (light/dark colors via CSS variables); the Entries list and toolbar should look native in both modes.<br>
  • Do not introduce new dependencies or state libraries; follow the current app’s state-management approach and icon conventions.<br>
  • Keep layout consistent with the existing three-pane structure; this work should not break the dice tray or right-hand pane.

  <br><br>
  <strong>Acceptance criteria</strong>:
  <br>
  • Left pane shows all Entries for the current Tapestry, sorted by <code>updatedAt</code> (newest first).<br>
  • Clicking an Entry opens it in the center pane; typing in the editor updates both content and the Entry’s <code>updatedAt</code> timestamp in the list.<br>
  • New Entry, Duplicate Entry, and Delete Entry icons all behave as described, including disabled states and confirmation for deletion.<br>
  • The UI looks correct in both light and dark themes, with no layout regressions or TypeScript errors.
</div>
