import React from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
// Note: dice widgets are intentionally not included in the editor (Edit mode only)
// import { diceWidgetExtension } from "../../editor/extensions/diceWidgetExtension";
import { oneDark } from "@codemirror/theme-one-dark";

export interface EntryEditorProps {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

export function EntryEditor({ value, onChange, editable = true }: EntryEditorProps) {
  const extensions = [
    markdown(),
    EditorView.lineWrapping,
    // TODO: Anvil & Loom custom editor-only extensions
  ];

  const rootClass = editable
    ? "entry-editor-root entry-editor-root--edit"
    : "entry-editor-root entry-editor-root--readonly";

  return (
    <div className={rootClass}>
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={extensions}
        editable={editable}
        onChange={(val) => {
          if (editable) onChange(val);
        }}
        basicSetup={{
          lineNumbers: false,
          highlightActiveLine: true,
        }}
      />
    </div>
  );
}
