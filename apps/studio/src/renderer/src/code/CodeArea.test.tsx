/* Markup only: Bun has no DOM and CodeMirror builds its own in an effect. That the editor's
   focused host counts as an interactive target is asserted in the recording (ONL-2563). */

import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorState } from '@codemirror/state';
import { CodeArea, CODE_AREA_TESTID, codeBufferText, revealCodeLine } from './CodeArea.jsx';

describe('source reveal keyboard intent', () => {
  for (const focusEditor of [false, true]) {
    it(focusEditor ? 'focuses explicit navigation at its mapped line' : 'reveals passive picks without stealing canvas focus', () => {
      let state = EditorState.create({ doc: 'first\nsecond\nthird' });
      let focusCalls = 0;
      const editor: Parameters<typeof revealCodeLine>[0] = {
        get state() { return state; },
        dispatch: (spec) => { state = state.update(spec).state; },
        focus: () => { focusCalls += 1; },
      };
      revealCodeLine(editor, 3, focusEditor);
      expect(state.doc.lineAt(state.selection.main.head).number).toBe(3);
      expect(state.doc.toString()).toBe('first\nsecond\nthird');
      expect(focusCalls).toBe(focusEditor ? 1 : 0);
    });
  }
});

describe('the code area’s host', () => {
  it('renders under the handle the panel and the recording both find it by', () => {
    const markup = renderToStaticMarkup(
      <CodeArea path="a/b.ts" text="const a = 1;" eol={'\n'} tint={null} onChange={() => undefined} />,
    );
    expect(markup).toContain(CODE_AREA_TESTID);
  });
});

describe('the editor buffer line endings', () => {
  it('keeps a CRLF file equal to its baseline before editing', () => {
    const text = 'first\r\nsecond\r\n';
    const state = EditorState.create({ doc: text, extensions: [EditorState.lineSeparator.of('\r\n')] });
    expect(codeBufferText(state)).toBe(text);
  });

  it('keeps CRLF after an edit and after replacing the document', () => {
    const state = EditorState.create({ doc: 'first\r\nsecond\r\n', extensions: [EditorState.lineSeparator.of('\r\n')] });
    const edited = state.update({ changes: { from: 0, to: 5, insert: 'changed' } }).state;
    expect(codeBufferText(edited)).toBe('changed\r\nsecond\r\n');
    const reloaded = edited.update({ changes: { from: 0, to: edited.doc.length, insert: 'reloaded\r\n' } }).state;
    expect(codeBufferText(reloaded)).toBe('reloaded\r\n');
  });
});
