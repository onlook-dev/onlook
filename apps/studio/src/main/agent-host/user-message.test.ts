import { describe, expect, test } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { hasUserMessage } from './user-message.js';

const user = (seq: number, origin?: 'user' | 'studio' | 'suggestion'): StudioEvent =>
  ({ type: 'message.user', seq, turnId: `t${String(seq)}`, text: 'hi', ...(origin === undefined ? {} : { origin }) }) as StudioEvent;

describe('hasUserMessage', () => {
  test('an empty transcript has no message from the person', () => {
    expect(hasUserMessage([])).toBe(false);
  });

  test('a message with no origin is the person speaking', () => {
    expect(hasUserMessage([user(1)])).toBe(true);
  });

  test('a tapped suggestion counts as the person speaking', () => {
    expect(hasUserMessage([user(1, 'suggestion')])).toBe(true);
  });

  test('prompts Studio sent on its own do not count', () => {
    expect(hasUserMessage([user(1, 'studio'), user(2, 'studio')])).toBe(false);
  });

  test('one message from the person among Studio prompts counts', () => {
    expect(hasUserMessage([user(1, 'studio'), user(2, 'user')])).toBe(true);
  });
});
