import { afterEach, expect, test } from 'bun:test';
import { takeComplaints } from '../testing/dom.js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RepositoryAvatar } from './RepositoryAvatar.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  expect(takeComplaints()).toEqual([]);
});

test('avatars reserve the same decorative space before loading, after loading and after failure', async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<RepositoryAvatar fullName="team/site" />); });
  const avatar = container.firstElementChild as HTMLElement;
  const image = container.querySelector('img')!;
  const placeholder = avatar.getAttribute('style');
  expect(avatar.getAttribute('aria-hidden')).toBe('true');
  expect(image.alt).toBe('');
  expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(image.src).toBe('https://avatars.githubusercontent.com/team?s=40');
  expect(image.getAttribute('loading')).not.toBe('lazy');
  expect(image.style.opacity).toBe('0');
  await act(async () => { image.dispatchEvent(new Event('load')); });
  expect(image.style.opacity).toBe('1');
  expect(avatar.getAttribute('style')).toBe(placeholder);
  await act(async () => { image.dispatchEvent(new Event('error')); });
  expect(image.style.opacity).toBe('0');
  expect(avatar.getAttribute('style')).toBe(placeholder);
  await act(async () => { root!.render(<RepositoryAvatar fullName="designer/portfolio" />); });
  expect(image.src).toBe('https://avatars.githubusercontent.com/designer?s=40');
  expect(image.style.opacity).toBe('0');
  await act(async () => { root!.render(<RepositoryAvatar fullName="https://untrusted.test/avatar" />); });
  expect(container.querySelector('img')).toBeNull();
  expect(avatar.getAttribute('style')).toBe(placeholder);
});
