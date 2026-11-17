import { describe, expect, it } from 'bun:test';
import { agentTabStatus, statusToRecord, type AgentActivity } from './status.js';

describe('statusToRecord', () => {
  it('drops `done` for the tab the user is on', () => {
    expect(statusToRecord('done', true)).toBeUndefined();
    expect(statusToRecord('done', false)).toBe('done');
  });

  // Conditions, not notifications: looking at a tab does not answer its question.
  it('records `waiting` and `working` whatever is forward', () => {
    expect(statusToRecord('waiting', true)).toBe('waiting');
    expect(statusToRecord('working', true)).toBe('working');
  });

  it('carries a clear through', () => {
    expect(statusToRecord(undefined, true)).toBeUndefined();
    expect(statusToRecord(undefined, false)).toBeUndefined();
  });
});

const idle: AgentActivity = { isStreaming: false, needsAttention: false, turnEnding: false };
const streaming: AgentActivity = { ...idle, isStreaming: true };

describe('agentTabStatus (ONL-2525)', () => {
  it('reads `waiting` while the agent holds a request for the user', () => {
    expect(agentTabStatus('working', { ...streaming, needsAttention: true })).toBe('waiting');
    expect(agentTabStatus(undefined, { ...idle, needsAttention: true })).toBe('waiting');
  });

  it('returns to `working` once the request is answered', () => {
    expect(agentTabStatus('waiting', streaming)).toBe('working');
  });

  it('leaves `waiting` for `done` when the turn is stopped or the session ends, never through `working`', () => {
    expect(agentTabStatus('waiting', { ...streaming, turnEnding: true })).toBe('done');
    expect(agentTabStatus('waiting', idle)).toBe('done');
  });

  it('reads `done` when a turn ends', () => {
    expect(agentTabStatus('working', idle)).toBe('done');
  });

  it('raises nothing for a session that has not run a turn', () => {
    expect(agentTabStatus(undefined, idle)).toBeUndefined();
  });
});
