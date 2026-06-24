"use client";

import CodeMirror, { type ViewUpdate } from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

export interface EditorSelection {
  from: number;
  to: number;
  text: string;
  html: string;
}

export default function CodeEditor({
  value,
  onChange,
  onSelect,
  dark,
  language = "html",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (sel: EditorSelection) => void;
  dark: boolean;
  language?: "html" | "plain";
}) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={dark ? oneDark : "light"}
      extensions={language === "html" ? [html()] : []}
      onChange={onChange}
      onUpdate={(vu: ViewUpdate) => {
        if (!onSelect || (!vu.selectionSet && !vu.docChanged)) return;
        const { from, to } = vu.state.selection.main;
        onSelect({ from, to, text: vu.state.sliceDoc(from, to), html: vu.state.doc.toString() });
      }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
      style={{ height: "100%", fontSize: 13 }}
    />
  );
}
