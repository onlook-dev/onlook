import { describe, expect, it } from 'bun:test';
import { CODE_REFUSAL_CODES } from '@studio/events';
import { en } from '@studio/i18n/strings';
import { codeRefusalKey } from './refusalCopy.js';

describe('the file bridge’s refusals', () => {
  it('words every code the channels can answer with', () => {
    for (const code of CODE_REFUSAL_CODES) {
      expect(en[codeRefusalKey(code)]).toBeString();
    }
  });

  it('gives each code its own sentence, so a refusal names what stopped it', () => {
    const sentences = CODE_REFUSAL_CODES.map((code) => en[codeRefusalKey(code)]);

    expect(new Set(sentences).size).toBe(CODE_REFUSAL_CODES.length);
  });
});
