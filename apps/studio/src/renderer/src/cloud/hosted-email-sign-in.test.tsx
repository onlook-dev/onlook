import { takeComplaints } from '../testing/dom.js';
import { afterEach, expect, mock, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GettingStarted } from './GettingStarted.js';
import { installBridge } from '../testing/bridge.js';

mock.module('../app/store.js', () => ({ primeAppInfo: async () => {}, useAppInfoStore: () => undefined }));

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = undefined;
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

test.each(['email', 'google', 'github'] as const)('%s opens hosted sign-in immediately without an email field', async (method) => {
  installBridge({ githubStars: async () => null });
  const calls: string[] = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container!);
    root.render(<GettingStarted aside={<div />} onSignIn={(picked) => { calls.push(picked); }} onCancel={() => {}} />);
  });
  expect(container.querySelector('input')).toBeNull();
  expect(container.querySelector('[aria-expanded]')).toBeNull();
  const button = container.querySelector<HTMLButtonElement>(`[data-testid="account-continue-${method}"]`)!;
  expect(button).not.toBeNull();
  await act(async () => { button.click(); });
  expect(calls).toEqual([method]);
  expect(container.querySelector('input')).toBeNull();
});
