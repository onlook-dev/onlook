import { describe, expect, it } from 'bun:test';
import { EditorState } from '@codemirror/state';
import { revealSourceRange, sourceRange } from './sourceRange.js';

function positions(state: EditorState): number[] {
  const found: number[] = [];
  state.field(sourceRange).between(0, state.doc.length, from => { found.push(from); });
  return found;
}

describe('the revealed source range, not the caret active line', () => {
  it('holds a stationary source-line treatment without selecting the text', () => {
    const state = EditorState.create({ doc: 'first\nStart Designing\nlast', extensions: sourceRange });
    const revealed = state.update({ selection: { anchor: 6 }, effects: revealSourceRange.of(6) }).state;
    expect(positions(revealed)).toEqual([6]);
    expect(revealed.selection.main.empty).toBe(true);
    expect(positions(revealed.update({ selection: { anchor: 7 } }).state)).toEqual([]);
  });

  it('maps a source reveal through an external edit and clears it on local typing', () => {
    const state = EditorState.create({ doc: 'first\nStart Designing\nlast', extensions: sourceRange });
    const revealed = state.update({ effects: revealSourceRange.of(6) }).state;
    const changed = revealed.update({ changes: { from: 0, insert: 'new\n' } }).state;
    expect(positions(changed)).toEqual([10]);
    expect(positions(changed.update({ changes: { from: 10, insert: 'X' }, userEvent: 'input.type' }).state)).toEqual([]);
  });

  it('clamps navigation and removes the reveal on undo', () => {
    const state = EditorState.create({ doc: 'first\nlast', extensions: sourceRange });
    const revealed = state.update({ effects: revealSourceRange.of(999) }).state;
    expect(positions(revealed)).toEqual([6]);
    expect(positions(revealed.update({ userEvent: 'undo' }).state)).toEqual([]);
  });
});
