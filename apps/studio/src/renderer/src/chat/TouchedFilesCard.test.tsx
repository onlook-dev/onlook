import { takeComplaints } from '../testing/dom.js';
import { afterEach, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { StudioBridge, TouchedFileView } from '@studio/events';
import { seedFlags } from '../flags/store.js';
import { TouchedFilesCard } from './TouchedFilesCard.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const originalStudio = window.studio;
const files: TouchedFileView[] = Array.from({ length: 5 }, (_, index) => ({ path: `src/${index}.ts`, status: 'edited', additions: index + 1, deletions: 1 }));

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  seedFlags();
  window.studio = originalStudio;
  expect(takeComplaints()).toEqual([]);
});

async function mount(isStreaming: boolean): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<TouchedFilesCard files={files} isStreaming={isStreaming} turnId="turn-one" scope="/work:session" />);
  });
}

it.each([true, false])('hides live and stored files and preview while disabled (streaming=%s)', async (isStreaming) => {
  await mount(isStreaming);
  expect(container!.querySelector('[data-testid="touched-files"]')).toBeNull();
  expect(container!.querySelector('[data-testid="touched-file-preview"]')).toBeNull();
});

it('expands and collapses the remaining files, opens the exact preview and removes it when the flag switches off', async () => {
  const reads: string[] = [];
  window.studio = { telemetryEvent: () => {}, codeRead: async ({ path }) => { reads.push(path); return { ok: false, code: 'not-found' }; } } as Pick<StudioBridge, 'telemetryEvent' | 'codeRead'> as StudioBridge;
  seedFlags({ sections: false, connectors: false, touchedFiles: true });
  await mount(false);
  const rows = () => container!.querySelectorAll('[data-testid="touched-file"]');
  const toggle = container!.querySelector<HTMLButtonElement>('[data-testid="touched-files-toggle"]')!;
  expect(rows()).toHaveLength(3);
  await act(async () => { toggle.click(); });
  expect(rows()).toHaveLength(5);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  await act(async () => { (rows()[4] as HTMLButtonElement).click(); });
  expect(reads).toEqual(['src/4.ts']);
  expect(container!.querySelector<HTMLDialogElement>('[data-testid="touched-file-preview"]')!.open).toBe(true);
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="touched-file-preview-close"]')!.click(); toggle.click(); });
  expect(rows()).toHaveLength(3);
  await act(async () => { seedFlags(); });
  expect(container!.querySelector('[data-testid="touched-files"]')).toBeNull();
  expect(container!.querySelector('[data-testid="touched-file-preview"]')).toBeNull();
  await act(async () => { seedFlags({ sections: false, connectors: false, touchedFiles: true }); });
  expect(container!.querySelector<HTMLDialogElement>('[data-testid="touched-file-preview"]')?.open ?? false).toBe(false);
});

it.each(['close', 'escape'])('keeps expansion and the connected preview opener through completion and %s dismissal', async (dismissal) => {
  window.studio = { telemetryEvent: () => {}, codeRead: async () => ({ ok: false, code: 'not-found' }) } as Pick<StudioBridge, 'telemetryEvent' | 'codeRead'> as StudioBridge;
  seedFlags({ sections: false, connectors: false, touchedFiles: true });
  await mount(true);
  await act(async () => { container!.querySelector<HTMLButtonElement>('[data-testid="touched-files-toggle"]')!.click(); });
  const opener = container!.querySelectorAll<HTMLButtonElement>('[data-testid="touched-file"]')[4]!;
  await act(async () => { opener.focus(); opener.click(); });
  const preview = container!.querySelector<HTMLDialogElement>('[data-testid="touched-file-preview"]')!;
  expect(preview.open).toBe(true);
  await act(async () => { root!.render(<TouchedFilesCard files={files} isStreaming={false} turnId="turn-one" scope="/work:session" />); });
  expect(container!.querySelector('[data-testid="touched-file-preview"]')).toBe(preview);
  expect(preview.open).toBe(true);
  expect(container!.querySelectorAll('[data-testid="touched-file"]')).toHaveLength(5);
  await act(async () => {
    if (dismissal === 'close') container!.querySelector<HTMLButtonElement>('[data-testid="touched-file-preview-close"]')!.click();
    else preview.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  expect(opener.isConnected).toBe(true);
  expect(document.activeElement).toBe(opener);
  await act(async () => { root!.render(<TouchedFilesCard files={files} isStreaming turnId="turn-two" scope="/work:session" />); });
  expect(container!.querySelectorAll('[data-testid="touched-file"]')).toHaveLength(3);
});
