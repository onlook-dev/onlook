import { describe, expect, it } from 'bun:test';
import { foldSessionState, type StudioEvent, type TranscriptItem } from '@studio/events';
import { newChatRefusalFor } from './newChatRefusal.js';

const WORKSPACE = {
  sourceRepoName: 'site',
  workspaceName: 'w',
  branchName: 'studio/w',
  baseBranch: 'main',
};

function freshSessionEvents(): StudioEvent[] {
  const base = (seq: number) => ({ sessionId: 's1', cwd: '/tmp/ws', eventId: `e-${String(seq)}`, seq, ts: 0 });
  return [
    { type: 'session.started', model: 'sonnet', ...base(0) },
    { type: 'session.welcome', workspace: WORKSPACE, ...base(1) },
  ] as StudioEvent[];
}

const welcome = {
  kind: 'welcome',
  id: 'w',
  workspace: WORKSPACE,
} as TranscriptItem;
const user = { kind: 'user', id: 'u', text: 'hi' } as TranscriptItem;

describe('which refusal the new-chat control carries (ONL-2198)', () => {
  it('refuses a chat that only has its welcome row — that is not a conversation', () => {
    expect(newChatRefusalFor({ isStreaming: false, items: [welcome] })).toBe('empty');
  });

  it('refuses an entirely empty chat', () => {
    expect(newChatRefusalFor({ isStreaming: false, items: [] })).toBe('empty');
  });

  it('acts once the user has actually said something', () => {
    expect(newChatRefusalFor({ isStreaming: false, items: [welcome, user] })).toBeUndefined();
  });

  it('reads a real fresh session through the projector, not a hand-built item', () => {
    const fresh = foldSessionState(freshSessionEvents());

    expect(fresh.items).not.toHaveLength(0);
    expect(fresh.items.some((item) => item.kind === 'user')).toBe(false);
    expect(newChatRefusalFor({ isStreaming: false, items: fresh.items })).toBe('empty');
  });

  it('acts once a real user row has been projected into the same session', () => {
    const said = foldSessionState([
      ...freshSessionEvents(),
      {
        type: 'message.user',
        turnId: 't1',
        text: 'make the hero cobalt',
        origin: 'user',
        sessionId: 's1',
        cwd: '/tmp/ws',
        eventId: 'e-2',
        seq: 2,
        ts: 0,
      },
    ] as StudioEvent[]);

    expect(newChatRefusalFor({ isStreaming: false, items: said.items })).toBeUndefined();
  });

  it('refuses a chat whose only prompt Studio sent on the user’s behalf', () => {
    const pushed = foldSessionState([
      ...freshSessionEvents(),
      {
        type: 'message.user',
        turnId: 't1',
        text: 'start the dev server',
        origin: 'studio',
        sessionId: 's1',
        cwd: '/tmp/ws',
        eventId: 'e-2',
        seq: 2,
        ts: 0,
      },
    ] as StudioEvent[]);

    // The row renders; it is just not the user's conversation.
    expect(pushed.items.some((item) => item.kind === 'user')).toBe(true);
    expect(newChatRefusalFor({ isStreaming: false, items: pushed.items })).toBe('empty');
  });

  it('busy wins over empty: a running turn is the reason the user needs', () => {
    expect(newChatRefusalFor({ isStreaming: true, items: [] })).toBe('busy');
    expect(newChatRefusalFor({ isStreaming: true, items: [welcome, user] })).toBe('busy');
  });
});
