import { describe, expect, test } from 'bun:test';
import type { TranscriptItem } from '@studio/events';
import { isChatUntouched } from './ChatWelcome.js';

const landing: TranscriptItem = { kind: 'welcome', id: 'w1', workspace: { sourceRepoName: 'site', workspaceName: 'Untitled', branchName: 'untitled', baseBranch: 'main' } };
const said: TranscriptItem = { kind: 'user', id: 'u1', text: 'Map out a user flow' };

describe('the blank chat welcome stands in for the transcript until anything is said (ONL-2960)', () => {
  test('shows on an empty chat and on one holding only the new project’s landing row', () => {
    expect(isChatUntouched({ items: [], isStreaming: false })).toBe(true);
    expect(isChatUntouched({ items: [landing], isStreaming: false })).toBe(true);
  });

  test('goes once the person has said something, or while a turn runs', () => {
    expect(isChatUntouched({ items: [landing, said], isStreaming: false })).toBe(false);
    expect(isChatUntouched({ items: [landing], isStreaming: true })).toBe(false);
  });
});
