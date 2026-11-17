import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CodeReadRequest, CodeReadResult, CodeSnapshot } from '@studio/events';

import { isDirty, resetCodeStoreForTests, useCodeStore } from './store.js';

const BUTTON = 'src/components/Button.tsx';
const CARD = 'src/components/Card.tsx';

const SNAPSHOT: CodeSnapshot = {
  hash: 'c0ffee',
  size: 12,
  mtimeMs: 1,
  eol: '\n',
  mode: 0o644,
  bom: false,
};

let asked: string[] = [];
let answer: (path: string) => CodeReadResult = (path) => ({
  ok: true,
  path,
  text: `// ${path}\n`,
  snapshot: SNAPSHOT,
});

function tab(path: string) {
  return useCodeStore.getState().tabs.find((entry) => entry.path === path);
}

beforeEach(() => {
  asked = [];
  answer = (path) => ({ ok: true, path, text: `// ${path}\n`, snapshot: SNAPSHOT });
  resetCodeStoreForTests();
  Object.defineProperty(globalThis, 'window', {
    value: {
      studio: {
        codeRead: (request: CodeReadRequest): Promise<CodeReadResult> => {
          asked.push(request.path);
          return Promise.resolve(answer(request.path));
        },
      },
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  resetCodeStoreForTests();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('the buffer the panel holds', () => {
  it('marks only adopted agent text and clears the marker on manual edits and reloads', async () => {
    await useCodeStore.getState().open(BUTTON);
    expect(tab(BUTTON)?.agentText).toBeUndefined();
    answer = path => ({ ok: true, path, text: 'agent changed', snapshot: { ...SNAPSHOT, hash: 'agent' } });
    await useCodeStore.getState().noteAgentWrote([BUTTON]);
    expect(tab(BUTTON)?.agentText).toBe('agent changed');
    expect(isDirty(tab(BUTTON)!)).toBe(false);
    useCodeStore.getState().edit(BUTTON, 'my edit');
    expect(tab(BUTTON)?.agentText).toBeUndefined();
    await useCodeStore.getState().noteAgentWrote([BUTTON]);
    expect(tab(BUTTON)?.text).toBe('my edit');
    expect(tab(BUTTON)?.agentText).toBeUndefined();
    useCodeStore.getState().discard(BUTTON);
    answer = path => ({ ok: true, path, text: 'disk changed', snapshot: { ...SNAPSHOT, hash: 'disk' } });
    await useCodeStore.getState().recheck(BUTTON);
    expect(tab(BUTTON)?.text).toBe('disk changed');
    expect(tab(BUTTON)?.agentText).toBeUndefined();
  });
  it('does not duplicate the initial read when the panel shows a pending tab', async () => {
    let finish!: (result: CodeReadResult) => void;
    window.studio.codeRead = ({ path }) => {
      asked.push(path);
      return new Promise((resolve) => { finish = resolve; });
    };
    const opening = useCodeStore.getState().open('photo.png');
    const rechecking = useCodeStore.getState().recheck('photo.png');
    expect(asked).toEqual(['photo.png']);
    finish({ ok: true, path: 'photo.png', text: '', snapshot: SNAPSHOT, image: { dataUrl: 'image' } });
    await opening;
    await rechecking;
    expect(tab('photo.png')?.image?.dataUrl).toBe('image');
  });

  it('holds image previews without editing or saving their empty text buffer', async () => {
    answer = (path) => ({ ok: true, path, text: '', snapshot: SNAPSHOT, image: { dataUrl: 'data:image/png;base64,AA==' } });
    await useCodeStore.getState().open('photo.png');
    useCodeStore.getState().edit('photo.png', 'accidental edit');
    expect(tab('photo.png')?.text).toBe('');
    expect(tab('photo.png')?.image?.dataUrl).toBe('data:image/png;base64,AA==');
    expect(isDirty(tab('photo.png')!)).toBe(false);
    // No codeWrite bridge exists in this fixture: any write would fail this test.
    await useCodeStore.getState().save('photo.png');
  });

  it('refreshes an image after its on-disk snapshot changes', async () => {
    answer = (path) => ({ ok: true, path, text: '', snapshot: SNAPSHOT, image: { dataUrl: 'first' } });
    await useCodeStore.getState().open('photo.png');
    answer = (path) => ({ ok: true, path, text: '', snapshot: { ...SNAPSHOT, hash: 'changed' }, image: { dataUrl: 'second' } });
    await useCodeStore.getState().recheck('photo.png');
    expect(tab('photo.png')?.image?.dataUrl).toBe('second');
    expect(tab('photo.png')?.snapshot?.hash).toBe('changed');
    expect(isDirty(tab('photo.png')!)).toBe(false);
  });

  it('opens a file once and activates the tab already holding it', async () => {
    await useCodeStore.getState().open(BUTTON);
    await useCodeStore.getState().open(CARD);
    await useCodeStore.getState().open(BUTTON);

    expect(useCodeStore.getState().tabs.map((entry) => entry.path)).toEqual([BUTTON, CARD]);
    expect(useCodeStore.getState().activePath).toBe(BUTTON);
    expect(asked).toEqual([BUTTON, CARD]);
  });

  it('is the authoritative text: an edit makes the tab dirty and no re-activation re-reads it', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'typed');
    await useCodeStore.getState().open(BUTTON);

    expect(tab(BUTTON)?.text).toBe('typed');
    expect(isDirty(tab(BUTTON)!)).toBe(true);
    expect(asked).toEqual([BUTTON]);
  });

  it('survives the subtree being thrown away, which is what the boundary’s retry does', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'typed before the crash');

    // Nothing but a reset clears the store, so a remount reads the same buffer back.
    expect(useCodeStore.getState().tabs.map((entry) => entry.text)).toEqual(['typed before the crash']);
  });

  it('keeps a dirty tab open and dirty when a pick opens another file', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'typed');

    await useCodeStore.getState().followSelection(CARD, false);

    expect(useCodeStore.getState().activePath).toBe(CARD);
    expect(tab(BUTTON)?.text).toBe('typed');
    expect(isDirty(tab(BUTTON)!)).toBe(true);
  });

  it('reads nothing on a shift-add', async () => {
    await useCodeStore.getState().open(BUTTON);

    await useCodeStore.getState().followSelection(CARD, true);

    expect(useCodeStore.getState().tabs.map((entry) => entry.path)).toEqual([BUTTON]);
    expect(asked).toEqual([BUTTON]);
  });

  it('holds the file’s refusal on its own tab, so the panel can word it', async () => {
    answer = () => ({ ok: false, code: 'too-large' });

    await useCodeStore.getState().open(BUTTON);

    expect(tab(BUTTON)?.refusal).toBe('too-large');
    expect(tab(BUTTON)?.snapshot).toBeNull();
    expect(isDirty(tab(BUTTON)!)).toBe(false);
  });

  it('words a bridge that fails outright as unreadable rather than leaving the tab waiting', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { codeRead: () => Promise.reject(new Error('torn')) } },
      configurable: true,
      writable: true,
    });

    await useCodeStore.getState().open(BUTTON);

    expect(tab(BUTTON)?.refusal).toBe('unreadable');
  });

  it('drops a read that outlived its tab rather than reopening it', async () => {
    let release: ((result: CodeReadResult) => void) | undefined;
    Object.defineProperty(globalThis, 'window', {
      value: {
        studio: {
          codeRead: () =>
            new Promise<CodeReadResult>((resolve) => {
              release = resolve;
            }),
        },
      },
      configurable: true,
      writable: true,
    });

    const opening = useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().close(BUTTON);
    release?.({ ok: true, path: BUTTON, text: 'late', snapshot: SNAPSHOT });
    await opening;

    expect(useCodeStore.getState().tabs).toEqual([]);
  });

  it('closes the active tab onto the next one, and onto the previous when it was last', async () => {
    await useCodeStore.getState().open(BUTTON);
    await useCodeStore.getState().open(CARD);
    await useCodeStore.getState().open('src/app.css');

    useCodeStore.getState().activate(CARD);
    useCodeStore.getState().close(CARD);
    expect(useCodeStore.getState().activePath).toBe('src/app.css');

    useCodeStore.getState().close('src/app.css');
    expect(useCodeStore.getState().activePath).toBe(BUTTON);
  });
});

describe('searching while typing', () => {
  it('updates the field immediately and scans only the latest term in a typing burst', async () => {
    const queries: string[] = [];
    window.studio.codeSearch = async ({ query }) => {
      queries.push(query);
      return { ok: true, names: ['public/logo.svg'], contents: [], truncated: false };
    };
    const pending = ['l', 'lo', 'log', 'logo'].map((query) => useCodeStore.getState().search(query));
    expect(useCodeStore.getState().query).toBe('logo');
    expect(queries).toEqual([]);
    await Promise.all(pending);
    expect(queries).toEqual(['logo']);
    expect(useCodeStore.getState().names).toEqual(['public/logo.svg']);
  });

  it('clearing the field cancels a queued search without calling the bridge', async () => {
    const queries: string[] = [];
    window.studio.codeSearch = async ({ query }) => {
      queries.push(query);
      return { ok: true, names: [], contents: [], truncated: false };
    };
    const pending = useCodeStore.getState().search('logo');
    await useCodeStore.getState().search('');
    await pending;
    expect(queries).toEqual([]);
    expect(useCodeStore.getState().isSearching).toBe(false);
    expect(useCodeStore.getState().contents).toEqual([]);
  });

  it('drops an older answer even if the field returns to the same term', async () => {
    let finish!: (result: { ok: true; names: string[]; contents: []; truncated: false }) => void;
    let calls = 0;
    window.studio.codeSearch = () => {
      calls += 1;
      if (calls === 1) return new Promise((resolve) => { finish = resolve; });
      return Promise.resolve({ ok: true, names: ['fresh.svg'], contents: [], truncated: false });
    };
    const older = useCodeStore.getState().search('logo');
    await new Promise((resolve) => setTimeout(resolve, 130));
    await useCodeStore.getState().search('');
    await useCodeStore.getState().search('logo');
    finish({ ok: true, names: ['old.svg'], contents: [], truncated: false });
    await older;
    expect(useCodeStore.getState().names).toEqual(['fresh.svg']);
  });
});

describe('what an agent write does to the panel (ONL-2563)', () => {
  const MOVED: CodeSnapshot = { ...SNAPSHOT, hash: 'moved' };

  it('re-reads only the files that are open', async () => {
    await useCodeStore.getState().open(BUTTON);
    asked = [];
    await useCodeStore.getState().noteAgentWrote([BUTTON, 'src/never/Opened.tsx']);
    expect(asked).toEqual([BUTTON]);
  });

  it('reloads a clean tab silently and raises nothing', async () => {
    await useCodeStore.getState().open(BUTTON);
    answer = (path) => ({ ok: true, path, text: '// agent wrote this\n', snapshot: MOVED });
    await useCodeStore.getState().noteAgentWrote([BUTTON]);
    expect(tab(BUTTON)?.text).toBe('// agent wrote this\n');
    expect(isDirty(tab(BUTTON)!)).toBe(false);
  });

  /* The banner's words name who wrote. By the time it is drawn, nothing in the
     tab says that any more, so the source rides the re-read that found it. */
  it('attributes a clash on a dirty tab to the agent', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    answer = (path) => ({ ok: true, path, text: '// theirs\n', snapshot: MOVED });
    await useCodeStore.getState().noteAgentWrote([BUTTON]);
    expect(tab(BUTTON)?.clashSource).toBe('agent');
    expect(tab(BUTTON)?.text).toBe('// mine\n');
  });

  it('leaves a plain re-check attributed to the disk', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    answer = (path) => ({ ok: true, path, text: '// theirs\n', snapshot: MOVED });
    await useCodeStore.getState().recheck(BUTTON);
    expect(tab(BUTTON)?.clashSource).toBe('disk');
  });

  it('marks every clashing tab when one turn writes three files', async () => {
    await useCodeStore.getState().open(BUTTON);
    await useCodeStore.getState().open(CARD);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    useCodeStore.getState().edit(CARD, '// mine\n');
    answer = (path) => ({ ok: true, path, text: '// theirs\n', snapshot: MOVED });
    await useCodeStore.getState().noteAgentWrote([BUTTON, CARD, 'README.md']);
    expect(tab(BUTTON)?.clashSource).toBe('agent');
    expect(tab(CARD)?.clashSource).toBe('agent');
  });
});

describe('the snapshot the clash verdict is judged against (ONL-2563)', () => {
  /* The bug: a freshly opened file has no `onDisk`, and a dirty tab with none
     reads as a file that LEFT the disk — so one keystroke said it was gone. */
  it('knows what is on disk from the moment a file is opened', async () => {
    await useCodeStore.getState().open(BUTTON);
    expect(tab(BUTTON)?.onDisk).toEqual(SNAPSHOT);
    useCodeStore.getState().edit(BUTTON, '// typed\n');
    expect(tab(BUTTON)?.onDisk).toEqual(SNAPSHOT);
  });

  /* The bug: a save adopted the new snapshot and left `onDisk` behind, so the
     next keystroke raised a banner about the designer's own save. */
  it('moves what is on disk with a save, so the next keystroke raises nothing', async () => {
    const written: CodeSnapshot = { ...SNAPSHOT, hash: 'written' };
    Object.assign(window.studio, {
      codeWrite: () => Promise.resolve({ ok: true, path: BUTTON, snapshot: written }),
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    await useCodeStore.getState().save(BUTTON);
    expect(tab(BUTTON)?.snapshot).toEqual(written);
    expect(tab(BUTTON)?.onDisk).toEqual(written);
  });
});

describe('recovering from a write refused as stale (ONL-2563)', () => {
  const MOVED: CodeSnapshot = { ...SNAPSHOT, hash: 'moved' };

  /* The bug: a stale refusal recorded only the code, so `onDisk` still held the
     snapshot that was just refused. Keep mine adopted it, and every later save
     was refused the same way — with no route out but Reload, which discards. */
  it('re-reads the file so Keep mine has something newer to adopt', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    Object.assign(window.studio, {
      codeWrite: () => Promise.resolve({ ok: false, code: 'stale' }),
    });
    answer = (path) => ({ ok: true, path, text: '// theirs\n', snapshot: MOVED });

    await useCodeStore.getState().save(BUTTON);

    expect(tab(BUTTON)?.writeRefusal).toBe('stale');
    expect(tab(BUTTON)?.onDisk).toEqual(MOVED);
    useCodeStore.getState().keepMine(BUTTON);
    expect(tab(BUTTON)?.snapshot).toEqual(MOVED);
    expect(tab(BUTTON)?.text).toBe('// mine\n');
  });
});

describe('what counts as a save (ONL-2563)', () => {
  it('saves and reveals a dirty tab when a clean tab is active', async () => {
    const written: string[] = [];
    Object.assign(window.studio, {
      codeWrite: (request: { path: string }) => {
        written.push(request.path);
        return Promise.resolve({ ok: true, path: request.path, snapshot: SNAPSHOT });
      },
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'changed');
    await useCodeStore.getState().open(CARD);
    await useCodeStore.getState().saveChanges();
    expect(written).toEqual([BUTTON]);
    expect(useCodeStore.getState().activePath).toBe(BUTTON);
    expect(isDirty(tab(BUTTON)!)).toBe(false);
  });

  it('discards only one dirty tab and reveals the affected file', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'changed button');
    await useCodeStore.getState().open(CARD);
    useCodeStore.getState().edit(CARD, 'changed card');
    await useCodeStore.getState().open('clean.css');
    useCodeStore.getState().discardChanges();
    expect(useCodeStore.getState().activePath).toBe(BUTTON);
    expect(isDirty(tab(BUTTON)!)).toBe(false);
    expect(tab(CARD)?.text).toBe('changed card');
  });

  it('saves the active dirty tab first and leaves other edits dirty', async () => {
    Object.assign(window.studio, {
      codeWrite: (request: { path: string }) => Promise.resolve({ ok: true, path: request.path, snapshot: SNAPSHOT }),
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, 'changed button');
    await useCodeStore.getState().open(CARD);
    useCodeStore.getState().edit(CARD, 'changed card');
    await useCodeStore.getState().saveChanges();
    expect(isDirty(tab(CARD)!)).toBe(false);
    expect(isDirty(tab(BUTTON)!)).toBe(true);
  });
  it('marks a write that landed, so the bar can say so', async () => {
    const written: CodeSnapshot = { ...SNAPSHOT, hash: 'written' };
    Object.assign(window.studio, {
      codeWrite: () => Promise.resolve({ ok: true, path: BUTTON, snapshot: written }),
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    const before = useCodeStore.getState().savedToken;
    await useCodeStore.getState().save(BUTTON);
    expect(useCodeStore.getState().savedToken).toBe(before + 1);
  });

  /* Discard clears the dirty flag and saved nothing. Driving the saved word off
     that flag told a designer their discarded edit had been written. */
  it('does not mark a discard, which clears the same flag', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    const before = useCodeStore.getState().savedToken;
    useCodeStore.getState().discard(BUTTON);
    expect(isDirty(tab(BUTTON)!)).toBe(false);
    expect(useCodeStore.getState().savedToken).toBe(before);
  });

  it('does not mark a refused write', async () => {
    Object.assign(window.studio, {
      codeWrite: () => Promise.resolve({ ok: false, code: 'permission' }),
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, '// mine\n');
    const before = useCodeStore.getState().savedToken;
    await useCodeStore.getState().save(BUTTON);
    expect(useCodeStore.getState().savedToken).toBe(before);
  });
});

describe('focus waits for the editor', () => {
  it('drops a focus request when its tab closes before the editor applies it', async () => {
    await useCodeStore.getState().open(BUTTON, 42);
    useCodeStore.getState().close(BUTTON);
    expect(useCodeStore.getState().focus).toBeNull();
  });
  it('retains a requested line throughout the first asynchronous read', async () => {
    let release: ((result: CodeReadResult) => void) | undefined;
    Object.assign(window.studio, {
      codeRead: () => new Promise<CodeReadResult>((resolve) => { release = resolve; }),
    });
    const opening = useCodeStore.getState().open(BUTTON, 42);
    expect(tab(BUTTON)?.snapshot).toBeNull();
    expect(useCodeStore.getState().focus).toEqual({ path: BUTTON, line: 42, focusEditor: true });
    release?.({ ok: true, path: BUTTON, text: 'loaded', snapshot: SNAPSHOT });
    await opening;
    expect(useCodeStore.getState().focus).toEqual({ path: BUTTON, line: 42, focusEditor: true });
    expect(useCodeStore.getState().takeFocus(BUTTON)).toBe(42);
    expect(useCodeStore.getState().focus).toBeNull();
  });
});

describe('where the panel is looking (ONL-2563)', () => {
  it('takes a line from an open and hands it over once', async () => {
    await useCodeStore.getState().open(BUTTON, 42);
    expect(useCodeStore.getState().focus).toEqual({ path: BUTTON, line: 42, focusEditor: true });
    expect(useCodeStore.getState().takeFocus(BUTTON)).toBe(42);
    // Taken once: a later edit must not drag the view back to it.
    expect(useCodeStore.getState().takeFocus(BUTTON)).toBeNull();
  });

  it('does not hand a line to a file that did not ask for it', async () => {
    await useCodeStore.getState().open(BUTTON, 42);
    expect(useCodeStore.getState().takeFocus(CARD)).toBeNull();
    expect(useCodeStore.getState().focus).toEqual({ path: BUTTON, line: 42, focusEditor: true });
  });

  /* The pick's own line: a tint on a line the editor is not showing says nothing,
     and a long file opens wherever it was last left. */
  it('points at a line without opening anything', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().focusAt(BUTTON, 25);
    expect(useCodeStore.getState().focus).toEqual({ path: BUTTON, line: 25, focusEditor: false });
    expect(useCodeStore.getState().takeFocus(BUTTON)).toBe(25);
  });

  it('ignores a line that is not a real one', async () => {
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().focusAt(BUTTON, 0);
    useCodeStore.getState().focusAt(BUTTON, -3);
    expect(useCodeStore.getState().focus).toBeNull();
  });

  it('opens with no line at all when none was given', async () => {
    await useCodeStore.getState().open(BUTTON);
    expect(useCodeStore.getState().focus).toBeNull();
  });
});

describe('what a file imports, with no tab open on it (ONL-2563)', () => {
  const HERO = 'src/Hero.jsx';

  beforeEach(() => {
    answer = (path) => ({
      ok: true,
      path,
      text: `import { Badge } from './components/Badge';\n// ${path}\n`,
      snapshot: SNAPSHOT,
    });
  });

  it('reads a closed file once and keeps what it names', async () => {
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(useCodeStore.getState().specifiers[HERO]).toEqual(['./components/Badge']);
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(asked.filter((path) => path === HERO)).toHaveLength(1);
  });

  // The buffer is the fresher answer, and asking disk would miss an unsaved import.
  it('never asks disk for a file the panel already holds', async () => {
    await useCodeStore.getState().open(HERO);
    asked = [];
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(asked).toEqual([]);
    expect(HERO in useCodeStore.getState().specifiers).toBe(false);
  });

  /* An absent answer would be asked for again on every render; a refusal is an empty one. */
  it('keeps an empty answer for a file it could not read', async () => {
    answer = () => ({ ok: false, code: 'unreadable' });
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(useCodeStore.getState().specifiers[HERO]).toEqual([]);
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(asked.filter((path) => path === HERO)).toHaveLength(1);
  });

  it('forgets what a file imported once a save has changed it', async () => {
    await useCodeStore.getState().readSpecifiers([BUTTON]);
    expect(BUTTON in useCodeStore.getState().specifiers).toBe(true);
    Object.assign(window.studio, {
      codeWrite: () => Promise.resolve({ ok: true, path: BUTTON, snapshot: SNAPSHOT }),
    });
    await useCodeStore.getState().open(BUTTON);
    useCodeStore.getState().edit(BUTTON, "import './new.js';\n");
    await useCodeStore.getState().save(BUTTON);
    expect(BUTTON in useCodeStore.getState().specifiers).toBe(false);
  });

  it('reads imports when a mapped tab closes', async () => {
    await useCodeStore.getState().open(HERO);
    await useCodeStore.getState().readSpecifiers([HERO]);
    useCodeStore.getState().close(HERO);
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(useCodeStore.getState().specifiers[HERO]).toEqual(['./components/Badge']);
  });

  it('forgets a closed file’s imports when the agent writes it', async () => {
    await useCodeStore.getState().readSpecifiers([HERO]);
    answer = (path) => ({ ok: true, path, text: "import './new.js';\n", snapshot: SNAPSHOT });
    await useCodeStore.getState().noteAgentWrote([HERO]);
    expect(HERO in useCodeStore.getState().specifiers).toBe(false);
    await useCodeStore.getState().readSpecifiers([HERO]);
    expect(useCodeStore.getState().specifiers[HERO]).toEqual(['./new.js']);
  });

  it('drops an import read whose cache was reset before it answered', async () => {
    let resolveRead: ((value: CodeReadResult) => void) | undefined;
    Object.assign(window.studio, {
      codeRead: () => new Promise<CodeReadResult>((resolve) => { resolveRead = resolve; }),
    });
    const pending = useCodeStore.getState().readSpecifiers([HERO]);
    resetCodeStoreForTests();
    resolveRead?.(answer(HERO));
    await pending;
    expect(useCodeStore.getState().specifiers).toEqual({});
  });
});
