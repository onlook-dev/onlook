import { describe, expect, it } from 'bun:test';
import type { TelemetryProperties } from './events.js';
import { TurnSeenWatch, type ProjectLocator, type TurnSeenClock, type TurnSeenProperties } from './turn-seen.js';

function rig(locate: ProjectLocator = () => ({ windowFocused: false, projectTabActive: false })) {
  let now = 0;
  let idleMs = 0;
  let locked = false;
  let consent = new AbortController();
  let enabled = true;
  const timers = new Map<number, { at: number; run: () => void }>();
  let next = 0;
  const clock: TurnSeenClock = {
    now: () => now,
    setTimeout: (run, ms) => {
      timers.set(++next, { at: now + ms, run });
      return next;
    },
    clearTimeout: (handle) => timers.delete(handle as number),
  };
  const sent: TelemetryProperties<'agent_turn_seen'>[] = [];
  const watch = new TurnSeenWatch((properties) => sent.push(properties), clock, { idleMs: () => idleMs, screenLocked: () => locked }, () => enabled ? consent.signal : undefined);
  watch.setLocator(locate);
  const advance = (ms: number): void => {
    now += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at > now) continue;
      timers.delete(id);
      timer.run();
    }
  };
  return {
    watch, sent, advance, armed: () => timers.size,
    setIdle: (ms: number) => { idleMs = ms; },
    lock: () => { locked = true; },
    setConsent: (value: boolean) => { consent.abort(); consent = new AbortController(); enabled = value; },
  };
}

const turn = (turnId: string): TurnSeenProperties => ({
  project_id: 'p', workspace_instance_id: 'w', agent_session_id: 's', harness: 'claude', turn_id: turnId, origin: 'user', outcome: 'success',
});

const hidden = { window_focused_at_end: false, project_tab_active_at_end: false, system_idle_ms_at_end: 0, screen_locked_at_end: false };

describe('what Studio observed between a turn ending and its project being shown', () => {
  it('does not buffer turns observed while declined for a later consent grant', () => {
    const { watch, sent, setConsent, armed } = rig();
    setConsent(false);
    watch.ended('/projects/a', turn('declined'));
    expect(armed()).toBe(0);
    setConsent(true);
    watch.shown('/projects/a', 'click');
    expect(sent).toEqual([]);
    watch.ended('/projects/a', turn('accepted'));
    watch.shown('/projects/a', 'click');
    expect(sent.map((event) => event.turn_id)).toEqual(['accepted']);
  });

  it.each(['shown', 'quit', 'cap'] as const)('withdrawal clears buffered turns before reaccepting and resolving by %s', (resolution) => {
    const { watch, sent, setConsent, armed, advance } = rig();
    watch.ended('/projects/a', turn('old-grant'));
    expect(armed()).toBe(1);
    setConsent(false);
    expect(armed()).toBe(0);
    setConsent(true);
    if (resolution === 'shown') watch.shown('/projects/a', 'click');
    else if (resolution === 'quit') watch.quit();
    else advance(60 * 60_000);
    expect(sent).toEqual([]);
  });

  it('sends the focus, active tab, idle time and lock read at turn end, not a verdict on presence', () => {
    const { watch, sent, armed, setIdle, lock } = rig(() => ({ windowFocused: true, projectTabActive: true }));
    setIdle(2_400_000);
    lock();
    watch.ended('/projects/a', turn('t1'));
    expect(sent).toStrictEqual([{
      ...turn('t1'), resolution: 'visible_at_end', waited_ms: 0,
      window_focused_at_end: true, project_tab_active_at_end: true, system_idle_ms_at_end: 2_400_000, screen_locked_at_end: true,
    }]);
    expect(armed()).toBe(0);
  });

  it('waits while the window is focused on another project, and resolves when this one is shown, by what showed it', () => {
    const { watch, sent, advance, setIdle } = rig(() => ({ windowFocused: true, projectTabActive: false }));
    watch.ended('/projects/a', turn('t1'));
    advance(30_000);
    watch.shown('/projects/b', 'click');
    expect(sent).toEqual([]);
    setIdle(5_000);
    watch.shown('/projects/a', 'agent');
    expect(sent).toStrictEqual([{
      ...turn('t1'), ...hidden, window_focused_at_end: true,
      resolution: 'shown', waited_ms: 30_000, shown_by: 'agent', system_idle_ms_at_shown: 5_000,
    }]);
    watch.shown('/projects/a', 'window_focus');
    expect(sent).toHaveLength(1);
  });

  it('resolves every waiting turn of the project with its own wait', () => {
    const { watch, sent, advance } = rig();
    watch.ended('/projects/a', turn('t1'));
    advance(9 * 60_000);
    watch.ended('/projects/a', turn('t2'));
    advance(5_000);
    watch.shown('/projects/a', 'project_opened');
    expect(sent.map((s) => [s.turn_id, s.waited_ms])).toEqual([['t1', 9 * 60_000 + 5_000], ['t2', 5_000]]);
  });

  it('reports cap_reached after an hour, with one timer for the oldest turn', () => {
    const { watch, sent, advance, armed } = rig();
    watch.ended('/projects/a', turn('t1'));
    advance(30 * 60_000);
    watch.ended('/projects/b', turn('t2'));
    expect(armed()).toBe(1);
    advance(30 * 60_000);
    expect(sent.map((s) => [s.turn_id, s.resolution, s.waited_ms])).toEqual([['t1', 'cap_reached', 60 * 60_000]]);
    expect(armed()).toBe(1);
    watch.shown('/projects/b', 'click');
    expect(sent.map((s) => [s.turn_id, s.resolution])).toEqual([['t1', 'cap_reached'], ['t2', 'shown']]);
    expect(armed()).toBe(0);
  });

  it('sends waiting turns at quit, and a turn quit itself ends straight away', () => {
    const { watch, sent, advance, armed } = rig();
    watch.ended('/projects/a', turn('t1'));
    advance(1_000);
    watch.quit();
    watch.ended('/projects/a', turn('t2'));
    expect(sent.map((s) => [s.turn_id, s.resolution, s.waited_ms])).toEqual([['t1', 'quit', 1_000], ['t2', 'quit', 0]]);
    expect(armed()).toBe(0);
  });
});
