import '../testing/dom.js';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { act, memo, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ChromeSlots, ChromeSlotsPush } from '@studio/events';
import { installBridge } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';

mock.module('../tabIdentity.js', () => ({ TAB_ID: 'slots-tab', isTabView: true }));
const { BlockedWindowBarContext, useFillWindowBar } = await import('./slots.js');

const PRODUCT: ChromeSlots = { showFolder: true, rails: { left: true, right: false } };
const UPDATED: ChromeSlots = { showFolder: true, rails: { left: false, right: true } };
const BLENDED: ChromeSlots = { blendsIntoScreen: true };
let root: Root | undefined;
let container: HTMLDivElement | undefined;
let pushes: ChromeSlotsPush[];
let mounts: number;

beforeEach(() => {
  pushes = [];
  mounts = 0;
  takeComplaints();
  installBridge({ chromeSlots: (push) => { pushes.push(push); } });
});

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  root = undefined;
  container?.remove();
  container = undefined;
  expect(takeComplaints()).toEqual([]);
});

const Publisher = memo(function Publisher({ slots }: { slots: ChromeSlots }): null {
  useState(() => { mounts += 1; return null; });
  useFillWindowBar(slots);
  return null;
});

async function render(children: ReactNode): Promise<void> {
  if (container === undefined) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => { root!.render(children); });
}

describe('window bar access context', () => {
  it('replaces a screen publisher without sending an empty band between screens', async () => {
    await render(<Publisher key="editor" slots={PRODUCT} />);
    pushes.length = 0;
    await render(<Publisher key="projects" slots={{ showFolder: true }} />);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: { showFolder: true } }]);
  });

  it('leaves publishers outside an access boundary unchanged and clears them on unmount', async () => {
    await render(<Publisher slots={PRODUCT} />);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: PRODUCT }]);
    await render(null);
    expect(pushes.at(-1)).toEqual({ tabId: 'slots-tab', slots: {} });
  });

  it('suppresses an existing memoized publisher and restores its latest slots without remounting', async () => {
    await render(<BlockedWindowBarContext value={false}><Publisher slots={PRODUCT} /></BlockedWindowBarContext>);
    pushes.length = 0;
    await render(<BlockedWindowBarContext value><Publisher slots={PRODUCT} /></BlockedWindowBarContext>);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: BLENDED }]);
    pushes.length = 0;
    await render(<BlockedWindowBarContext value><Publisher slots={UPDATED} /></BlockedWindowBarContext>);
    expect(pushes).toEqual([]);
    await render(<BlockedWindowBarContext value={false}><Publisher slots={UPDATED} /></BlockedWindowBarContext>);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: UPDATED }]);
    expect(mounts).toBe(1);
    pushes.length = 0;
    await render(null);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: {} }]);
  });

  it('blends a late-mounted publisher and its cleanup while access stays blocked', async () => {
    await render(<BlockedWindowBarContext value>{null}</BlockedWindowBarContext>);
    await render(<BlockedWindowBarContext value><Publisher slots={PRODUCT} /></BlockedWindowBarContext>);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: BLENDED }]);
    pushes.length = 0;
    await render(<BlockedWindowBarContext value>{null}</BlockedWindowBarContext>);
    expect(pushes).toEqual([{ tabId: 'slots-tab', slots: BLENDED }]);
  });
});
