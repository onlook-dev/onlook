import { describe, expect, it } from 'bun:test';
import type { ServerBookState, ServerEntryState } from '@studio/events';
import { createRunFeedback, shownRunNotice, type RunNotice } from './runFeedback.js';

function entry(entryId: string, status: ServerEntryState['status']): ServerEntryState {
  return { entryId, status, folderName: entryId, ownership: 'agent-started', ports: [], everMeasuredLive: false };
}

function fixture() {
  let notice: RunNotice | undefined;
  let deadline: (() => void) | undefined;
  const feedback = createRunFeedback({
    publish: (next) => { notice = next; },
    schedule: (callback) => { deadline = callback; return () => { deadline = undefined; }; },
  });
  return { feedback, notice: () => notice, expire: () => { deadline?.(); }, hasDeadline: () => deadline !== undefined };
}

describe('app control feedback', () => {
  it('settles Start pressed during an already streaming agent turn', () => {
    const test = fixture();
    test.feedback.observeAgent(true);
    test.feedback.begin({ press: 'start' });
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observeAgent(false);
    expect(test.notice()).toBeUndefined();
    expect(test.hasDeadline()).toBe(false);
  });

  it('retains the active turn across completed attempts but clears it on teardown', () => {
    const test = fixture();
    test.feedback.observeAgent(true);
    test.feedback.begin({ press: 'start', entryIds: ['web'] });
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.feedback.begin({ press: 'start' });
    test.feedback.observe({ entries: [], pending: false });
    test.feedback.observeAgent(false);
    expect(test.notice()).toBe('start-failed');
    test.feedback.observeAgent(true);
    test.feedback.reset();
    test.feedback.begin({ press: 'start' });
    test.feedback.observe({ entries: [], pending: false });
    test.feedback.observeAgent(false);
    test.expire();
    expect(test.notice()).toBe('start-waiting');
  });

  it('ignores old unrelated inventory during an unscoped Start', () => {
    const test = fixture();
    const old = entry('old-api', 'stopped');
    test.feedback.begin({ press: 'start' }, false, [old]);
    test.feedback.observeAgent(true);
    test.feedback.observe({ entries: [old], pending: true });
    test.feedback.observe({ entries: [old, entry('web', 'running')], pending: false });
    test.feedback.observeAgent(false);
    test.expire();
    expect(test.notice()).toBeUndefined();
    expect(test.hasDeadline()).toBe(false);
  });

  it('waits for the agent turn through sequential requested server reports', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start', entryIds: ['web', 'api'] });
    test.feedback.observeAgent(true);
    test.feedback.observe({ entries: [entry('web', 'stopped'), entry('api', 'stopped')], pending: true });
    test.feedback.observe({ entries: [entry('web', 'starting'), entry('api', 'stopped')], pending: false });
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'stopped')], pending: false });
    expect(test.notice()).toBeUndefined();
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'starting')], pending: false });
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'running')], pending: false });
    expect(test.notice()).toBeUndefined();
  });

  it('keeps discovering servers until the unscoped Start turn finishes', () => {
    const test = fixture();
    const old = entry('web', 'stopped');
    test.feedback.begin({ press: 'start' }, false, [old]);
    test.feedback.observeAgent(true);
    test.feedback.observe({ entries: [entry('web', 'starting')], pending: false });
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'starting')], pending: false });
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'running'), { ...entry('external', 'running'), ownership: 'users-own' }], pending: false });
    test.feedback.observeAgent(false);
    expect(test.notice()).toBeUndefined();
  });

  it('waits for the complete saved setup, not the first sequential server', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' }, true);
    test.feedback.observeSetup('starting');
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observeSetup('failed');
    expect(test.notice()).toBe('start-failed');
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    expect(test.notice()).toBe('start-failed');
    test.feedback.observeSetup('running');
    expect(test.notice()).toBeUndefined();
  });

  it('reports saved setup failure before any server report', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' }, true);
    test.feedback.observeSetup('failed');
    expect(test.notice()).toBe('start-failed');
    test.expire();
    expect(test.notice()).toBe('start-failed');
  });

  it('requires every requested server to be present before Start succeeds', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start', entryIds: ['web', 'api'] });
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [entry('web', 'running'), entry('api', 'running')], pending: false });
    expect(test.notice()).toBeUndefined();
  });

  it('clears a chat-cancelled agent Start without hiding a saved Start or Stop', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.feedback.observe({ entries: [], pending: true });
    test.feedback.cancelAgentStart();
    test.feedback.observe({ entries: [], pending: false });
    test.expire();
    expect(test.notice()).toBeUndefined();
    test.feedback.begin({ press: 'start' }, true);
    test.feedback.cancelAgentStart();
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.begin({ press: 'stop' });
    test.feedback.cancelAgentStart();
    test.expire();
    expect(test.notice()).toBe('stop-waiting');
  });

  it('waits for saved Stop completion and the actual live ports to disappear', () => {
    const test = fixture();
    test.feedback.begin({ press: 'stop' }, true);
    test.feedback.observeSetup('stopping');
    test.feedback.observe({ entries: [], pending: false });
    test.expire();
    expect(test.notice()).toBe('stop-waiting');
    test.feedback.observeSetup('failed');
    expect(test.notice()).toBe('stop-failed');
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.feedback.observeSetup('idle');
    expect(test.notice()).toBe('stop-failed');
    test.feedback.observe({ entries: [], pending: false });
    expect(test.notice()).toBeUndefined();
  });
  it('shows persistent feedback when Start never receives a server response', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    expect(test.notice()).toBeUndefined();
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [], pending: true });
    expect(test.notice()).toBe('start-waiting');
  });

  it('reports a start that silently settles without a running app', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.feedback.observeAgent(true);
    test.feedback.observe({ entries: [], pending: true });
    test.feedback.observe({ entries: [], pending: false });
    test.feedback.observeAgent(false);
    expect(test.notice()).toBe('start-failed');
    expect(test.hasDeadline()).toBe(false);
  });

  it('reports Stop when the server remains up, then clears on measured recovery', () => {
    const test = fixture();
    test.feedback.begin({ press: 'stop' });
    test.expire();
    expect(test.notice()).toBe('stop-waiting');
    test.feedback.observe({ entries: [entry('web', 'stop-failed')], pending: false });
    expect(test.notice()).toBe('stop-failed');
    test.feedback.observe({ entries: [entry('web', 'stopped')], pending: false });
    expect(test.notice()).toBeUndefined();
  });

  it('clears a delayed start on success without treating an unrelated server as success', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start', entryIds: ['web'] });
    test.expire();
    test.feedback.observe({ entries: [entry('api', 'running'), entry('web', 'starting')], pending: false });
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    expect(test.notice()).toBeUndefined();
    expect(test.hasDeadline()).toBe(false);
  });

  it('does not flag healthy controls, user-owned servers, or a cancelled start', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.feedback.observeAgent(true);
    test.feedback.observe({ entries: [entry('web', 'running')], pending: false });
    test.feedback.observeAgent(false);
    test.expire();
    expect(test.notice()).toBeUndefined();
    test.feedback.begin({ press: 'start' });
    test.feedback.begin({ press: 'stop' });
    test.feedback.observe({ entries: [{ ...entry('external', 'running'), ownership: 'users-own' }], pending: false });
    test.expire();
    expect(test.notice()).toBeUndefined();
  });

  it('dismisses once, tracks late recovery, and resets on another press or teardown', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.expire();
    test.feedback.dismiss();
    test.feedback.observe({ entries: [], pending: true });
    test.feedback.observe({ entries: [], pending: false });
    expect(test.notice()).toBeUndefined();
    test.feedback.begin({ press: 'stop' });
    test.expire();
    expect(test.notice()).toBe('stop-waiting');
    test.feedback.reset();
    test.expire();
    expect(test.notice()).toBeUndefined();
  });

  it('does not call a partial multi-server start a success', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.feedback.observeAgent(true);
    const book: ServerBookState = { entries: [entry('web', 'running'), entry('api', 'starting')], pending: false };
    test.feedback.observe(book);
    test.expire();
    expect(test.notice()).toBe('start-waiting');
    test.feedback.observe({ ...book, entries: [entry('web', 'running'), entry('api', 'stopped')] });
    test.feedback.observeAgent(false);
    expect(test.notice()).toBe('start-failed');
  });

  it('keeps Stop feedback until a measured live port is actually gone', () => {
    const test = fixture();
    test.feedback.begin({ press: 'stop' });
    test.expire();
    test.feedback.observe({ entries: [{ ...entry('web', 'stopped'), ports: [
      { port: 3000, origin: 'http://localhost:3000', measured: 'live', everLive: true },
    ] }], pending: false });
    expect(test.notice()).toBe('stop-waiting');
    test.feedback.observe({ entries: [entry('web', 'stopped')], pending: false });
    expect(test.notice()).toBeUndefined();
  });

  it('never counts a user-owned app as a successful Start', () => {
    const test = fixture();
    test.feedback.begin({ press: 'start' });
    test.feedback.observe({ entries: [{ ...entry('external', 'running'), ownership: 'users-own' }], pending: false });
    test.expire();
    expect(test.notice()).toBe('start-waiting');
  });
});

describe('the run notice beside the setup failure card (ONL-2961)', () => {
  it('leaves a failed Start to the card while the card holds the failure, shown or asked about', () => {
    expect(shownRunNotice('start-failed', { isFailureCardHeld: true })).toBeUndefined();
  });

  it('still says a failed Start when the card holds nothing, and keeps every other notice', () => {
    expect(shownRunNotice('start-failed', { isFailureCardHeld: false })).toBe('start-failed');
    expect(shownRunNotice('start-waiting', { isFailureCardHeld: true })).toBe('start-waiting');
    expect(shownRunNotice('stop-failed', { isFailureCardHeld: true })).toBe('stop-failed');
    expect(shownRunNotice(undefined, { isFailureCardHeld: true })).toBeUndefined();
  });
});
