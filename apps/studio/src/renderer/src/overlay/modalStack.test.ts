import { afterEach, expect, it } from 'bun:test';
import { modalsBesides, openModal, openModals, subscribeModals } from './modalStack.js';

const closers: Array<() => void> = [];
const open = (...args: Parameters<typeof openModal>): (() => void) => {
  const close = openModal(...args);
  closers.push(close);
  return close;
};

afterEach(() => {
  for (const close of closers.splice(0)) close();
  expect(openModals()).toEqual([]);
});

it('lists the open modals in the order they opened, and drops one when it closes', () => {
  const closeFirst = open('dialog');
  open('viewer');
  open('dialog');
  expect(openModals().map((entry) => entry.kind)).toEqual(['dialog', 'viewer', 'dialog']);
  closeFirst();
  expect(openModals().map((entry) => entry.kind)).toEqual(['viewer', 'dialog']);
});

it('closing twice removes one entry, not its neighbour', () => {
  const close = open('dialog');
  open('dialog');
  close();
  close();
  expect(openModals()).toHaveLength(1);
});

it('answers a gate with every modal that is not a gate', () => {
  open('dialog');
  expect(modalsBesides('gate').map((entry) => entry.kind)).toEqual(['dialog']);
  open('gate');
  expect(modalsBesides('gate').map((entry) => entry.kind)).toEqual(['dialog']);
  expect(openModals().at(-1)?.kind).toBe('gate');
});

it('tells a subscriber of every open and close until it leaves', () => {
  let calls = 0;
  const leave = subscribeModals(() => { calls += 1; });
  const close = open('dialog');
  close();
  expect(calls).toBe(2);
  leave();
  open('dialog');
  expect(calls).toBe(2);
});
