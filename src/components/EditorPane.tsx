import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage, bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";
import type { CollaborationBinding } from "../hooks/useCollaboration";

interface EditorPaneProps {
  content: string;
  fileName: string;
  onChange: (content: string) => void;
  collaboration?: CollaborationBinding;
}

const axiomateTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#101316", fontSize: "13px" },
  ".cm-scroller": { fontFamily: '"Berkeley Mono", "SFMono-Regular", Consolas, monospace', lineHeight: "1.72" },
  ".cm-gutters": { backgroundColor: "#101316", borderRight: "1px solid #202428", color: "#555d64" },
  ".cm-activeLineGutter": { backgroundColor: "#181c20", color: "#b8c0c7" },
  ".cm-activeLine": { backgroundColor: "#171b1e" },
  ".cm-selectionBackground": { backgroundColor: "#31594d !important" },
  ".cm-cursor": { borderLeftColor: "#83d6b6" },
  ".cm-content": { padding: "18px 0 60px" },
});

export function EditorPane({ content, fileName, onChange, collaboration }: EditorPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const changeRef = useRef(onChange);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hostRef.current) return;
    const extensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        StreamLanguage.define(stex),
        oneDark,
        axiomateTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) changeRef.current(update.state.doc.toString());
        }),
      ];
    if (collaboration) {
      extensions.push(yCollab(collaboration.text, collaboration.awareness, { undoManager: collaboration.undoManager }));
    }
    const state = EditorState.create({
      doc: collaboration?.text.toString() ?? contentRef.current,
      extensions,
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [collaboration, fileName]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === content) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: content } });
  }, [content]);

  return <div className="editor-host" ref={hostRef} aria-label={`${fileName} LaTeX editor`} />;
}
