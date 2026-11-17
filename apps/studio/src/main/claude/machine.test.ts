import { CLAUDE_LOGIN_COMMAND, claudeStateIsSettled, type ClaudeSetupState, type ClaudeSettledSetupState } from '@studio/events';
import { describe, expect, it } from 'bun:test';
import { ClaudeSetupMachine } from './machine.js';

function make(): { machine: ClaudeSetupMachine; emitted: ClaudeSetupState[] } {
  const emitted: ClaudeSetupState[] = [];
  const machine = new ClaudeSetupMachine({ emit: (state) => emitted.push(state) });
  return { machine, emitted };
}

describe('ClaudeSetupMachine', () => {
  it('emits every transition, the awaiting-code self-transition with its detail included', () => {
    const { machine, emitted } = make();
    machine.checking();
    machine.signedOut();
    machine.signingIn();
    machine.awaitingCode();
    machine.awaitingCode('invalid-code');
    machine.awaitingCode('invalid-code');
    expect(emitted.map((state) => [state.status, state.detail])).toEqual([
      ['checking', undefined],
      ['signed-out', undefined],
      ['signing-in', undefined],
      ['awaiting-code', undefined],
      ['awaiting-code', 'invalid-code'],
      ['awaiting-code', 'invalid-code'],
    ]);
  });

  it('signed-in carries the email and plan only when known', () => {
    const { machine } = make();
    machine.signedIn({ email: 'wren@example.com', plan: 'max' });
    expect(machine.current()).toEqual({
      status: 'signed-in',
      email: 'wren@example.com',
      plan: 'max',
      command: CLAUDE_LOGIN_COMMAND,
    });
    machine.signedIn();
    expect(machine.current()).toEqual({ status: 'signed-in', command: CLAUDE_LOGIN_COMMAND });
  });

  it('failed always names why, and every state keeps the command', () => {
    const { machine, emitted } = make();
    machine.failed('did-not-answer');
    expect(machine.current()).toEqual({ status: 'failed', detail: 'did-not-answer', command: CLAUDE_LOGIN_COMMAND });
    machine.checking();
    machine.signingIn();
    for (const state of emitted) expect(state.command).toBe(CLAUDE_LOGIN_COMMAND);
  });

  it('a verification runs, then lands a verdict that always names why (ONL-2496)', () => {
    const { machine, emitted } = make();
    machine.checking();
    machine.verifying();
    machine.signedIn({ plan: 'max' });
    machine.verifying();
    machine.verificationFailed('turn-provider-refused');
    expect(emitted.map((state) => [state.status, state.detail])).toEqual([
      ['checking', undefined],
      ['verifying', undefined],
      ['signed-in', undefined],
      ['verifying', undefined],
      ['verification-failed', 'turn-provider-refused'],
    ]);
  });

  it('a stopped check puts back the verdict the detection replaced (ONL-2496)', () => {
    const { machine, emitted } = make();
    machine.verificationFailed('turn-service-error');
    const before = machine.current();
    if (!claudeStateIsSettled(before)) throw new Error('Expected a settled verification verdict');
    machine.checking();
    machine.verifying();
    machine.restore(before);
    expect(machine.current()).toEqual(before);
    expect(emitted.at(-1)).toEqual(before);
  });

  it('every setter replaces the prior payload and preserves the command', () => {
    const cases: Array<{ drive: (machine: ClaudeSetupMachine) => void; expected: ClaudeSetupState }> = [
      { drive: (machine) => machine.checking(), expected: { status: 'checking', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.signedOut(), expected: { status: 'signed-out', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.signedOut('exited'), expected: { status: 'signed-out', detail: 'exited', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.signingIn(), expected: { status: 'signing-in', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.awaitingCode(), expected: { status: 'awaiting-code', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.awaitingCode('invalid-code'), expected: { status: 'awaiting-code', detail: 'invalid-code', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.verifying(), expected: { status: 'verifying', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.signedIn(), expected: { status: 'signed-in', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.failed('exited'), expected: { status: 'failed', detail: 'exited', command: CLAUDE_LOGIN_COMMAND } },
      { drive: (machine) => machine.verificationFailed('turn-no-answer'), expected: { status: 'verification-failed', detail: 'turn-no-answer', command: CLAUDE_LOGIN_COMMAND } },
    ];
    for (const { drive, expected } of cases) {
      const { machine, emitted } = make();
      machine.signedIn({ email: 'old@example.com', plan: 'max' });
      machine.verificationFailed('turn-service-error', { diagnostic: { status: 503 }, sentence: 'Unavailable' }, 'max');
      drive(machine);
      expect(machine.current()).toEqual(expected);
      expect(emitted.at(-1)).toEqual(expected);
    }
  });

  it('every settled restore replaces payloads and repairs the command', () => {
    const states: ClaudeSettledSetupState[] = [
      { status: 'idle', command: 'old' },
      { status: 'signed-out', detail: 'exited', command: 'old' },
      { status: 'signed-in', email: 'designer@example.com', plan: 'pro', command: 'old' },
      { status: 'failed', detail: 'spawn', command: 'old' },
      { status: 'verification-failed', detail: 'turn-billing', plan: 'pro', turn: { diagnostic: { status: 402 } }, command: 'old' },
    ];
    for (const state of states) {
      const { machine, emitted } = make();
      machine.signedIn({ email: 'old@example.com', plan: 'max' });
      machine.restore(state);
      expect(machine.current()).toEqual({ ...state, command: CLAUDE_LOGIN_COMMAND });
      expect(emitted.at(-1)).toEqual(machine.current());
    }
  });

  it('is signing in only while a login child is alive', () => {
    const drives: Array<[(m: ClaudeSetupMachine) => void, boolean]> = [
      [(m) => m.checking(), false],
      [(m) => m.signingIn(), true],
      [(m) => m.awaitingCode(), true],
      [(m) => m.signedOut(), false],
      [(m) => m.signedIn(), false],
      [(m) => m.failed('exited'), false],
      [(m) => m.verifying(), false],
      [(m) => m.verificationFailed('turn-no-answer'), false],
    ];
    for (const [drive, signingIn] of drives) {
      const { machine } = make();
      drive(machine);
      expect(machine.isSigningIn()).toBe(signingIn);
    }
  });
});
