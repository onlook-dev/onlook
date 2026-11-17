import { expect, test } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { TurnNotifications } from './turn-notifications.js';

function setup() {
  const delivered: StudioEvent[] = [];
  const session = { isTurnLive: true };
  const notifications = new TurnNotifications(event => delivered.push(event));
  const update = (live: boolean, turnEnding = false) => {
    session.isTurnLive = live;
    notifications.update(session, { isTurnLive: live, isStreaming: live, midTurn: 'steer', turnEnding });
  };
  const ended = (turnId: string, stopReason = 'completed'): StudioEvent => ({ type: 'turn.ended', turnId, stopReason, eventId: turnId, sessionId: 'session', ts: 1, seq: 1 });
  return { delivered, session, notifications, update, ended };
}

test('primitive completion waits across an unsolicited continuation until thread idle', () => {
  const { delivered, session, notifications, update, ended } = setup();
  notifications.observe(ended('first'), session);
  expect(delivered).toEqual([]);
  const started: StudioEvent = { type: 'turn.started', turnId: 'continuation', eventId: 'started', sessionId: 'session', ts: 2, seq: 2 };
  notifications.observe(started, session);
  notifications.observe(ended('continuation'), session);
  expect(delivered).toEqual([started]);
  update(false);
  expect(delivered).toEqual([started, ended('continuation')]);
  update(false);
  expect(delivered).toHaveLength(2);
});

test('idle before a terminal event still delivers the ordinary ending', () => {
  const { delivered, session, notifications, update, ended } = setup();
  update(false);
  notifications.observe(ended('ordinary'), session);
  expect(delivered).toEqual([ended('ordinary')]);
});

test('a Claude terminal event before idle delivers exactly once on settlement', () => {
  const { delivered, session, notifications, update, ended } = setup();
  notifications.observe(ended('claude', 'end_turn'), session);
  expect(delivered).toEqual([]);
  update(false);
  expect(delivered).toEqual([ended('claude', 'end_turn')]);
});

test('Stop in a gap discards its terminal candidate and delayed completion', () => {
  const { delivered, session, notifications, update, ended } = setup();
  notifications.observe(ended('first'), session);
  notifications.cancel(session);
  update(true);
  notifications.observe(ended('late'), session);
  update(false);
  notifications.observe(ended('aborted', 'interrupted'), session);
  expect(delivered).toEqual([ended('aborted', 'interrupted')]);
  update(true);
  notifications.observe(ended('next'), session);
  update(false);
  expect(delivered).toEqual([ended('aborted', 'interrupted'), ended('next')]);
});

test('closing a session discards a pending completion', () => {
  const { delivered, session, notifications, update, ended } = setup();
  notifications.observe(ended('first'), session);
  update(false, true);
  expect(delivered).toEqual([]);
});

test('abnormal settlement discards buffered success but retains a subsequent failure', () => {
  const { delivered, session, notifications, update, ended } = setup();
  notifications.observe(ended('first'), session);
  update(false, true);
  notifications.observe(ended('failure', 'failed'), session);
  expect(delivered).toEqual([ended('failure', 'failed')]);
});

test('failure and attention events retain their delivery semantics', () => {
  const { delivered, session, notifications, update, ended } = setup();
  const question: StudioEvent = { type: 'permission.requested', requestId: 'request', toolCallId: 'tool', toolName: 'AskUserQuestion', options: [], eventId: 'question', sessionId: 'session', ts: 1, seq: 1 };
  notifications.observe(question, session);
  expect(delivered).toEqual([question]);
  update(false);
  notifications.observe(ended('failed', 'failed'), session);
  expect(delivered).toEqual([question, ended('failed', 'failed')]);
});

test('one live session cannot flush another session completion', () => {
  const { delivered, session, notifications, update, ended } = setup();
  const other = { isTurnLive: true };
  notifications.observe(ended('other'), other);
  notifications.observe(ended('first'), session);
  update(false);
  expect(delivered).toEqual([ended('first')]);
});
