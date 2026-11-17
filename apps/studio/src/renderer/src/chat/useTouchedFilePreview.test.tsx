import '../testing/dom.js';
import { describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { CodeReadResult } from '@studio/events';
import { useTouchedFilePreview } from './useTouchedFilePreview.js';

describe('touched file preview reads', () => {
  it('keeps only the newest read and does not reopen after close or a project switch', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const replies: ((result: CodeReadResult) => void)[] = [];
    const read = (): Promise<CodeReadResult> => new Promise((resolve) => { replies.push(resolve); });
    let scope = 'project-a:chat';
    let preview: ReturnType<typeof useTouchedFilePreview> | undefined;
    function Harness(): React.JSX.Element {
      preview = useTouchedFilePreview(scope, read);
      return <div>{preview.path}:{preview.result === null ? 'loading' : preview.result.ok ? 'opened' : preview.result.code}</div>;
    }
    try {
      await act(async () => root.render(<Harness />));
      await act(async () => { preview?.open('a.ts'); preview?.open('b.ts'); });
      await act(async () => replies[0]?.({ ok: false, code: 'not-found' }));
      expect(container.textContent).toBe('b.ts:loading');
      await act(async () => replies[1]?.({ ok: false, code: 'unreadable' }));
      expect(container.textContent).toBe('b.ts:unreadable');
      await act(async () => { preview?.open('c.ts'); preview?.close(); });
      await act(async () => replies[2]?.({ ok: false, code: 'not-found' }));
      expect(preview?.path).toBeNull();
      await act(async () => preview?.open('d.ts'));
      scope = 'project-b:chat';
      await act(async () => root.render(<Harness />));
      await act(async () => replies[3]?.({ ok: false, code: 'not-found' }));
      expect(preview?.path).toBeNull();
      scope = 'project-a:chat';
      await act(async () => root.render(<Harness />));
      expect(preview?.path).toBeNull();
    } finally {
      await act(async () => root.unmount());
    }
  });

  it('turns a bridge rejection into the existing unreadable refusal', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let open: ((path: string) => void) | undefined;
    const read = (): Promise<CodeReadResult> => Promise.reject(new Error('bridge unavailable'));
    function Harness(): React.JSX.Element {
      const preview = useTouchedFilePreview('project', read);
      open = preview.open;
      return <div>{preview.result?.ok === false ? preview.result.code : ''}</div>;
    }
    try {
      await act(async () => root.render(<Harness />));
      await act(async () => open?.('a.ts'));
      expect(container.textContent).toBe('unreadable');
    } finally {
      await act(async () => root.unmount());
    }
  });
});
