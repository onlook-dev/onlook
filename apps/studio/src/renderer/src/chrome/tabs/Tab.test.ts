import { describe, expect, it } from 'bun:test';

import { isTabWorking, trailingSlot } from './Tab.js';

const base = { isDead: false, isWorking: false, isActive: false, isHovered: false, isEditing: false, hasChord: false };

describe('a tab\'s trailing slot (ONL-2593)', () => {
  it('shows the spinner while the Onlook Agent works', () => {
    expect(trailingSlot({ ...base, isWorking: true })).toBe('working');
    expect(trailingSlot({ ...base, isWorking: true, isActive: true })).toBe('working');
  });

  it('gives the spinner\'s place to the close button on hover', () => {
    expect(trailingSlot({ ...base, isWorking: true, isHovered: true })).toBe('close');
  });

  it('keeps the legend, the reload and the rename above the spinner', () => {
    expect(trailingSlot({ ...base, isWorking: true, hasChord: true })).toBe('chord');
    expect(trailingSlot({ ...base, isWorking: true, isDead: true })).toBe('reload');
    expect(trailingSlot({ ...base, isWorking: true, isEditing: true })).toBe('none');
  });

  it('shows the close button on an idle tab only when active or hovered', () => {
    expect(trailingSlot(base)).toBe('none');
    expect(trailingSlot({ ...base, isActive: true })).toBe('close');
  });
});

describe('a tab parked on the person', () => {
  it('reads as working only while the turn is not waiting on a question or approval', () => {
    expect(isTabWorking({ isWorking: true, status: 'working' })).toBe(true);
    expect(isTabWorking({ isWorking: true, status: 'waiting' })).toBe(false);
    expect(isTabWorking({ isWorking: false, status: 'waiting' })).toBe(false);
    expect(isTabWorking({})).toBe(false);
  });
});
