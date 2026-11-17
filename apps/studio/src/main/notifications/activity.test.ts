import { expect, test } from 'bun:test';
import type { StudioEvent } from '@studio/events';
import { BackgroundActivity, backgroundDestination } from './activity.js';

const event = (fields: object, eventId = 'e1'): StudioEvent => ({ sessionId: 's1', eventId, seq: 1, ts: 1000, cwd: '/project', ...fields }) as StudioEvent;

test('one outcome per event, no stopped notification, and failed endings stay distinct', () => {
  const activity = new BackgroundActivity();
  const finished = event({ type: 'turn.ended', turnId: 't1', stopReason: 'success' });
  expect(activity.observe(finished)).toEqual({ kind: 'finished' });
  expect(activity.observe(finished)).toEqual({});
  expect(activity.observe(event({ type: 'turn.ended', turnId: 't2', stopReason: 'interrupted' }, 'e2'))).toEqual({});
  expect(activity.observe(event({ type: 'turn.ended', turnId: 't3', stopReason: 'failed' }, 'e3'))).toEqual({ kind: 'failed' });
});

test('questions and approvals retain a count-only wait duration until answered', () => {
  const activity = new BackgroundActivity();
  expect(activity.observe(event({ type: 'permission.requested', requestId: 'r1', toolCallId: 'tool1', options: [], questions: [{ question: 'Private question', header: '', options: [{ label: 'Private option', description: '' }] }] }))).toEqual({ kind: 'question' });
  expect(activity.observe(event({ type: 'permission.resolved', requestId: 'r1', toolCallId: 'tool1', outcome: 'allow_once', ts: 2000 }, 'e2'))).toEqual({ waitedMs: 1000, waitingKind: 'question' });
});

test('focus selects exactly one delivery destination', () => {
  expect(backgroundDestination(false, true)).toBe('notification');
  expect(backgroundDestination(false, false)).toBe('notification');
  expect(backgroundDestination(true, false)).toBe('toast');
  expect(backgroundDestination(true, true)).toBeUndefined();
});
