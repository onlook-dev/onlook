import { describe, expect, it } from 'bun:test';
import { isUuidV7, uuidv7, uuidv7Timestamp } from './session-id.js';

describe('uuidv7', () => {
  it('carries version 7, the RFC variant, and a timestamp at or before now', () => {
    const before = Date.now();
    const id = uuidv7();
    const after = Date.now();
    expect(isUuidV7(id)).toBe(true);
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19] ?? '');
    const stamped = uuidv7Timestamp(id);
    expect(stamped).toBeDefined();
    expect(stamped!).toBeGreaterThanOrEqual(before);
    expect(stamped!).toBeLessThanOrEqual(after);
  });

  it('two ids minted in the same millisecond differ', () => {
    const now = Date.now();
    expect(uuidv7(now)).not.toBe(uuidv7(now));
  });
});

describe('isUuidV7', () => {
  it('refuses a v4, a non-string, and a path-shaped string', () => {
    expect(isUuidV7('3b241101-e2bb-4a5e-8f4d-2e1c9a7b6d5f')).toBe(false);
    expect(isUuidV7(42)).toBe(false);
    expect(isUuidV7('/Users/someone/repo')).toBe(false);
    expect(isUuidV7(null)).toBe(false);
  });
});
