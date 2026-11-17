import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { bufferChange } from './bufferChange.js';

describe('external buffer changes', () => {
  for (const [previous, next, from, to, insert] of [
    ['head\nprice = 10\ntail', 'head\nprice = 15\ntail', 14, 15, '5'],
    ['head\ntail', 'head\nnew\ntail', 5, 5, 'new\n'],
    ['head\nold\ntail', 'head\ntail', 5, 9, ''],
    ['', 'new', 0, 0, 'new'],
    ['old', '', 0, 3, ''],
    ['hello 😀 tail', 'hello 😃 tail', 7, 8, '\ude03'],
  ] as const) {
    it(`replaces only the changed part of ${JSON.stringify(previous)}`, () => {
      const state = EditorState.create({ doc: previous });
      const change = bufferChange(state, next)!;
      expect({ ...change, insert: change.insert.toString() }).toEqual({ from, to, insert });
      expect(state.update({ changes: change }).state.doc.toString()).toBe(next);
    });
  }

  it('does nothing when the buffer already matches', () => {
    expect(bufferChange(EditorState.create({ doc: 'same' }), 'same')).toBeNull();
  });

  it('normalizes CRLF before measuring offsets and preserves the line ending', () => {
    const state = EditorState.create({ doc: 'head\r\nprice = 10\r\ntail', extensions: [EditorState.lineSeparator.of('\r\n')] });
    const change = bufferChange(state, 'head\r\nprice = 15\r\ntail')!;
    expect(change.from).toBe(14);
    expect(change.to).toBe(15);
    expect(state.update({ changes: change }).state.doc.sliceString(0, undefined, '\r\n')).toBe('head\r\nprice = 15\r\ntail');
  });

  it('maps a selection past a small change without collapsing it to the end', () => {
    const state = EditorState.create({ doc: 'head\nprice = 10\ntail', selection: { anchor: 16, head: 20 } });
    const changed = state.update({ changes: bufferChange(state, 'head\nprice = 150\ntail')! }).state;
    expect(changed.selection.main.anchor).toBe(17);
    expect(changed.selection.main.head).toBe(21);
    expect(changed.sliceDoc(17, 21)).toBe('tail');
  });
});
