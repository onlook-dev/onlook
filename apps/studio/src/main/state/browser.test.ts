import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { browserSessionPath } from './browser.js';

describe('browser session storage', () => {
  it('preserves the signed app cookie location', () => {
    expect(browserSessionPath('/profile', true)).toBe('/profile');
  });

  it('keeps development cookies out of the signed app profile', () => {
    expect(browserSessionPath('/profile', false)).toBe(join('/profile', 'development-browser'));
  });
});
