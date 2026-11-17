import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { CodeMapping } from '@studio/events';
import { useCanvasStore } from '../canvas/store.js';
import { useSettingsStore } from '../settings/store.js';
import { movedPaths, showMapping, sourceRequestIsCurrent } from './selectionMapping.js';
import type { ElementEvidence } from '@studio/events';

beforeEach(() => useSettingsStore.setState({ experimentalCodePanel: true }));
afterEach(() => useSettingsStore.setState({ experimentalCodePanel: false }));

describe('source request lifetime', () => {
  const evidence: ElementEvidence = { kind: 'element', id: 'source-pick', tag: 'div', domPath: '#hero',
    outerHtmlSnippet: '<div id="hero">Hello</div>', textContent: 'Hello', classes: [], frameUrl: 'http://localhost:3000/' };
  const frame = { mountUrl: evidence.frameUrl, currentUrl: evidence.frameUrl, health: 'live' as const,
    title: 'Page', canGoBack: false, canGoForward: false, sourceGeneration: 0 };
  beforeEach(() => useCanvasStore.setState({ leftPanelView: 'code', mode: 'design', hiddenRails: { left: false, right: false } }));
  afterEach(() => useCanvasStore.setState({ elementSelections: [], elementMappings: {}, overlay: {}, leftPanelView: 'designs', mode: 'design', hiddenRails: { left: false, right: false } }));

  it('rejects late menu answers when the experimental flag is disabled', () => {
    useCanvasStore.setState({ elementSelections: [{ evidence, frameNodeId: 'source-frame', stale: false }], overlay: { 'source-frame': frame } });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0, true)).toBe(true);
    useSettingsStore.getState().apply({ experimentalCodePanel: false });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0, true)).toBe(false);
  });

  it('rejects a source answer after Code closes or its rail becomes hidden (ONL-2605)', () => {
    useCanvasStore.setState({ elementSelections: [{ evidence, frameNodeId: 'source-frame', stale: false }], overlay: { 'source-frame': frame } });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(true);
    useCanvasStore.setState({ leftPanelView: 'designs' });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(false);
    // An explicitly opened context menu can resolve its source without opening Code.
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0, true)).toBe(true);
    useCanvasStore.setState({ leftPanelView: 'code', hiddenRails: { left: true, right: false } });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(false);
    useCanvasStore.setState({ hiddenRails: { left: false, right: false }, mode: 'interact' });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(false);
    useCanvasStore.setState({ mode: 'design' });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(true);
  });

  it('rejects an asynchronous old answer even after the next document has finished loading', async () => {
    useCanvasStore.setState({ elementSelections: [{ evidence, frameNodeId: 'source-frame', stale: false }], overlay: { 'source-frame': frame } });
    let release: (() => void) | undefined;
    const answer = new Promise<void>((resolve) => { release = resolve; }).then(() => sourceRequestIsCurrent(evidence, 'source-frame', 0));
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(true);
    useCanvasStore.getState().patchFrame('source-frame', { health: 'loading' });
    useCanvasStore.getState().patchFrame('source-frame', { health: 'live' });
    release?.();
    expect(await answer).toBe(false);
  });

  it('rejects an answer for evidence replaced by an error document', () => {
    useCanvasStore.setState({ elementSelections: [{ evidence, frameNodeId: 'source-frame', stale: false }], overlay: { 'source-frame': frame } });
    useCanvasStore.getState().refreshElementSelection({ ...evidence, textContent: 'HTTPError 500' });
    expect(sourceRequestIsCurrent(evidence, 'source-frame', 0)).toBe(false);
  });
});
import { resetCodeStoreForTests, useCodeStore, type CodeTab } from './store.js';

function tab(over: Partial<CodeTab> = {}): CodeTab {
  return {
    path: 'src/Hero.jsx',
    text: 'a',
    baseline: 'a',
    snapshot: null,
    refusal: null,
    writeRefusal: null,
    onDisk: null,
    clashSource: 'disk',
    ...over,
  };
}

const SNAP = { hash: 'one', size: 1, mtimeMs: 1, eol: '\n' as const, mode: 0o644, bom: false };

describe('which open files the mapper is told have moved (ONL-2563)', () => {
  it('names a file with unsaved changes', () => {
    expect(movedPaths([tab({ text: 'b' })])).toEqual(['src/Hero.jsx']);
  });

  it('names a file whose bytes on disk no longer match the snapshot', () => {
    expect(movedPaths([tab({ snapshot: SNAP, onDisk: { ...SNAP, hash: 'two' } })])).toEqual(['src/Hero.jsx']);
  });

  /* A tab whose first read has not landed has no snapshot. Calling that "moved" softens a grade
     on the strength of nothing. */
  it('leaves a tab whose read has not landed alone', () => {
    expect(movedPaths([tab({ snapshot: null, onDisk: SNAP })])).toEqual([]);
  });

  it('leaves a clean tab that matches its disk alone', () => {
    expect(movedPaths([tab({ snapshot: SNAP, onDisk: SNAP })])).toEqual([]);
  });
});

describe('following a held pick', () => {
  afterEach(() => {
    resetCodeStoreForTests();
    useCanvasStore.setState({ leftPanelView: 'designs', elementSelections: [] });
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('opens the mapped file with no tabs, then respects a manual choice across remounts', async () => {
    resetCodeStoreForTests();
    useCanvasStore.setState({ leftPanelView: 'code' });
    Object.defineProperty(globalThis, 'window', {
      value: { studio: { codeRead: (request: { path: string }) => Promise.resolve({ ok: true, path: request.path, text: 'loaded', snapshot: SNAP }) } },
      configurable: true,
    });
    const mapping: CodeMapping = {
      path: 'src/Hero.jsx', line: 14, column: 1, via: 'owner-stack', definition: null,
      grade: 'exact', component: 'Hero', others: [], uses: 0, produced: 1, producedComplete: true,
    };
    await showMapping(mapping, 'pick-one');
    expect(useCodeStore.getState().activePath).toBe(mapping.path);
    expect(useCodeStore.getState().focus?.line).toBe(14);
    expect(useCodeStore.getState().focus?.focusEditor).toBe(false);
    await useCodeStore.getState().open('src/Chosen.jsx');
    await showMapping(mapping, 'pick-one');
    expect(useCodeStore.getState().activePath).toBe('src/Chosen.jsx');
    await showMapping(mapping, 'pick-two');
    expect(useCodeStore.getState().activePath).toBe(mapping.path);
  });
  it('does not automatically open an unverified component-name or DOM match', async () => {
    resetCodeStoreForTests();
    useCanvasStore.setState({ leftPanelView: 'code' });
    Object.defineProperty(globalThis, 'window', { value: { studio: { codeRead: (request: { path: string }) => Promise.resolve({ ok: true, path: request.path, text: 'unrelated', snapshot: SNAP }) } }, configurable: true });
    for (const via of ['name-search', 'element-search'] as const) {
      await showMapping({ path: 'src/Unrelated.ts', line: 1, column: 1, via, definition: null,
        grade: via === 'name-search' ? 'likely' : 'best-guess', component: 'Hero', others: [],
        uses: 0, produced: 1, producedComplete: false }, `pick-${via}`);
      expect(useCodeStore.getState().activePath).toBeNull();
      expect(useCodeStore.getState().followedEvidenceId).toBeNull();
    }
  });

  it('does not focus an old mapping after its file read outlives the canvas pick', async () => {
    resetCodeStoreForTests();
    const evidence: ElementEvidence = { kind: 'element', id: 'old-pick', tag: 'a', domPath: '#old', outerHtmlSnippet: '<a>Start Designing</a>', textContent: 'Start Designing', classes: [], frameUrl: 'http://localhost:3000/' };
    useCanvasStore.setState({ leftPanelView: 'code', mode: 'design', hiddenRails: { left: false, right: false }, elementSelections: [{ evidence, frameNodeId: 'frame', stale: false }] });
    let finish!: (answer: unknown) => void;
    Object.defineProperty(globalThis, 'window', { value: { studio: { codeRead: () => new Promise(resolve => { finish = resolve; }) } }, configurable: true });
    const mapping: CodeMapping = { path: 'src/Hero.jsx', line: 14, column: 1, via: 'owner-stack', definition: null, grade: 'exact', component: 'Hero', others: [], uses: 0, produced: 1, producedComplete: true };
    const pending = showMapping(mapping, evidence.id);
    useCanvasStore.setState({ elementSelections: [{ evidence: { ...evidence, id: 'new-pick', domPath: '#new' }, frameNodeId: 'frame', stale: false }] });
    finish({ ok: true, path: mapping.path, text: 'loaded', snapshot: SNAP });
    await pending;
    expect(useCodeStore.getState().focus).toBeNull();
    useCanvasStore.setState({ elementSelections: [] });
  });

  for (const manualChoice of [false, true]) {
    it(manualChoice ? 'keeps manual navigation when a hidden source read finishes' : 'retries a canceled source reveal when Code reopens', async () => {
      resetCodeStoreForTests();
      useCanvasStore.setState({ leftPanelView: 'code', mode: 'design', hiddenRails: { left: false, right: false } });
      let finish!: (answer: unknown) => void;
      Object.defineProperty(globalThis, 'window', { value: { studio: { codeRead: (request: { path: string }) => request.path === 'src/Hero.jsx'
        ? new Promise(resolve => { finish = resolve; })
        : Promise.resolve({ ok: true, path: request.path, text: 'chosen', snapshot: SNAP }) } }, configurable: true });
      const mapping: CodeMapping = { path: 'src/Hero.jsx', line: 14, column: 1, via: 'owner-stack', definition: null, grade: 'exact', component: 'Hero', others: [], uses: 0, produced: 1, producedComplete: true };
      const pending = showMapping(mapping, 'held-pick');
      useCanvasStore.setState({ leftPanelView: 'designs' });
      if (manualChoice) await useCodeStore.getState().open('src/Chosen.jsx');
      finish({ ok: true, path: mapping.path, text: 'loaded', snapshot: SNAP });
      await pending;
      expect(useCodeStore.getState().followedEvidenceId).toBe(manualChoice ? 'held-pick' : null);
      expect(useCodeStore.getState().focus?.path).not.toBe(mapping.path);
      useCanvasStore.setState({ leftPanelView: 'code' });
      await showMapping(mapping, 'held-pick');
      expect(useCodeStore.getState().activePath).toBe(manualChoice ? 'src/Chosen.jsx' : mapping.path);
      if (!manualChoice) expect(useCodeStore.getState().focus?.line).toBe(14);
    });
  }

});
