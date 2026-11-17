import { describe, expect, it } from 'bun:test';
import type { UpdateState, UpdateStatus } from '@studio/events';
import { pillKey, presentation } from './update.js';

/** Written out: derived from the table it would always agree. */
const ALL_STATUSES: UpdateStatus[] = [
  'unsupported',
  'idle',
  'checking',
  'available',
  'downloading',
  'downloaded',
  'up-to-date',
  'error',
];

const background = (status: UpdateStatus): UpdateState => ({ status });
const asked = (status: UpdateStatus): UpdateState => ({ status, requested: true });

describe('the update pill', () => {
  it('stays out of the band for a check the user never asked for', () => {
    const silent = ALL_STATUSES.filter((status) => pillKey(background(status)) === null);
    expect(silent).toEqual(['unsupported', 'idle', 'checking', 'up-to-date']);
  });

  it('shows a real update whoever asked', () => {
    const news = ALL_STATUSES.filter((status) => pillKey(background(status)) !== null);
    expect(news).toEqual(['available', 'downloading', 'downloaded', 'error']);
  });

  it('answers the user their own check, through to the verdict', () => {
    expect(pillKey(asked('checking'))).toBe('topbar.update.checking');
    expect(pillKey(asked('up-to-date'))).toBe('topbar.update.upToDate');
  });

  it('tells the user to free disk space for a disk-full update failure', () => {
    expect(presentation('error', 'No space left on device').pill).toBe('topbar.update.diskFull');
    expect(presentation('error', 'ENOSPC: write').pill).toBe('topbar.update.diskFull');
    expect(presentation('error', 'download interrupted').pill).toBe('topbar.update.failed');
  });

  it('keeps the disk-full wording in the band, which nobody asks for', () => {
    expect(pillKey({ status: 'error', message: 'ENOSPC: write' })).toBe('topbar.update.diskFull');
  });

  it('draws no pill for exactly the two states the menu has nothing to say about', () => {
    const silent = ALL_STATUSES.filter((status) => presentation(status).pill === null);
    expect(silent).toEqual(['unsupported', 'idle']);
  });
});

describe('the Check item is clickable exactly where clicking helps', () => {
  it('stays reachable after a failed check — the offline-bricks-the-menu regression', () => {
    expect(presentation('error').menu.enabled).toBe(true);
    expect(presentation('unsupported').menu.enabled).toBe(false);
  });
});
