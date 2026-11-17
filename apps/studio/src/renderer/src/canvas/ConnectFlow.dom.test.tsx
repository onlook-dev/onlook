import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { installBridge } from '../testing/bridge.js';
import { t } from '@studio/i18n';
import { ConnectFlowProvider } from './ConnectFlow.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

test('the Canvas refusal is named by its single focused heading and Close dismisses it', async () => {
  installBridge({ onWorkspaceCreated: () => () => {} });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ConnectFlowProvider creating={{ kind: 'refused', sourceRepoName: 'Lemonade', reason: 'no-base-ref' }}>
        <div>Canvas</div>
      </ConnectFlowProvider>,
    );
  });
  const dialog = document.querySelector<HTMLDialogElement>('[data-testid="connect-dialog"]')!;
  const heading = dialog.querySelector('h2')!;
  expect(dialog.open).toBe(true);
  expect(dialog.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(1);
  expect(heading.textContent).toBe(t('workspace.refused.noBaseRef.title'));
  expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  expect(document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent).toBe(t('workspace.refused.noBaseRef.body'));
  expect(document.activeElement).toBe(heading);
  expect(dialog.querySelector('[data-testid="workspace-start-blank"]')).toBeNull();
  await act(async () => { dialog.querySelector<HTMLButtonElement>('[data-testid="workspace-refused-dismiss"]')!.click(); });
  expect(dialog.open).toBe(false);
});
