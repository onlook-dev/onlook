import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useBlankCreateStore } from '../create/store.js';
import { seedCapabilities } from '../capabilities.js';
import { seedFlags } from '../flags/store.js';
import { t } from '@studio/i18n';
import { installBridge } from '../testing/bridge.js';
import { ImportSourceChooser, type ImportSourceChooserProps } from './ImportSourceChooser.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

async function mount(props: ImportSourceChooserProps = {}): Promise<void> {
  seedFlags({ sections: false, connectors: false, githubImport: true });
  seedCapabilities({ github: true });
  installBridge({});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ImportSourceChooser {...props} />); });
}

const row = (): HTMLElement => document.querySelector<HTMLElement>('[data-testid="onboarding-import-row"]')!;
const choices = (): HTMLElement[] => [...row().querySelectorAll<HTMLElement>('[data-state]')];
const press = (testId: string): HTMLButtonElement => row().querySelector<HTMLButtonElement>(`[data-testid="${testId}"] button`)!;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  seedFlags({ sections: false, connectors: false, githubImport: false });
  seedCapabilities();
  useBlankCreateStore.setState({ status: { kind: 'idle' } });
  expect(takeComplaints()).toEqual([]);
});

/* The rendered boxes are measured in `tests/e2e/github-import-dialog.e2e.ts`, which has layout;
   this holds the two choices to one component, in one row, in the order Add codebase then Start from scratch. */
test('the step offers two choices of the same kind, Add codebase first', async () => {
  await mount({ onCreateBlank: () => {}, onOpen: () => {} });
  expect(choices().map((card) => card.getAttribute('data-testid'))).toEqual(['add-codebase', 'onboarding-import-blank']);
  expect(choices().map((card) => card.getAttribute('data-state'))).toEqual(['default', 'default']);
  expect(press('add-codebase').getAttribute('aria-label')).toBe(t('codebase.add'));
  expect(press('onboarding-import-blank').getAttribute('aria-label')).toBe(t('onboarding.import.blank'));
});

test('a blank project being created leaves both choices standing and starts no second flow', async () => {
  await mount({ onCreateBlank: () => {}, onOpen: () => {} });
  await act(async () => { useBlankCreateStore.setState({ status: { kind: 'creating', stage: 'setting-up' } }); });
  expect(row().querySelector('[data-testid="onboarding-import-blank"]')!.textContent).toContain(t('blank.create.busy'));
  expect(choices()).toHaveLength(2);
  expect(press('add-codebase').disabled).toBe(true);
  expect(press('add-codebase').getAttribute('aria-haspopup')).toBeNull();
});

/* Switching a project inside the canvas renders the same step with neither a blank draft nor a clone to land in. */
test('the project switcher keeps the two boxes, with Start from scratch out of reach', async () => {
  await mount();
  expect(choices().map((card) => card.getAttribute('data-state'))).toEqual(['default', 'comingSoon']);
  await act(async () => { press('add-codebase').click(); });
  expect(press('add-codebase').getAttribute('aria-expanded')).toBe('true');
  expect(document.querySelector('[data-testid="codebase-from-folder"]')).not.toBeNull();
  /* Nowhere to land a clone from here, so the GitHub choice is not offered. */
  expect(document.querySelector('[data-testid="codebase-from-github"]')).toBeNull();
});
