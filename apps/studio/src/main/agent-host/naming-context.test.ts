import { describe, expect, it } from 'bun:test';
import { RENAME_PROJECT_TOOL_NAME, type StudioEvent } from '@studio/events';
import { renameInstruction } from '../../instructions/naming.js';
import { joinNamingContext, namingContextFor } from './naming-context.js';

const base = { sessionId: 's1', cwd: '/w', eventId: 'e', seq: 1, ts: 0 };

function welcome(): StudioEvent {
  return {
    ...base,
    type: 'session.welcome',
    workspace: { sourceRepoName: 'app', workspaceName: 'teal-skylark', branchName: 'x/teal-skylark', baseBranch: 'main' },
  } as StudioEvent;
}

function userMessage(origin?: 'user' | 'studio'): StudioEvent {
  return { ...base, type: 'message.user', turnId: 't1', text: 'hi', ...(origin ? { origin } : {}) } as StudioEvent;
}

const unnamed = {};

describe('namingContextFor', () => {
  it('a provisional copy name is eligible only until the first user message', () => {
    const provisional = { displayName: 'Landing copy', displayNameSource: 'provisional' as const };
    expect(namingContextFor([], provisional)).toBe(renameInstruction());
    expect(namingContextFor([welcome(), userMessage('studio')], provisional)).toBe(renameInstruction());
    expect(namingContextFor([welcome(), userMessage('user')], provisional)).toBeUndefined();
    expect(namingContextFor([], { displayName: 'My copy', displayNameSource: 'user' })).toBeUndefined();
  });

  it('turn one of a brand-new project carries the instruction', () => {
    expect(namingContextFor([welcome()], unnamed)).toBe(renameInstruction());
    expect(namingContextFor([], unnamed)).toBe(renameInstruction());
  });

  it("Studio's own Start intent before the user's first prompt does not consume it", () => {
    expect(namingContextFor([welcome(), userMessage('studio')], unnamed)).toBe(renameInstruction());
  });

  it('a later user prompt carries nothing', () => {
    expect(namingContextFor([welcome(), userMessage('user')], unnamed)).toBeUndefined();
    expect(namingContextFor([welcome(), userMessage('studio'), userMessage('user')], unnamed)).toBeUndefined();
  });

  it('a restored conversation carries nothing — a row older than origin reads as the user', () => {
    expect(namingContextFor([welcome(), userMessage()], unnamed)).toBeUndefined();
  });

  it('a project already named, by either hand or before the source existed, carries nothing; an unknown record carries nothing', () => {
    expect(namingContextFor([], { displayNameSource: 'user' })).toBeUndefined();
    expect(namingContextFor([], { displayNameSource: 'agent' })).toBeUndefined();
    expect(namingContextFor([], { displayName: 'Mine' })).toBeUndefined();
    expect(namingContextFor([], undefined)).toBeUndefined();
  });

  it('names the registered rename tool', () => {
    expect(renameInstruction()).toContain(`\`${RENAME_PROJECT_TOOL_NAME}\``);
  });
});

describe('joinNamingContext', () => {
  it('joins after the selection context, and yields undefined when both are absent', () => {
    expect(joinNamingContext(undefined, undefined)).toBeUndefined();
    expect(joinNamingContext('sel', undefined)).toBe('sel');
    expect(joinNamingContext(undefined, 'name')).toBe('name');
    expect(joinNamingContext('sel', 'name')).toBe('sel\n\nname');
  });
});
