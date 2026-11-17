import { useEffect, useRef } from 'react';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { Annotation, Compartment, EditorState, RangeSet, type Extension, type TransactionSpec } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutterLineClass,
  highlightActiveLine,
  keymap,
  lineNumbers,
  type DecorationSet,
} from '@codemirror/view';
import { colorPicker } from '@replit/codemirror-css-color-picker';
import type { CodeEol } from '@studio/events';

import { codeLanguage } from './codeLanguage.js';
import { studioCodeTheme, TINT_CLASS, TINT_GUTTER_CLASS } from './codeTheme.js';
import { tintedLines, type LineSpan } from './tintRange.js';
import { bufferChange } from './bufferChange.js';
import { agentCodeChange, codeChangeMotion } from './changeMotion.js';
import { revealSourceRange, sourceRange } from './sourceRange.js';
import { wheelViewport } from './wheelViewport.js';

const externalBuffer = Annotation.define<boolean>();

/** Mirrored by `TESTID.codeArea`, which the recording drives it by. */
export const CODE_AREA_TESTID = 'code-area';

const TINT_MARK = Decoration.line({ class: TINT_CLASS });

function tintDecorations(view: EditorView, span: LineSpan | null): DecorationSet {
  const lines = tintedLines(span, view.state.doc.lines);
  return Decoration.set(lines.map((line) => TINT_MARK.range(view.state.doc.line(line).from)));
}

/** The gutter follows the tint, so the numbers beside the mapped lines read as part of it. */
function tintGutter(span: LineSpan | null): Extension {
  return gutterLineClass.compute([], (state) => {
    const lines = tintedLines(span, state.doc.lines);
    return RangeSet.of(
      lines.map((line) => TINT_GUTTER_MARK.range(state.doc.line(line).from)),
      true,
    );
  });
}

const TINT_GUTTER_MARK = new (class extends GutterMarker {
  override elementClass = TINT_GUTTER_CLASS;
})();

const tintField = new Compartment();
const languageField = new Compartment();

function tintExtension(span: LineSpan | null): Extension {
  return [EditorView.decorations.of((view) => tintDecorations(view, span)), tintGutter(span)];
}

export interface CodeAreaProps {
  path: string;
  /** The authoritative buffer, which the store owns; this is a view seeded from it. */
  text: string;
  animateChanges?: boolean;
  /** The file's own line ending, so a CRLF file is not rewritten by an edit to one value. */
  eol: CodeEol;
  tint: LineSpan | null;
  /** A line to bring into view once, from a search hit or a candidate; null leaves the view alone. */
  focusLine?: number | null;
  focusEditor?: boolean;
  onChange: (text: string) => void;
  onFocusApplied?: () => void;
}

export function codeBufferText(state: EditorState): string {
  return state.doc.sliceString(0, undefined, state.lineBreak);
}

export function revealCodeLine(editor: { state: EditorState; dispatch: (spec: TransactionSpec) => void; focus: () => void }, requestedLine: number, focusEditor: boolean): void {
  const line = Math.max(1, Math.min(requestedLine, editor.state.doc.lines));
  const position = editor.state.doc.line(line).from;
  editor.dispatch({ selection: { anchor: position }, effects: [EditorView.scrollIntoView(position, { y: 'center' }), revealSourceRange.of(position)] });
  if (focusEditor) editor.focus();
}

export function CodeArea({ path, text, eol, tint, animateChanges = false, focusLine = null, focusEditor = false, onChange, onFocusApplied }: CodeAreaProps): React.JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);
  const view = useRef<EditorView | null>(null);
  const emit = useRef(onChange);
  useEffect(() => {
    emit.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const parent = host.current;
    if (parent === null) return;
    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: text,
        extensions: [
          lineNumbers(),
          history(),
          bracketMatching(),
          indentOnInput(),
          highlightActiveLine(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          colorPicker,
          EditorState.lineSeparator.of(eol),
          languageField.of([]),
          tintField.of(tintExtension(tint)),
          studioCodeTheme(),
          codeChangeMotion,
          sourceRange,
          wheelViewport,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some(transaction => transaction.annotation(externalBuffer))) emit.current(codeBufferText(update.state));
          }),
        ],
      }),
    });
    view.current = editor;
    void codeLanguage(path).then((language) => {
      if (view.current === editor && language !== null) {
        editor.dispatch({ effects: languageField.reconfigure(language) });
      }
    });
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [path, eol]);

  useEffect(() => {
    const editor = view.current;
    if (editor === null) return;
    const changes = bufferChange(editor.state, text);
    if (changes === null) return;
    editor.dispatch({ changes, annotations: externalBuffer.of(true), effects: agentCodeChange.of(animateChanges) });
  }, [text, animateChanges]);

  useEffect(() => {
    view.current?.dispatch({ effects: tintField.reconfigure(tintExtension(tint)) });
  }, [tint]);

  useEffect(() => {
    const editor = view.current;
    if (editor === null || focusLine === null) return;
    revealCodeLine(editor, focusLine, focusEditor);
    onFocusApplied?.();
  }, [focusLine, focusEditor, path, text, onFocusApplied]);

  return <div ref={host} data-testid={CODE_AREA_TESTID} style={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }} />;
}
