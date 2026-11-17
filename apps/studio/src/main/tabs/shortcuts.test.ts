import { describe, expect, it } from 'bun:test';
import { tabCommandForInput, tabTarget } from './shortcuts.js';

const input = (key: string, mods = {}) => ({
  type: 'keyDown', key, meta: false, control: false, alt: false, shift: false,
  isAutoRepeat: false, ...mods,
});

describe('tab input', () => {
  it('opens, jumps to every numbered tab, and cycles on macOS', () => {
    expect(tabCommandForInput(input('t', { meta: true }), true)).toEqual({ kind: 'new' });
    for (let number = 1; number <= 9; number++) {
      expect(tabCommandForInput(input(String(number), { meta: true }), true))
        .toEqual({ kind: 'jump', number });
    }
    expect(tabCommandForInput(input('Tab', { control: true }), true)).toEqual({ kind: 'cycle' });
    expect(tabCommandForInput(input('T', { meta: true, shift: true }), true)).toEqual({ kind: 'reopen' });
  });

  it('uses Control for new and jump on other platforms', () => {
    expect(tabCommandForInput(input('t', { control: true }), false)).toEqual({ kind: 'new' });
    expect(tabCommandForInput(input('3', { control: true }), false)).toEqual({ kind: 'jump', number: 3 });
    expect(tabCommandForInput(input('Tab', { control: true }), false)).toEqual({ kind: 'cycle' });
    expect(tabCommandForInput(input('t', { meta: true }), false)).toBeNull();
  });

  it('leaves bare, shifted, Alt, mixed-modifier and unrelated keys alone', () => {
    for (const key of ['t', '1', '2', 'Tab']) {
      expect(tabCommandForInput(input(key), true)).toBeNull();
      if (key !== 't') expect(tabCommandForInput(input(key, { meta: true, shift: true }), true)).toBeNull();
      expect(tabCommandForInput(input(key, { meta: true, alt: true }), true)).toBeNull();
      expect(tabCommandForInput(input(key, { meta: true, control: true }), true)).toBeNull();
    }
    expect(tabCommandForInput(input('0', { meta: true }), true)).toBeNull();
    expect(tabCommandForInput(input('t', { control: true }), true)).toBeNull();
    expect(tabCommandForInput(input('Tab', { control: true, shift: true }), true)).toBeNull();
  });

  it('ignores releases and held-key repeats', () => {
    expect(tabCommandForInput(input('t', { meta: true, type: 'keyUp' }), true)).toBeNull();
    expect(tabCommandForInput(input('t', { meta: true, isAutoRepeat: true }), true)).toBeNull();
  });
});

describe('tab targets', () => {
  const tabs = [
    { id: 'home', purpose: 'projects' as const },
    { id: 'a', purpose: 'project' as const },
    { id: 'b', purpose: 'project' as const },
    { id: 'c', purpose: 'project' as const },
  ];

  it('numbers visible project tabs, without treating 9 as the last tab', () => {
    expect(tabTarget(tabs, 'a', { kind: 'jump', number: 3 })).toBe('c');
    expect(tabTarget(tabs, 'a', { kind: 'jump', number: 1 })).toBe('a');
    expect(tabTarget(tabs, 'a', { kind: 'jump', number: 9 })).toBeUndefined();
  });

  it('cycles in strip order and wraps, including from the projects list', () => {
    expect(tabTarget(tabs, 'a', { kind: 'cycle' })).toBe('b');
    expect(tabTarget(tabs, 'c', { kind: 'cycle' })).toBe('a');
    expect(tabTarget(tabs, 'home', { kind: 'cycle' })).toBe('a');
    expect(tabTarget([], undefined, { kind: 'cycle' })).toBeUndefined();
    expect(tabTarget([tabs[1]!], 'a', { kind: 'cycle' })).toBe('a');
  });
});
