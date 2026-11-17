import type { EditorState, Text } from '@codemirror/state';

export function bufferChange(state: EditorState, text: string): { from: number; to: number; insert: Text } | null {
  if (state.doc.sliceString(0, undefined, state.lineBreak) === text) return null;
  const previous = state.doc.toString();
  const next = state.toText(text);
  const nextText = next.toString();
  if (previous === nextText) return null;
  let from = 0;
  const shared = Math.min(previous.length, nextText.length);
  while (from < shared && previous.charCodeAt(from) === nextText.charCodeAt(from)) from += 1;
  let to = previous.length;
  let end = nextText.length;
  while (to > from && end > from && previous.charCodeAt(to - 1) === nextText.charCodeAt(end - 1)) {
    to -= 1;
    end -= 1;
  }
  return { from, to, insert: next.slice(from, end) };
}
