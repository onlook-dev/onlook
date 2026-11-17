import { describe, expect, it } from 'bun:test';
import { createTabIdle } from './idle.js';

function rig() {
  const calls: string[] = [];
  const state = { eligible: true, refuses: false };
  const idle = createTabIdle({
    canSleep: () => state.eligible,
    frames: async (discarded) => { calls.push(discarded ? 'discard' : 'reload'); },
    lifecycle: async (value) => {
      calls.push(value);
      if (state.refuses && value === 'frozen') throw new Error('CDP refused');
    },
    fallback: () => { calls.push('teardown'); },
  });
  return { idle, calls, state };
}

describe('idle project shell (ONL-2894)', () => {
  it('discards guests before freezing and resumes before remounting them', async () => {
    const subject = rig();
    await subject.idle.sleep();
    expect(subject.calls).toEqual(['discard', 'frozen']);
    await subject.idle.wake();
    expect(subject.calls).toEqual(['discard', 'frozen', 'active', 'reload']);
  });

  it('falls back to teardown when CDP refuses a quiet tab', async () => {
    const subject = rig();
    subject.state.refuses = true;
    await subject.idle.sleep();
    expect(subject.calls).toEqual(['discard', 'frozen', 'teardown']);
  });

  it('refuses all work on a busy, active, or closed tab', async () => {
    const subject = rig();
    subject.state.eligible = false;
    await subject.idle.sleep();
    expect(subject.calls).toEqual([]);
  });

  it('cancels a freeze when activation overtakes guest discard', async () => {
    let acknowledge!: () => void;
    const calls: string[] = [];
    const idle = createTabIdle({
      canSleep: () => true,
      frames: (discarded) => {
        calls.push(discarded ? 'discard' : 'reload');
        return discarded ? new Promise<void>(resolve => { acknowledge = resolve; }) : Promise.resolve();
      },
      lifecycle: async (value) => { calls.push(value); },
      fallback: () => { calls.push('teardown'); },
    });
    const sleeping = idle.sleep();
    await Promise.resolve();
    const waking = idle.wake();
    acknowledge();
    await Promise.all([sleeping, waking]);
    expect(calls).toEqual(['discard', 'reload']);
  });

  it('thaws a freeze already in flight before activation completes', async () => {
    let freeze!: () => void;
    const calls: string[] = [];
    const idle = createTabIdle({
      canSleep: () => true,
      frames: async (discarded) => { calls.push(discarded ? 'discard' : 'reload'); },
      lifecycle: async (value) => {
        calls.push(value);
        if (value === 'frozen') await new Promise<void>(resolve => { freeze = resolve; });
      },
      fallback: () => { calls.push('teardown'); },
    });
    const sleeping = idle.sleep();
    await Promise.resolve();
    await Promise.resolve();
    const waking = idle.wake();
    freeze();
    await Promise.all([sleeping, waking]);
    expect(calls).toEqual(['discard', 'frozen', 'active', 'reload']);
  });

  it('never takes the destructive fallback after the tab becomes busy', async () => {
    const subject = rig();
    subject.state.refuses = true;
    const sleeping = subject.idle.sleep();
    await Promise.resolve();
    subject.state.eligible = false;
    await sleeping;
    expect(subject.calls).not.toContain('teardown');
    expect(subject.calls.at(-1)).toBe('reload');
  });
});
