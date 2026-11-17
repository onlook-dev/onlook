import { describe, expect, test } from 'bun:test';
import { labelFor } from './GitStatusPill.js';
import { STUB_STRINGS } from './fixtures.js';
import { workingAsFor, type GitPillState } from './state.js';

const pr = { number: 155, url: 'https://github.com/o/r/pull/155' };

describe('the working label names what the press started (ONL-2313)', () => {
  test('Upload picked from a failing-checks pill works as Upload, not Fix Checks', () => {
    const state: GitPillState = { id: 'fix-checks', pr, mode: 'working', workingAs: 'upload-changes' };
    expect(labelFor(state, STUB_STRINGS, false, false)).toBe(STUB_STRINGS.workingLabel['upload-changes']);
  });

  test('the body press keeps the state’s own working label', () => {
    const state: GitPillState = { id: 'fix-checks', pr, mode: 'working' };
    expect(labelFor(state, STUB_STRINGS, false, false)).toBe(STUB_STRINGS.workingLabel['fix-checks']);
  });

  test('a pick maps to the label it works as', () => {
    expect(workingAsFor('upload-changes')).toBe('upload-changes');
    expect(workingAsFor('merge')).toBe('ready-to-merge');
    expect(workingAsFor('open-in-browser')).toBeUndefined();
    expect(workingAsFor(undefined)).toBeUndefined();
  });
});
