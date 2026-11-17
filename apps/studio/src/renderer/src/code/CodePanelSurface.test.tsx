import { afterEach, describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodePanelSurface } from './CodePanelSurface.js';
import { resetCodeStoreForTests, useCodeStore } from './store.js';

function markup(): string {
  const initial = { ...useCodeStore.getInitialState() };
  try {
    Object.assign(useCodeStore.getInitialState(), useCodeStore.getState());
    return renderToStaticMarkup(<CodePanelSurface />);
  } finally {
    Object.assign(useCodeStore.getInitialState(), initial);
  }
}

afterEach(() => {
  resetCodeStoreForTests();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('the active file loading presentation', () => {
  it('does not say no file is open while its read is pending', async () => {
    let finish!: (answer: unknown) => void;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { studio: {
      codeRead: () => new Promise(resolve => { finish = resolve; }),
    } } });
    const pending = useCodeStore.getState().open('src/Slow.tsx');
    const pendingMarkup = markup();
    finish({ ok: false, code: 'not-found' });
    await pending;
    expect(pendingMarkup).toContain('src/Slow.tsx');
    expect(pendingMarkup).toContain('code-panel-loading');
    expect(pendingMarkup).toContain('role="status"');
    expect(pendingMarkup).not.toContain('code-panel-empty');
    expect(pendingMarkup).not.toContain('code-area');
    expect(markup()).toContain('code-panel-refusal');
    expect(markup()).not.toContain('code-panel-loading');
  });

  it('also words loading while the editor module has not rendered', async () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { studio: {
      codeRead: () => Promise.resolve({ ok: true, path: 'src/Ready.tsx', text: 'ready',
        snapshot: { hash: 'ready', size: 5, mtimeMs: 1, eol: '\n', mode: 0o644, bom: false } }),
    } } });
    await useCodeStore.getState().open('src/Ready.tsx');
    const pendingMarkup = markup();
    expect(pendingMarkup).toContain('code-panel-loading');
    expect(pendingMarkup).not.toContain('code-panel-empty');
  });
});
