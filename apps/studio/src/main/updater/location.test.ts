import { describe, expect, it } from 'bun:test';

const { isSameApp } = await import('./location.js');

describe('the move to Applications replaces only our own app', () => {
  it('a different app with the same name, or one whose identifier cannot be read, is never replaced', () => {
    expect(isSameApp('com.onlook.studio', 'com.onlook.studio')).toBe(true);
    expect(isSameApp('com.onlook.studio', 'com.example.other')).toBe(false);
    expect(isSameApp('com.onlook.studio', undefined)).toBe(false);
    expect(isSameApp(undefined, undefined)).toBe(false);
  });
});
