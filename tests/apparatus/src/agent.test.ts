import { describe, expect, it } from 'bun:test';
import type { AgentSnapshot, ProjectCreateState, StudioEvent, WorkspaceCreated } from '@studio/events';
import { setupSettled, toolCalls, turnVerdict } from './agent.js';

const base = (seq: number) => ({ sessionId: 's', eventId: `e${String(seq)}`, seq, ts: seq });
const workspace = (comfort: WorkspaceCreated['comfort']) => ({ comfort }) as WorkspaceCreated;

describe('setupSettled', () => {
  it('reads `ready` as the end of a design cut only; every other cut goes on to install and start', () => {
    expect(setupSettled({ kind: 'ready', workspace: workspace('design') })).toBe(true);
    expect(setupSettled({ kind: 'ready', workspace: workspace('experiment') })).toBe(false);
    expect(setupSettled({ kind: 'starting', workspace: workspace('experiment') })).toBe(false);
    expect(setupSettled({ kind: 'live', workspace: workspace('experiment') })).toBe(true);
    expect(setupSettled({ kind: 'failed', sourceRepoName: 'x', phase: 'installing' } as ProjectCreateState)).toBe(true);
    expect(setupSettled(null)).toBe(false);
  });
});

describe('turnVerdict', () => {
  const read = (events: StudioEvent[], isStreaming: boolean, status: AgentSnapshot['connection']['status'] = 'ok') => ({
    events,
    isStreaming,
    connection: { status },
  });
  const started: StudioEvent = { ...base(1), type: 'turn.started', turnId: 't' };
  const ended: StudioEvent = { ...base(9), type: 'turn.ended', turnId: 't' };
  const error: StudioEvent = { ...base(5), type: 'session.error', message: 'boom' };

  it('ends once a turn has ended and nothing is streaming', () => {
    expect(turnVerdict(read([], false)).kind).toBe('running');
    expect(turnVerdict(read([started], true)).kind).toBe('running');
    expect(turnVerdict(read([started, ended], true)).kind).toBe('running');
    expect(turnVerdict(read([started, ended], false))).toEqual({ kind: 'ended', ended: ended as never });
  });

  it('fails instead of waiting when the session cannot end a turn, but not on an error mid-stream', () => {
    expect(turnVerdict(read([started, error], true)).kind).toBe('running');
    expect(turnVerdict(read([started, error], false)).kind).toBe('failed');
    expect(turnVerdict(read([], false, 'unauthenticated')).kind).toBe('failed');
  });
});

describe('toolCalls', () => {
  it('upserts by id: an end with no start counts, and a repeated start does not reopen a settled call', () => {
    const calls = toolCalls([
      { ...base(1), type: 'tool.end', toolCallId: 'a', status: 'completed', result: 'ok' },
      { ...base(2), type: 'tool.start', toolCallId: 'a', name: 'add_frame', kind: 'other', title: 'Add', status: 'pending', input: { url: 'u' } },
      { ...base(3), type: 'tool.start', toolCallId: 'b', name: 'read', kind: 'read', title: 'Read', status: 'in_progress' },
    ]);
    expect(calls).toEqual([
      { id: 'a', name: 'add_frame', status: 'completed', result: 'ok', input: { url: 'u' } },
      { id: 'b', name: 'read', status: 'in_progress' },
    ]);
  });
});
