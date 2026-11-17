import { describe, expect, it } from 'bun:test';
import {
  beginAttempt,
  dismissConfirm,
  idleConfirm,
  settleConfirm,
  startAttempt,
  type ConfirmState,
} from './newChatConfirm.js';

describe('the new-chat confirm across a dismissal (ONL-2198)', () => {
  it('ignores a refusal that belongs to an attempt the user already dismissed', () => {
    const started = startAttempt(idleConfirm());
    const inFlight = started.attempt;

    const dismissed = dismissConfirm(started);
    const late = settleConfirm(dismissed, inFlight, 'refused');

    expect(late.applied).toBe(false);
    expect(late.next).toEqual(dismissed);
    expect(late.next.status).toBe('idle');
    expect(late.close).toBe(false);
  });

  it('reopens on the question, not on the discarded attempt’s failure', () => {
    const started = startAttempt(idleConfirm());
    const dismissed = dismissConfirm(started);
    const late = settleConfirm(dismissed, started.attempt, 'refused');

    expect(late.next.status).toBe('idle');
    expect(startAttempt(late.next).status).toBe('starting');
  });

  it('never closes a newer attempt with an older acceptance', () => {
    const first = startAttempt(idleConfirm());
    const reopened = startAttempt(dismissConfirm(first));

    const stale = settleConfirm(reopened, first.attempt, 'accepted');

    expect(stale.applied).toBe(false);
    expect(stale.close).toBe(false);
    expect(stale.next.status).toBe('starting');
  });

  it('still fails the attempt that is actually current', () => {
    const started = startAttempt(idleConfirm());

    const settled = settleConfirm(started, started.attempt, 'refused');

    expect(settled.applied).toBe(true);
    expect(settled.next.status).toBe('failed');
    expect(settled.close).toBe(false);
  });

  it('closes on the acceptance that belongs to the current attempt', () => {
    const started = startAttempt(idleConfirm());

    const settled = settleConfirm(started, started.attempt, 'accepted');

    expect(settled.applied).toBe(true);
    expect(settled.close).toBe(true);
    expect(settled.next.status).toBe('idle');
  });

  it('drives the dialog the way the dialog drives it: live state in, settled attempt alongside', () => {
    let live: ConfirmState = idleConfirm();
    const started = startAttempt(live);
    live = started;

    live = dismissConfirm(live);
    const late = settleConfirm(live, started.attempt, 'refused');
    expect(late.applied).toBe(false);

    const reopened = startAttempt(live);
    live = reopened;
    const answered = settleConfirm(live, reopened.attempt, 'refused');
    expect(answered.applied).toBe(true);
    expect(answered.next.status).toBe('failed');
  });

  it('a second press while the first is in flight starts nothing', () => {
    const first = beginAttempt(idleConfirm());
    expect(first.started).toBe(true);

    const second = beginAttempt(first.next);

    expect(second.started).toBe(false);
    expect(second.next).toBe(first.next);
    expect(second.next.attempt).toBe(first.next.attempt);
    expect(settleConfirm(second.next, first.next.attempt, 'accepted').applied).toBe(true);
  });

  it('a press after a failure is a new attempt, not a blocked one', () => {
    const first = beginAttempt(idleConfirm());
    const failed = settleConfirm(first.next, first.next.attempt, 'refused');

    const retry = beginAttempt(failed.next);

    expect(retry.started).toBe(true);
    expect(retry.next.attempt).toBe(first.next.attempt + 1);
  });

  it('a second dismissal cannot resurrect the first attempt', () => {
    let state: ConfirmState = startAttempt(idleConfirm());
    const oldest = state.attempt;
    state = dismissConfirm(state);
    state = startAttempt(state);
    state = dismissConfirm(state);

    expect(settleConfirm(state, oldest, 'refused').next.status).toBe('idle');
  });
});
