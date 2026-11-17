import { describe, expect, test } from 'bun:test';
import { BLANK_WELCOME_ROWS, blankWelcomePrompt } from './blankWelcome.js';

describe('a tapped blank-chat welcome row (ONL-2960)', () => {
  test('sends the row’s words as the person’s message and the interview brief only as hidden context', () => {
    for (const row of BLANK_WELCOME_ROWS) {
      const prompt = blankWelcomePrompt(row, 'the row’s words');
      expect(prompt.text).toBe('the row’s words');
      expect(prompt.context).toContain(row.brief);
    }
  });
});
