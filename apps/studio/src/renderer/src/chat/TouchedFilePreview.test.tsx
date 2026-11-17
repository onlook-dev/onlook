import { takeComplaints } from '../testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { CODE_REFUSAL_CODES, type CodeReadResult } from '@studio/events';
import { TouchedFiles } from '@studio/chat-ui';
import { codeRefusalKey } from '../code/refusalCopy.js';
import { t } from '@studio/i18n';
import { TouchedFilePreview, type TouchedFilePreviewProps } from './TouchedFilePreview.js';
import { touchedFileStrings } from './touchedFileStrings.js';

const text: Extract<CodeReadResult, { ok: true }> = { ok: true, path: 'src/main.ts', text: 'const title = "Hello";', snapshot: { hash: 'fixture', size: 22, mtimeMs: 0, eol: '\n', mode: 0o644, bom: false } };

function render(overrides: Partial<TouchedFilePreviewProps> = {}): string {
  return renderToStaticMarkup(<TouchedFilePreview path="src/main.ts" result={text} onClose={() => {}} isInline {...overrides} />);
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

describe('touched-file read-only preview', () => {
  it('is absent without a selection', () => {
    expect(render({ path: null })).not.toContain('data-testid="touched-file-preview"');
  });

  it('names the preview with the full path and shows read-only code without copy or save controls', () => {
    const markup = render();
    expect(markup).toContain('aria-label="src/main.ts"');
    expect(markup).toContain('const title');
    expect(markup).toContain('Hello');
    expect(markup).not.toContain('<textarea');
    expect(markup).not.toContain('contenteditable="true"');
    expect(markup).not.toContain('code-save');
    expect(markup).not.toContain('Copy code');
    expect(markup).toContain(t('chat.files.close'));
  });

  it('shows localized loading until the selected file has arrived', () => {
    for (const result of [null, { ...text, path: 'src/previous.ts' }]) {
      const markup = render({ result });
      expect(markup).toContain('aria-busy="true"');
      expect(markup).toContain(t('chat.files.loading'));
      expect(markup).not.toContain('const title');
    }
  });

  it.each([...CODE_REFUSAL_CODES])('reuses Code refusal copy for %s', (code) => {
    expect(render({ result: { ok: false, code } })).toContain(t(codeRefusalKey(code)));
  });

  it('uses the existing image preview for an image result', () => {
    const markup = render({ result: { ...text, image: { dataUrl: 'data:image/png;base64,AA==' } } });
    expect(markup).toContain('data-testid="code-image-preview"');
    expect(markup).toContain('alt="main.ts"');
    expect(markup).not.toContain('const title');
  });

  it('dismisses through the localized close control without performing a read', async () => {
    let closed = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container!);
      root.render(<TouchedFilePreview path="src/main.ts" result={null} onClose={() => { closed += 1; }} isInline />);
    });
    await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="touched-file-preview-close"]')!.click(); });
    expect(closed).toBe(1);
  });

  it.each(['close', 'escape'])('opens the exact row path and returns focus after %s dismissal', async (dismissal) => {
    const strings = touchedFileStrings();
    function Surface(): React.JSX.Element {
      const [path, setPath] = useState<string | null>(null);
      return <>
        <TouchedFiles files={[{ path: text.path, status: 'stopped' }]} strings={strings} onOpen={setPath} />
        <TouchedFilePreview path={path} result={text} onClose={() => setPath(null)} />
      </>;
    }
    container = document.createElement('div');
    document.body.appendChild(container);
    await act(async () => {
      root = createRoot(container!);
      root.render(<Surface />);
    });
    const row = container.querySelector<HTMLButtonElement>('[data-testid="touched-file"]')!;
    await act(async () => { row.focus(); row.click(); });
    const dialog = container.querySelector<HTMLDialogElement>('[data-testid="touched-file-preview"]')!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe(text.path);
    await act(async () => {
      const close = dialog.querySelector<HTMLButtonElement>('[data-testid="touched-file-preview-close"]')!;
      close.focus();
      if (dismissal === 'close') close.click();
      else close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(row);
    expect(row.dataset['status']).toBe('stopped');
  });
});
