import type { CodexSetupState } from '@studio/events';
import { describe, expect, it } from 'bun:test';

import { CodexSetupMachine, codexDeviceAuthCommand } from './machine.js';

function make(): { machine: CodexSetupMachine; emitted: CodexSetupState[] } {
  const emitted: CodexSetupState[] = [];
  const machine = new CodexSetupMachine({ emit: (state) => emitted.push(state) });
  return { machine, emitted };
}

describe('CodexSetupMachine', () => {
  it('revokes ready and forgets the vanished installation command', () => {
    const { machine, emitted } = make();
    machine.binaryResolved('/cache/codex');
    machine.ready({ email: 'designer@example.test', plan: 'plus' });
    machine.installationLost();
    expect(machine.current()).toEqual({ status: 'idle' });
    expect(machine.isReady()).toBe(false);
    expect(emitted.at(-1)).toEqual({ status: 'idle' });
    machine.signedOut();
    expect(machine.current()).toEqual({ status: 'signed-out' });
  });

  it('never revokes setup owned by another phase', () => {
    const { machine, emitted } = make();
    for (const drive of [() => machine.signingIn(), () => machine.checking(), () => machine.validating()]) {
      drive();
      const before = emitted.length;
      const state = machine.current();
      machine.installationLost();
      expect(machine.current()).toBe(state);
      expect(emitted).toHaveLength(before);
    }
  });

  it('replaces every verdict payload rather than carrying facts into another phase', () => {
    const cases: Array<{ drive: (machine: CodexSetupMachine) => void; expected: CodexSetupState }> = [
      { drive: (machine) => machine.checking(), expected: { status: 'checking' } },
      { drive: (machine) => machine.downloading('fetching'), expected: { status: 'downloading', message: 'fetching' } },
      { drive: (machine) => machine.downloading(), expected: { status: 'downloading' } },
      { drive: (machine) => machine.validating(), expected: { status: 'validating' } },
      { drive: (machine) => machine.ready({ email: 'designer@example.test', plan: 'plus' }), expected: { status: 'ready', email: 'designer@example.test', plan: 'plus' } },
      { drive: (machine) => machine.ready(), expected: { status: 'ready' } },
      { drive: (machine) => machine.failed('offline'), expected: { status: 'failed', message: 'offline' } },
      { drive: (machine) => machine.failed(), expected: { status: 'failed' } },
      { drive: (machine) => machine.broken('unusable'), expected: { status: 'broken', message: 'unusable' } },
      { drive: (machine) => machine.broken(), expected: { status: 'broken' } },
      { drive: (machine) => machine.outdated('old'), expected: { status: 'outdated', message: 'old' } },
      { drive: (machine) => machine.unsupported('platform'), expected: { status: 'unsupported', message: 'platform' } },
      { drive: (machine) => machine.signedOut('sign in'), expected: { status: 'signed-out', message: 'sign in', command: "'/cache/agent bin' login --device-auth" } },
      { drive: (machine) => machine.signedOut(), expected: { status: 'signed-out', command: "'/cache/agent bin' login --device-auth" } },
      { drive: (machine) => machine.signingIn('https://example.test/auth'), expected: { status: 'signing-in', authUrl: 'https://example.test/auth' } },
      { drive: (machine) => machine.signingIn(), expected: { status: 'signing-in' } },
    ];
    for (const item of cases) {
      const { machine, emitted } = make();
      expect(machine.current()).toStrictEqual({ status: 'idle' });
      machine.binaryResolved('/cache/agent bin');
      machine.ready({ email: 'old@example.test', plan: 'old' });
      machine.downloading('old download');
      machine.progress(25, 100);
      machine.signingIn('https://example.test/old');
      const before = emitted.length;
      item.drive(machine);
      expect(machine.current()).toStrictEqual(item.expected);
      expect(emitted.slice(before)).toStrictEqual([item.expected]);
    }
  });

  it('ignores progress outside downloading and preserves the resolved command through every phase', () => {
    const { machine, emitted } = make();
    const phases = [
      () => machine.checking(),
      () => machine.validating(),
      () => machine.ready(),
      () => machine.failed(),
      () => machine.broken(),
      () => machine.outdated('old'),
      () => machine.unsupported('platform'),
      () => machine.signingIn('https://example.test/auth'),
      () => machine.signedOut(),
    ];
    machine.binaryResolved("/it's/agent bin");
    for (const phase of phases) {
      phase();
      const before = emitted.length;
      machine.progress(90, 100);
      expect(emitted).toHaveLength(before);
    }
    expect(machine.current()).toStrictEqual({ status: 'signed-out', command: "'/it'\\''s/agent bin' login --device-auth" });
  });

  it('keeps the four non-working states distinct, each with its own message', () => {
    const cases = [
      { drive: (m: CodexSetupMachine) => m.failed('half a download'), status: 'failed', message: 'half a download' },
      { drive: (m: CodexSetupMachine) => m.broken('will not start'), status: 'broken', message: 'will not start' },
      { drive: (m: CodexSetupMachine) => m.signedOut('nobody home'), status: 'signed-out', message: 'nobody home' },
      { drive: (m: CodexSetupMachine) => m.unsupported('not here'), status: 'unsupported', message: 'not here' },
    ];
    for (const item of cases) {
      const { machine } = make();
      item.drive(machine);
      expect(machine.current().status).toBe(item.status as CodexSetupState['status']);
      expect(machine.current().message).toBe(item.message);
    }
  });

  it('is ready only when it is ready', () => {
    const { machine } = make();
    expect(machine.isReady()).toBe(false);
    machine.checking();
    machine.downloading();
    machine.validating();
    expect(machine.isReady()).toBe(false);
    machine.ready();
    expect(machine.isReady()).toBe(true);
    machine.signedOut();
    expect(machine.isReady()).toBe(false);
  });

  it('lets progress refine a download and never anything else', () => {
    const { machine, emitted } = make();
    machine.downloading();
    machine.progress(50, 100);
    expect(machine.current()).toEqual({ status: 'downloading', percent: 50 });

    machine.ready();
    const after = emitted.length;
    machine.progress(90, 100);
    expect(machine.current().status).toBe('ready');
    expect(emitted.length).toBe(after);
  });

  it('reports whole clamped percent, and none at all without a total', () => {
    const { machine } = make();
    machine.downloading();

    machine.progress(1, 3);
    expect(machine.current().percent).toBe(33);

    machine.progress(999, 100);
    expect(machine.current().percent).toBe(100);

    const { machine: second } = make();
    second.downloading();
    second.progress(500);
    expect(second.current().percent).toBeUndefined();
    second.progress(500, 0);
    expect(second.current().percent).toBeUndefined();
  });

  it('emits once per transition, and not at all for a repeated percent', () => {
    const { machine, emitted } = make();
    machine.checking();
    machine.downloading();
    machine.validating();
    machine.ready();
    expect(emitted.map((state) => state.status)).toEqual([
      'checking',
      'downloading',
      'validating',
      'ready',
    ]);

    const { machine: second, emitted: seen } = make();
    second.downloading();
    const before = seen.length;
    second.progress(1000, 10_000);
    second.progress(1001, 10_000);
    second.progress(1002, 10_000);
    expect(seen.length).toBe(before + 1);
    second.progress(2000, 10_000);
    expect(seen.length).toBe(before + 2);
  });

  it('ONL-2186: ready carries the validated account, and only the parts codex named', () => {
    const { machine } = make();
    machine.ready({ email: 'a@b.c', plan: 'plus' });
    expect(machine.current()).toEqual({ status: 'ready', email: 'a@b.c', plan: 'plus' });
    machine.ready({ plan: 'plus' });
    expect(Object.hasOwn(machine.current(), 'email')).toBe(false);
    machine.ready();
    expect(machine.current()).toEqual({ status: 'ready' });
  });

  it('ONL-2186: signed-out carries the device-auth line once the binary is known, never before', () => {
    const { machine } = make();
    machine.signedOut('nobody home');
    expect(Object.hasOwn(machine.current(), 'command')).toBe(false);
    machine.binaryResolved('/cache/codex-0.147.0/bin/codex');
    machine.signedOut('nobody home');
    expect(machine.current().command).toBe('/cache/codex-0.147.0/bin/codex login --device-auth');
    machine.ready();
    expect(Object.hasOwn(machine.current(), 'command')).toBe(false);
  });
});

describe('codexDeviceAuthCommand', () => {
  it('quotes a path only when the shell would split it', () => {
    expect(codexDeviceAuthCommand('/a/codex')).toBe('/a/codex login --device-auth');
    expect(codexDeviceAuthCommand('/Users/o b/codex')).toBe("'/Users/o b/codex' login --device-auth");
    expect(codexDeviceAuthCommand("/it's/codex")).toBe("'/it'\\''s/codex' login --device-auth");
  });
});
