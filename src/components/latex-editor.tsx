import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { latex } from "@codemirror/legacy-modes/mode/latex";
import { EditorView } from "@codemirror/view";
import { useTheme } from "@/lib/theme";

/**
 * Browser-only LaTeX editor. This module must never be imported during SSR —
 * the route renders it behind a mounted check with React.lazy.
 */
export default function LatexEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const extensions = useMemo(
    () => [
      StreamLanguage.define(latex),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { fontSize: "13px" },
        ".cm-gutters": { backgroundColor: "transparent", border: "none" },
      }),
    ],
    []
  );

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme === "dark" ? "dark" : "light"}
      extensions={extensions}
      basicSetup={{ lineNumbers: true, highlightActiveLine: true, foldGutter: false, autocompletion: false }}
      onChange={onChange}
      aria-label="LaTeX source editor"
      style={{ height: "100%", overflow: "auto" }}
    />
  );
}
