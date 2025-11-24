Perfect, let the grown-up Loomwright earn his keep. 😄

Before you hand it off, here’s a tight recap you can literally paste as the “do this now” block so he doesn’t wander:

---

### Task: Integrate CodeMirror 6 as the Entry editor

**1. Use these packages (already installed):**

* `@uiw/react-codemirror`
* `@codemirror/lang-markdown`
* `@codemirror/theme-one-dark`

---

### 2. Create `EntryEditor` component

**File (example):** `src/components/editor/EntryEditor.tsx`

```tsx
import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

export interface EntryEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function EntryEditor({ value, onChange }: EntryEditorProps) {
  const extensions = [
    markdown(),
    // TODO: Anvil & Loom custom extensions (dice widgets, result cards, clocks, etc.)
  ];

  return (
    <div className="entry-editor-root">
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        onChange={(val) => onChange(val)}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
        }}
      />
    </div>
  );
}
```

---

### 3. Wire it into the center pane

Find the component that currently renders the Entry text in the center pane (where the textarea / basic editor is).

Replace that with:

```tsx
import { EntryEditor } from "@/components/editor/EntryEditor"; // adjust path

// ...

<EntryEditor
  value={activeEntry.content ?? ""}        // use existing entry content field
  onChange={(val) => updateEntryContent(val)}  // use existing update function
/>
```

Key rule: **do NOT change the Entry model or persistence**, just swap UI.

---

### 4. Add basic styles

**File:** `src/styles/editor.css` (or similar global/module)

```css
.entry-editor-root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.entry-editor-root .cm-editor {
  height: 100%;
  font-family: var(--font-monospace, Menlo, Consolas, monospace);
  font-size: 0.95rem;
}
```

Import this once in your app bootstrap (e.g. `main.tsx` or `App.tsx`):

```ts
import "./styles/editor.css";
```

Make sure the center pane container is flexed so the editor can actually take full height.

---

### 5. Acceptance checklist

Loomwright should verify:

* Selecting an Entry shows its markdown in the new editor.
* Typing updates content and uses the same save/auto-save as before.
* Markdown syntax is highlighted (`#`, `**`, `-` lists, etc.).
* No new errors in the console or Electron logs.
* CodeMirror fills the center pane, not a tiny strip.

---

If anything explodes (types, layout, or “white screen of nope”), send me the error + the affected component and we’ll triage it.
