import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GithubRepository } from '@studio/events';
import { RepositoryPicker } from './RepositoryPicker.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const repositories: GithubRepository[] = [1, 2, 3].map((id) => ({
  id, fullName: `design-team/project-0${String(id)}`, private: false, defaultBranch: 'main', archived: false, canPull: true, canPush: true,
}));

async function mount(): Promise<void> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<RepositoryPicker repositories={repositories} repositoryId={undefined} locked={false} query=""
      onQuery={() => {}} onSelect={() => {}} empty={null} />);
  });
}

const listbox = (): HTMLElement => document.querySelector<HTMLElement>('[data-testid="github-repositories"]')!;
const row = (id: number): HTMLElement => document.querySelector<HTMLElement>(`[data-testid="github-repo-${String(id)}"]`)!;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

test('the keyboard’s row lights for the list’s own focus, and not for a row that was pressed', async () => {
  await mount();
  expect(row(1).style.background).toBe('transparent');
  await act(async () => { listbox().focus(); });
  const reading = row(1).style.background;
  expect(reading).not.toBe('transparent');
  /* A pressed row takes focus itself, and the row the arrow keys are on is nowhere near the pointer. */
  await act(async () => { row(3).focus(); });
  expect(row(1).style.background).toBe('transparent');
});
