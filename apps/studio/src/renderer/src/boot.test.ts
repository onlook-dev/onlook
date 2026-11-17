import './testing/dom.js';
import { afterEach, describe, expect, it } from 'bun:test';
import { BOOT_GROUND_ID, bootPanels, liftWhenRendered, paintBootGround } from './boot.js';
import { REGION } from './layout.js';

afterEach(() => document.getElementById(BOOT_GROUND_ID)?.remove());

const frames = async (): Promise<void> => { await new Promise(resolve => setTimeout(resolve, 48)); };

describe('the ground a project tab paints before its bundle arrives (ONL-3153)', () => {
  it('carries both rails at the widths the user left them', () => {
    const ground = paintBootGround(document, { sidebar: 340, end: 400 });

    expect(ground.querySelector<HTMLElement>('[data-testid="boot-rail-left"]')?.style.flex).toBe(`0 0 ${String(REGION.rail + 340)}px`);
    expect(ground.querySelector<HTMLElement>('[data-testid="boot-rail-right"]')?.style.flex).toBe('0 0 400px');
  });

  it('stays up while the tab is off screen, and lifts when it comes on', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const onScreen = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    const ground = paintBootGround(document, { sidebar: 259, end: 307 });
    liftWhenRendered(ground, root);

    root.append(document.createElement('main'));
    await frames();
    // A warmed Tab commits off screen, where the frames the lift waits on do not come (ONL-3153).
    expect(document.getElementById(BOOT_GROUND_ID)).not.toBeNull();

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await frames();

    expect(document.getElementById(BOOT_GROUND_ID)).toBeNull();
    if (onScreen) Object.defineProperty(Document.prototype, 'visibilityState', onScreen);
    root.remove();
  });

  it('lifts two frames after React has drawn over it', async () => {
    const root = document.createElement('div');
    document.body.append(root);
    const ground = paintBootGround(document, { sidebar: 259, end: 307 });
    liftWhenRendered(ground, root);

    await frames();
    expect(document.getElementById(BOOT_GROUND_ID)).not.toBeNull();
    root.append(document.createElement('main'));
    await frames();

    expect(document.getElementById(BOOT_GROUND_ID)).toBeNull();
    root.remove();
  });
});

describe('the birth facts the ground reads for itself', () => {
  it('takes the rail widths a parked tab was born with', () => {
    expect(bootPanels('?tab=tab-3&purpose=parked&sidebar=340&end=400')).toEqual({ sidebar: 340, end: 400 });
  });

  it('paints nothing for Home, which has no rails', () => {
    expect(bootPanels('?tab=tab-1&purpose=projects&sidebar=259&end=307')).toBeUndefined();
  });

  it('paints nothing when the widths are unreadable, leaving the bundle to draw the surface', () => {
    expect(bootPanels('?tab=tab-3&purpose=parked')).toBeUndefined();
  });
});
