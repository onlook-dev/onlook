import { describe, expect, it } from 'bun:test';
import { FRAME_CONSOLE_LINE_MAX_CHARS, type FrameFactsPush } from '@studio/events';
import { createFrameMirror, frameMirror, type FrameMirror } from './mirror.js';

const DOC = 'doc-1';
const VIEW = 11;
const OTHER_VIEW = 12;

const facts = (id: string, over: Partial<FrameFactsPush['frames'][number]> = {}) => ({
  id,
  currentUrl: `http://localhost:3000/${id}`,
  health: 'live' as const,
  title: id,
  ...over,
});

const push = (
  mirror: FrameMirror,
  over: Partial<FrameFactsPush> = {},
  viewId = VIEW,
): void => {
  mirror.note(viewId, { docId: DOC, frames: [facts('a')], ...over });
};

describe('the facts cache', () => {
  it('answers a frame the renderer has pushed', () => {
    const mirror = createFrameMirror();
    push(mirror);
    expect(mirror.read(DOC, ['a'])).toEqual([
      {
        id: 'a',
        currentUrl: 'http://localhost:3000/a',
        health: 'live',
        title: 'a',
        console: [],
        errorCount: 0,
      },
    ]);
  });

  it('keeps a navigation in flight and a failed load, and drops either when malformed (ONL-2960)', () => {
    const mirror = createFrameMirror();
    push(mirror, { frames: [facts('a', { targetUrl: 'http://localhost:3001/', loadFailed: true })] });
    expect(mirror.peek(DOC, 'a')).toMatchObject({ targetUrl: 'http://localhost:3001/', loadFailed: true });
    push(mirror, { frames: [{ ...facts('a'), targetUrl: 7, loadFailed: 'yes' } as never] });
    expect(Object.keys(mirror.peek(DOC, 'a') ?? {})).not.toContain('targetUrl');
    expect(Object.keys(mirror.peek(DOC, 'a') ?? {})).not.toContain('loadFailed');
  });

  it('omits an id it has never been pushed rather than inventing one', () => {
    const mirror = createFrameMirror();
    push(mirror);
    expect(mirror.read(DOC, ['a', 'never-pushed']).map((f) => f.id)).toEqual(['a']);
  });

  it('replaces a frame’s facts on the next push', () => {
    const mirror = createFrameMirror();
    push(mirror);
    push(mirror, { frames: [facts('a', { currentUrl: 'http://localhost:3000/moved' })] });
    expect(mirror.read(DOC, ['a'])[0]?.currentUrl).toBe('http://localhost:3000/moved');
  });

  it('drops an id the push no longer carries', () => {
    const mirror = createFrameMirror();
    push(mirror, { frames: [facts('a'), facts('b')] });
    push(mirror, { frames: [facts('a')] });
    expect(mirror.read(DOC, ['a', 'b']).map((f) => f.id)).toEqual(['a']);
  });
});

describe('the scope is the VIEW (ONL-2222)', () => {
  it('answers nothing for a document no view is holding', () => {
    const mirror = createFrameMirror();
    push(mirror);
    expect(mirror.read('another-doc', ['a'])).toEqual([]);
  });

  it('drops everything a view held when THAT view pushes a different document', () => {
    const mirror = createFrameMirror();
    push(mirror, { frames: [facts('a'), facts('b')] });
    mirror.note(VIEW, { docId: 'doc-2', frames: [facts('c')] });
    expect(mirror.read('doc-2', ['a', 'b', 'c']).map((f) => f.id)).toEqual(['c']);
  });

  it('carries NOTHING across a document change, not even onto a colliding id', () => {
    // An id present in BOTH documents: the plainer switch cases pass with the clear deleted.
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('shared')],
      console: [{ id: 'shared', lines: [{ level: 'error', text: 'from the other project' }] }],
    });
    mirror.note(VIEW, { docId: 'doc-2', frames: [facts('shared')] });
    const read = mirror.read('doc-2', ['shared'])[0];
    expect(read?.console).toEqual([]);
    expect(read?.errorCount).toBe(0);
  });

  it('a second view on a second document does not evict the first', () => {
    const mirror = createFrameMirror();
    push(mirror, { frames: [facts('a')] });
    mirror.note(OTHER_VIEW, { docId: 'doc-2', frames: [facts('b')] });

    expect(mirror.read(DOC, ['a']).map((f) => f.id)).toEqual(['a']);
    expect(mirror.read('doc-2', ['b']).map((f) => f.id)).toEqual(['b']);
  });

  it("a view's push never reaches another view's document, even on a colliding id", () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('shared')],
      console: [{ id: 'shared', lines: [{ level: 'error', text: 'view one' }] }],
    });
    mirror.note(OTHER_VIEW, { docId: 'doc-2', frames: [facts('shared')] });
    mirror.note(VIEW, { docId: DOC, frames: [] });

    expect(mirror.read(DOC, ['shared'])).toEqual([]);
    const other = mirror.read('doc-2', ['shared'])[0];
    expect(other?.id).toBe('shared');
    expect(other?.console).toEqual([]);
  });

  it('REFUSES a document two views are holding rather than guessing', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [facts('a')] });
    mirror.note(OTHER_VIEW, { docId: DOC, frames: [facts('a')] });

    expect(mirror.read(DOC, ['a'])).toEqual([]);
    expect(mirror.peek(DOC, 'a')).toBeUndefined();
  });

  it('forget(view) drops that view alone, and un-refuses the document it shared', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [facts('a')] });
    mirror.note(OTHER_VIEW, { docId: DOC, frames: [facts('a')] });
    expect(mirror.read(DOC, ['a'])).toEqual([]);

    mirror.forget(OTHER_VIEW);
    expect(mirror.read(DOC, ['a']).map((f) => f.id)).toEqual(['a']);

    mirror.forget(VIEW);
    expect(mirror.read(DOC, ['a'])).toEqual([]);
  });
});

describe('the console ring', () => {
  const line = (text: string, level: 'log' | 'warning' | 'error' = 'log') => ({ level, text });

  it('carries lines through to the read', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [{ id: 'a', lines: [line('hello'), line('boom', 'error')] }],
    });
    expect(mirror.read(DOC, ['a'])[0]?.console).toEqual([
      { level: 'log', text: 'hello' },
      { level: 'error', text: 'boom' },
    ]);
  });

  it('counts errors separately from ordinary output', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [
        { id: 'a', lines: [line('a'), line('b', 'warning'), line('c', 'error'), line('d', 'error')] },
      ],
    });
    const read = mirror.read(DOC, ['a'])[0];
    expect(read?.errorCount).toBe(2);
    expect(read?.console).toHaveLength(4);
  });

  it('DRAINS — a second read sees nothing new', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [facts('a')], console: [{ id: 'a', lines: [line('once')] }] });
    expect(mirror.read(DOC, ['a'])[0]?.console).toHaveLength(1);
    expect(mirror.read(DOC, ['a'])[0]?.console).toEqual([]);
    expect(mirror.read(DOC, ['a'])[0]?.errorCount).toBe(0);
  });

  it('drains only the frames the read asked for', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a'), facts('b')],
      console: [
        { id: 'a', lines: [line('a-line')] },
        { id: 'b', lines: [line('b-line')] },
      ],
    });
    mirror.read(DOC, ['a']);
    expect(mirror.read(DOC, ['b'])[0]?.console).toEqual([{ level: 'log', text: 'b-line' }]);
  });

  it('discards oldest first at capacity', () => {
    const mirror = createFrameMirror({ consoleCapacity: 3 });
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [{ id: 'a', lines: ['1', '2', '3', '4', '5'].map((t) => line(t)) }],
    });
    expect(mirror.read(DOC, ['a'])[0]?.console.map((l) => l.text)).toEqual(['3', '4', '5']);
  });

  it('applies capacity across pushes, not per push', () => {
    const mirror = createFrameMirror({ consoleCapacity: 2 });
    mirror.note(VIEW, { docId: DOC, frames: [facts('a')], console: [{ id: 'a', lines: [line('1')] }] });
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [{ id: 'a', lines: [line('2'), line('3')] }],
    });
    expect(mirror.read(DOC, ['a'])[0]?.console.map((l) => l.text)).toEqual(['2', '3']);
  });

  it('truncates an oversized line rather than dropping it', () => {
    const mirror = createFrameMirror();
    const oversized = 'x'.repeat(FRAME_CONSOLE_LINE_MAX_CHARS + 500);
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [{ id: 'a', lines: [line(oversized)] }],
    });
    const lines = mirror.read(DOC, ['a'])[0]?.console ?? [];
    expect(lines).toHaveLength(1);
    expect(lines[0]?.text.length).toBeLessThan(oversized.length);
  });

  it('discards console for an id the frame list did not carry', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a')],
      console: [{ id: 'ghost', lines: [line('orphan')] }],
    });
    expect(mirror.read(DOC, ['ghost'])).toEqual([]);
  });

  it('drops a frame’s buffered lines when the frame leaves', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, {
      docId: DOC,
      frames: [facts('a'), facts('b')],
      console: [{ id: 'b', lines: [line('gone')] }],
    });
    push(mirror, { frames: [facts('a')] });
    push(mirror, { frames: [facts('a'), facts('b')] });
    expect(mirror.read(DOC, ['b'])[0]?.console).toEqual([]);
  });
});

describe('a push is whatever arrived over IPC', () => {
  const bad = (push: unknown): FrameFactsPush => push as FrameFactsPush;

  it('ignores a push that is not a record, or names no document', () => {
    const mirror = createFrameMirror();
    push(mirror);
    mirror.note(VIEW, bad(null));
    mirror.note(VIEW, bad('nope'));
    mirror.note(VIEW, bad({ frames: [facts('b')] }));
    mirror.note(VIEW, bad({ docId: '', frames: [facts('b')] }));
    expect(mirror.read(DOC, ['a']).map((f) => f.id)).toEqual(['a']);
  });

  it('ignores a push whose frames are not an array', () => {
    const mirror = createFrameMirror();
    push(mirror);
    mirror.note(VIEW, bad({ docId: DOC, frames: 'all of them' }));
    expect(mirror.read(DOC, ['a']).map((f) => f.id)).toEqual(['a']);
  });

  it('skips a malformed frame and keeps the rest of the push', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, bad({
        docId: DOC,
        frames: [facts('a'), { id: 'b' }, { ...facts('c'), health: 'exploded' }, facts('d')],
      }),
    );
    expect(mirror.read(DOC, ['a', 'b', 'c', 'd']).map((f) => f.id)).toEqual(['a', 'd']);
  });

  it('skips a malformed console line and keeps the rest', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, bad({
        docId: DOC,
        frames: [facts('a')],
        console: [{ id: 'a', lines: [{ level: 'log', text: 'ok' }, { level: 'shout', text: 'no' }, 7] }],
      }),
    );
    expect(mirror.read(DOC, ['a'])[0]?.console).toEqual([{ level: 'log', text: 'ok' }]);
  });
});

describe('the app-wide reader has no writer on it', () => {
  it('exposes the readers and nothing else', () => {
    const reader = frameMirror();
    expect(Object.keys(reader)).toEqual(['read', 'peek', 'docIdForGuest', 'frameForGuest']);
    expect((reader as Partial<FrameMirror>).note).toBeUndefined();
    expect((reader as Partial<FrameMirror>).clear).toBeUndefined();
  });

  it('answers the guest lookup through the shared reader too', () => {
    expect(frameMirror().docIdForGuest(4471)).toBeUndefined();
  });
});

describe('which document holds a guest (ONL-2471)', () => {
  const guest = (id: string, webContentsId: number) => facts(id, { webContentsId });

  it('answers the document of the view that pushed the guest', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    expect(mirror.docIdForGuest(77)).toBe(DOC);
  });

  it('names the frame that holds the guest beside its document (ONL-2960)', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77), guest('b', 78)] });
    expect(mirror.frameForGuest(78)).toEqual({ docId: DOC, frameId: 'b' });
  });

  it('answers undefined for an id no push carries', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    expect(mirror.docIdForGuest(78)).toBeUndefined();
  });

  it('answers undefined for a frame pushed with no usable guest id', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 0), facts('b')] });
    expect(mirror.docIdForGuest(0)).toBeUndefined();
  });

  it('answers each project its own guest, never a sibling’s', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    mirror.note(OTHER_VIEW, { docId: 'doc-2', frames: [guest('b', 78)] });
    expect(mirror.docIdForGuest(77)).toBe(DOC);
    expect(mirror.docIdForGuest(78)).toBe('doc-2');
  });

  it('REFUSES an id two views carry rather than guessing which project navigated', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    mirror.note(OTHER_VIEW, { docId: 'doc-2', frames: [guest('b', 77)] });
    expect(mirror.docIdForGuest(77)).toBeUndefined();
  });

  it('answers a view holding the same id on two of its own frames', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77), guest('b', 77)] });
    expect(mirror.docIdForGuest(77)).toBe(DOC);
  });

  it('stops naming a guest once its view is forgotten', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    mirror.forget(VIEW);
    expect(mirror.docIdForGuest(77)).toBeUndefined();
  });

  it('stops naming a guest the view’s next push no longer carries', () => {
    const mirror = createFrameMirror();
    mirror.note(VIEW, { docId: DOC, frames: [guest('a', 77)] });
    mirror.note(VIEW, { docId: DOC, frames: [] });
    expect(mirror.docIdForGuest(77)).toBeUndefined();
  });
});
