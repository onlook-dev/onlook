import { create } from 'zustand';
import type {
  CodeSearchFileMatches,
  CodeReadResult,
  CodeRefusalCode,
  CodeSnapshot,
  CodeWriteRefusalCode,
  CodeWriteResult,
} from '@studio/events';

import { log } from '../log.js';
import { ignoreRefusal } from '../refusal.js';
import { clashVerdict } from './clashVerdict.js';
import { relativeSpecifiers } from './files/imports.js';
import { tabsAfterClose, tabsForSelection } from './tabsForSelection.js';
import { studio } from '../bridge.js';

export interface CodeTab {
  /** The read request's own spelling, worktree-relative. The key the tab is held under, so a file cannot be open twice. */
  path: string;
  /** The authoritative buffer. The editor is a view seeded from this and holds none of its own, so re-mounting the subtree keeps what was typed. */
  text: string;
  agentText?: string | undefined;
  /** The text last agreed with disk. */
  baseline: string;
  /** Null until the read answers, and on a refusal. */
  snapshot: CodeSnapshot | null;
  refusal: CodeRefusalCode | null;
  /** Why the last save did not land. The edit stays and the tab stays dirty; ⌘S is the retry, so there is no button for it. */
  writeRefusal: CodeWriteRefusalCode | null;
  /** What is on disk now, as of the last re-check. Null means the file is gone. */
  onDisk: CodeSnapshot | null;
  /** Which side moved the file, for the banner's sentence. */
  clashSource: 'agent' | 'disk';
  image?: { dataUrl: string } | undefined;
}

export function isDirty(tab: CodeTab): boolean {
  return tab.image === undefined && tab.text !== tab.baseline;
}

/** The bar is up while ANY open file is dirty, not only the active one: a dirty tab scrolled out of a row with no scrollbar is otherwise undiscoverable. */
export function anyDirty(tabs: readonly CodeTab[]): boolean {
  return tabs.some(isDirty);
}

export function pendingTab(tabs: readonly CodeTab[], activePath: string | null): CodeTab | undefined {
  return tabs.find((tab) => tab.path === activePath && isDirty(tab)) ?? tabs.find(isDirty);
}

interface CodeStore {
  /** Row order. */
  tabs: readonly CodeTab[];
  activePath: string | null;
  /** Opens the file, or activates the tab already holding it, and scrolls to `line` when given. */
  open: (path: string, line?: number) => Promise<void>;
  focus: { path: string; line: number; focusEditor: boolean } | null;
  /** Points the panel at a line without opening anything: the tab is already the one in front. */
  focusAt: (path: string, line: number) => void;
  takeFocus: (path: string) => number | null;
  activate: (path: string) => void;
  close: (path: string) => void;
  edit: (path: string, text: string) => void;
  /** Writes the active buffer and adopts the snapshot the write returns. */
  save: (path: string) => Promise<void>;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  /** Scoped to one tab: the bar is up for any dirty file, and an unscoped discard would throw away edits in files the designer cannot see. */
  discard: (path: string) => void;
  /** Re-reads what is on disk, for CLEAN tabs as well: agent events do not cover a write a command made, so activation, the panel showing and the window regaining focus all ask. */
  recheck: (path: string, source?: CodeTab['clashSource']) => Promise<void>;
  /** The agent's own writes, per write. Only open files are re-read; the rest say nothing about this panel. */
  noteAgentWrote: (paths: readonly string[]) => Promise<void>;
  /** Adopts what is on disk so the next save overwrites deliberately; the buffer is untouched. */
  keepMine: (path: string) => void;
  /** Takes the file as it is now, in one replacement the editor's undo covers. */
  reload: (path: string) => void;
  savedToken: number;
  /** Follows the first pick, by whatever file it mapped to; the whole rule is `tabsForSelection`. */
  followSelection: (mappedFile: string | null, shiftHeld: boolean) => Promise<void>;
  followedEvidenceId: string | null;

  specifiers: Readonly<Record<string, readonly string[]>>;
  /** Reads those files once each. An open tab's own buffer is fresher, so it is never asked for. */
  readSpecifiers: (paths: readonly string[]) => Promise<void>;

  /** The project's files, read once when the view first needs them. */
  files: readonly string[];
  listFiles: () => Promise<void>;
  query: string;
  isSearching: boolean;
  names: readonly string[];
  contents: readonly CodeSearchFileMatches[];
  search: (query: string) => Promise<void>;
}

function blank(path: string): CodeTab {
  return { path, text: '', baseline: '', snapshot: null, refusal: null, writeRefusal: null, onDisk: null, clashSource: 'disk' };
}

/** Answers land by path: a read that outlives its tab finds nothing to write to. */
function withTab(tabs: readonly CodeTab[], path: string, next: (tab: CodeTab) => CodeTab): readonly CodeTab[] {
  return tabs.some((tab) => tab.path === path) ? tabs.map((tab) => (tab.path === path ? next(tab) : tab)) : tabs;
}

let searchGeneration = 0;

const useCodeStore = create<CodeStore>()((set, get) => {
  const point = async (mappedFile: string | null, shiftHeld: boolean): Promise<void> => {
    const { tabs, activePath } = get();
    const moved = tabsForSelection(
      tabs.map((tab) => tab.path),
      activePath,
      mappedFile,
      shiftHeld,
    );
    if (moved.toRead === null) {
      if (moved.activePath !== activePath) set({ activePath: moved.activePath });
      return;
    }
    const owed = moved.toRead;
    set({ tabs: [...tabs, blank(owed)], activePath: moved.activePath });
    // The bridge answers a refusal rather than throwing; a throw is the bridge
    // itself failing, which the panel words as unreadable.
    const answer: CodeReadResult = (await studio().codeRead({ path: owed }).catch((error: unknown) => {
      log('code').warn('file read refused', { error });
      return undefined;
    })) ?? { ok: false, code: 'unreadable' };
    set({
      tabs: withTab(get().tabs, owed, (tab) =>
        answer.ok
          ? // `onDisk` too: it is what the clash verdict compares against, and a null one on a
            // dirty tab reads as a file that LEFT the disk — on a file just read from it.
            {
              ...tab,
              text: answer.text,
              baseline: answer.text,
              snapshot: answer.snapshot,
              onDisk: answer.snapshot,
              refusal: null,
              image: answer.image,
            }
          : { ...tab, refusal: answer.code },
      ),
    });
  };

  return {
    tabs: [],
    activePath: null,
    savedToken: 0,
    followedEvidenceId: null,
    focus: null,
    files: [],
    query: '',
    isSearching: false,
    names: [],
    contents: [],
    specifiers: {},
    readSpecifiers: async (paths) => {
      const { specifiers, tabs } = get();
      const owed = paths.filter(
        (path) => !(path in specifiers) && !tabs.some((tab) => tab.path === path),
      );
      if (owed.length === 0) return;
      // Claimed before the read: a second render in the same pick must not ask again.
      const claimed = Object.fromEntries(owed.map((path) => [path, [] as readonly string[]]));
      set({ specifiers: { ...get().specifiers, ...claimed } });
      const read = await Promise.all(
        owed.map(async (path) => {
          const answer = await studio().codeRead({ path }).catch((error: unknown) => {
            log('code').warn('imports read refused', { error });
            return undefined;
          });
          // A refusal stays an empty answer rather than an absent one, which would be re-asked forever.
          return [path, answer?.ok === true ? relativeSpecifiers(answer.text) : []] as const;
        }),
      );
      const current = get().specifiers;
      const accepted = read.filter(([path]) => current[path] === claimed[path]);
      if (accepted.length > 0) {
        set({ specifiers: { ...current, ...Object.fromEntries(accepted) } });
      }
    },
    listFiles: async () => {
      const answer = await studio().codeList({}).catch((error: unknown) => {
        log('code').warn('file list refused', { error });
        return undefined;
      });
      if (answer?.ok === true) set({ files: answer.files });
    },
    search: async (query) => {
      const generation = ++searchGeneration;
      set({ query });
      if (query.trim().length === 0) {
        set({ isSearching: false, names: [], contents: [] });
        return;
      }
      set({ isSearching: true });
      // A project scan runs in main. Keep the field immediate, but let a short
      // typing burst settle before sending work across the bridge.
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (generation !== searchGeneration) return;
      const answer = await studio().codeSearch({ query }).catch((error: unknown) => {
        log('code').warn('search refused', { error });
        return undefined;
      });
      // A slower answer for a term the designer has already replaced is dropped.
      if (generation !== searchGeneration) return;
      set({
        isSearching: false,
        names: answer?.ok === true ? answer.names : [],
        contents: answer?.ok === true ? answer.contents : [],
      });
    },
    open: async (path, line) => {
      if (line !== undefined && Number.isInteger(line) && line > 0) set({ focus: { path, line, focusEditor: true } });
      await point(path, false);
    },
    focusAt: (path, line) => {
      if (Number.isInteger(line) && line > 0) set({ focus: { path, line, focusEditor: false } });
    },
    takeFocus: (path) => {
      const held = get().focus;
      if (held === null || held.path !== path) return null;
      set({ focus: null });
      return held.line;
    },
    followSelection: (mappedFile, shiftHeld) => point(mappedFile, shiftHeld),
    activate: (path) => {
      if (get().activePath === path) return;
      if (!get().tabs.some((tab) => tab.path === path)) return;
      set({ activePath: path });
      void get().recheck(path);
    },
    noteAgentWrote: async (paths) => {
      const changed = new Set(paths);
      const specifiers = get().specifiers;
      if (paths.some((path) => path in specifiers)) {
        set({ specifiers: Object.fromEntries(Object.entries(specifiers).filter(([path]) => !changed.has(path))) });
      }
      const open = new Set(get().tabs.map((tab) => tab.path));
      await Promise.all(paths.filter((path) => open.has(path)).map((path) => get().recheck(path, 'agent')));
    },
    recheck: async (path, source = 'disk') => {
      const held = get().tabs.find((entry) => entry.path === path);
      // Showing a newly opened tab also asks for a recheck. Its initial read is
      // already in flight; duplicating it doubles image encoding and IPC work.
      if (held === undefined || (source === 'disk' && held.snapshot === null && held.refusal === null)) return;
      const answer = await studio().codeRead({ path }).catch((error: unknown) => {
        log('code').warn('re-read refused', { error });
        return undefined;
      });
      const onDisk = answer?.ok === true ? answer.snapshot : null;
      const text = answer?.ok === true ? answer.text : null;
      const tab = get().tabs.find((entry) => entry.path === path);
      if (tab === undefined) return;
      const verdict = clashVerdict({
        isDirty: isDirty(tab),
        held: tab.snapshot,
        onDisk,
        wasRefusedStale: tab.writeRefusal === 'stale',
      });
      // A clean tab reloads silently: there is nothing of the designer's to lose.
      if (verdict === 'reload' && text !== null && onDisk !== null) {
        set({
          tabs: withTab(get().tabs, path, (entry) => ({
            ...entry,
            text,
            agentText: source === 'agent' ? text : undefined,
            baseline: text,
            snapshot: onDisk,
            onDisk,
            image: answer?.ok === true ? answer.image : undefined,
          })),
        });
        return;
      }
      if (verdict === 'closed') {
        get().close(path);
        return;
      }
      set({
        tabs: withTab(get().tabs, path, (entry) => ({
          ...entry,
          onDisk,
          clashSource: verdict === 'banner' ? source : entry.clashSource,
        })),
      });
    },
    keepMine: (path) => {
      // Adopting the snapshot the banner was raised against is what makes the
      // next save an overwrite rather than a second stale refusal.
      set({
        tabs: withTab(get().tabs, path, (tab) => ({
          ...tab,
          snapshot: tab.onDisk ?? tab.snapshot,
          writeRefusal: null,
        })),
      });
    },
    reload: (path) => {
      const tab = get().tabs.find((entry) => entry.path === path);
      if (tab === undefined) return;
      void studio()
        .codeRead({ path })
        .then((answer) => {
          if (!answer.ok) return;
          set({
            tabs: withTab(get().tabs, path, (entry) => ({
              ...entry,
              text: answer.text,
              agentText: undefined,
              baseline: answer.text,
              snapshot: answer.snapshot,
              onDisk: answer.snapshot,
              writeRefusal: null,
              image: answer.image,
            })),
          });
        })
        .catch(ignoreRefusal('code', 'reload'));
    },
    close: (path) => {
      const { tabs, activePath } = get();
      const after = tabsAfterClose(
        tabs.map((tab) => tab.path),
        activePath,
        path,
      );
      set({
        tabs: tabs.filter((tab) => tab.path !== path),
        activePath: after.activePath,
        focus: get().focus?.path === path ? null : get().focus,
      });
    },
    edit: (path, text) => {
      set({ tabs: withTab(get().tabs, path, (tab) => tab.image === undefined ? { ...tab, text, agentText: undefined, writeRefusal: null } : tab) });
    },
    discard: (path) => {
      set({ tabs: withTab(get().tabs, path, (tab) => ({ ...tab, text: tab.baseline, agentText: undefined, writeRefusal: null })) });
    },
    saveChanges: async () => {
      const { tabs, activePath } = get();
      const target = pendingTab(tabs, activePath);
      if (target === undefined) return;
      get().activate(target.path);
      await get().save(target.path);
    },
    discardChanges: () => {
      const { tabs, activePath } = get();
      const target = pendingTab(tabs, activePath);
      if (target === undefined) return;
      get().activate(target.path);
      get().discard(target.path);
    },
    save: async (path) => {
      const tab = get().tabs.find((entry) => entry.path === path);
      if (tab === undefined || tab.snapshot === null || !isDirty(tab)) return;
      const written = tab.text;
      const answer: CodeWriteResult = (await studio()
        .codeWrite({ path, text: written, expected: tab.snapshot })
        .catch((error: unknown) => {
          log('code').warn('file write refused', { error });
          return undefined;
        })) ?? { ok: false, code: 'unwritable' };
      set({
        tabs: withTab(get().tabs, path, (tab) =>
          answer.ok
            ? // The baseline is what was WRITTEN, not what is in the buffer now:
              // a keystroke that landed during the write keeps the tab dirty. `onDisk` moves with
              // the snapshot, or the next keystroke raises a banner against the designer's own save.
              {
                ...tab,
                baseline: written,
                snapshot: answer.snapshot,
                onDisk: answer.snapshot,
                writeRefusal: null,
              }
            : { ...tab, writeRefusal: answer.code },
        ),
        ...(answer.ok ? { savedToken: get().savedToken + 1 } : {}),
      });
      if (answer.ok && path in get().specifiers) {
        const kept: Record<string, readonly string[]> = {};
        for (const [held, specifiers] of Object.entries(get().specifiers)) {
          if (held !== path) kept[held] = specifiers;
        }
        set({ specifiers: kept });
      }
      if (!answer.ok && answer.code === 'stale') await get().recheck(path);
    },
  };
});

export { useCodeStore };

export function clearCode(): void {
  searchGeneration += 1;
  useCodeStore.setState({
    tabs: [],
    activePath: null,
    focus: null,
    followedEvidenceId: null,
    files: [],
    query: '',
    names: [],
    contents: [],
    isSearching: false,
    specifiers: {},
  });
  studio().codeDirty({ isDirty: false });
}

export function resetCodeStoreForTests(): void {
  searchGeneration += 1;
  useCodeStore.setState({ tabs: [], activePath: null, focus: null, savedToken: 0, specifiers: {}, followedEvidenceId: null, query: '', names: [], contents: [], isSearching: false });
}
