import { describe, expect, it } from 'bun:test';
import { folderDecision } from './folderAction.js';

const press = { tabId: 'tab-1', slot: 'folder' } as const;
const close = { tabId: 'tab-1', slot: 'folder', closing: true } as const;

describe('the folder action (ONL-2265)', () => {
  it('a close mid-switch abandons the switch, then exits', () => {
    expect(folderDecision(close, true)).toBe('abandon-then-exit');
  });

  it('a close with no switch raised still abandons: a creation landing holds no flag, only a token', () => {
    expect(folderDecision(close, false)).toBe('abandon-then-exit');
  });

  it('a band press mid-switch is ignored, as before', () => {
    expect(folderDecision(press, true)).toBe('ignore');
  });

  it('a band press at rest exits', () => {
    expect(folderDecision(press, false)).toBe('exit');
  });
});
