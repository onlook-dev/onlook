import { describe, expect, test } from 'bun:test';
import { zzStrings } from '../testing.js';
import { suffixFor } from './RowSentence.js';
import type { ToolRowsStrings } from './types.js';

const STRINGS: ToolRowsStrings = {
  failedSuffix: ' — failed',
  canceledSuffix: ' — stopped',
  commandCount: '{count} commands',
  commandsVerb: { running: 'Running {target}', done: 'Ran {target}' },
  overflow: '+{count} more',
  lineCount: '{count} lines',
};

describe('the row outcome word', () => {
  test('a canceled row says stopped, and never says failed', () => {
    expect(suffixFor('canceled', STRINGS)).toEqual({ kind: 'canceled', text: STRINGS.canceledSuffix });
  });

  test('a failed row says failed only; a completed row says nothing', () => {
    expect(suffixFor('error', STRINGS)).toEqual({ kind: 'failed', text: STRINGS.failedSuffix });
    expect(suffixFor('completed', STRINGS)).toBeUndefined();
  });

  test('the word comes from the strings bag', () => {
    expect(suffixFor('canceled', zzStrings(STRINGS))?.text).toBe('ZZ');
  });
});
