import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, expect, it, spyOn } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { createWorkActivity } from '../background-work/activity.js';
import { StarterFailure } from './failure.js';
import { createStarterRunner, type StarterChildLike, type StarterRunnerDeps } from './runner.js';
import { writeScaffold } from './scaffold.js';

afterEach(cleanupTempFixtures);

function deadChild(onKill: () => void): EventEmitter & StarterChildLike {
  const child: EventEmitter & StarterChildLike = Object.assign(new EventEmitter(), {
    pid: undefined, stdout: new PassThrough(), stderr: new PassThrough(),
    postMessage() {},
    kill() { onKill(); return true; },
  });
  return child;
}

it('a starter that exits before its ready line says so with its exit code', async () => {
  const root = makeStateRoot({ name: 'starter-exit' });
  writeScaffold(root, { 'server.mjs': '' });
  const child = deadChild(() => undefined);
  const diagnostics: Parameters<NonNullable<StarterRunnerDeps['diagnostics']>>[1][] = [];
  const runner = createStarterRunner({ fork: () => child, env: async () => ({}), pickPort: async () => 4000, diagnostics: (_cwd, patch) => { diagnostics.push(patch); } });
  try {
    const spawning = runner.spawn(root).catch((error: unknown) => error);
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    child.emit('exit', 7);
    const error = await spawning;
    expect(error).toBeInstanceOf(StarterFailure);
    expect(error).toMatchObject({ failureCause: 'starter_exited', exitCode: 7 });
    expect(String(error)).toBe('Error: starter exited (code 7) before it was ready');
    expect(diagnostics.at(-1)).toMatchObject({ cause: 'process_exited', process_exited: true, exit_code: 7, actual_port: null, spawn_to_failure_ms: expect.any(Number) });
  } finally {
    runner.dispose();
  }
});

it('a starter that never prints its ready line says so', async () => {
  const root = makeStateRoot({ name: 'starter-silent' });
  writeScaffold(root, { 'server.mjs': '' });
  const child = deadChild(() => queueMicrotask(() => child.emit('exit', 0)));
  const diagnostics: Parameters<NonNullable<StarterRunnerDeps['diagnostics']>>[1][] = [];
  const runner = createStarterRunner({ fork: () => child, env: async () => ({}), pickPort: async () => 4000, timing: { readyMs: 1 }, diagnostics: (_cwd, patch) => { diagnostics.push(patch); } });
  try {
    const error = await runner.spawn(root).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StarterFailure);
    expect(error).toMatchObject({ failureCause: 'starter_never_ready' });
    expect(diagnostics.at(-1)).toMatchObject({ cause: 'readiness_timeout', process_exited: false, exit_code: null });
  } finally {
    runner.dispose();
  }
});

it('negotiates the longer heartbeat expiry before the background gap and releases it on exit', async () => {
  const root = makeStateRoot({ name: 'background-heartbeat' });
  writeScaffold(root, { 'server.mjs': '' });
  const activity = createWorkActivity();
  const scheduled: number[] = [];
  const original = globalThis.setTimeout;
  const timer = spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms: number) => {
    scheduled.push(ms);
    return original(callback, ms);
  }) as typeof setTimeout);
  const messages: unknown[] = [];
  const child = Object.assign(new EventEmitter(), {
    pid: undefined, stdout: new PassThrough(), stderr: new PassThrough(),
    postMessage(message: unknown) { messages.push(message); },
    kill() { queueMicrotask(() => child.emit('exit', 0)); return true; },
  });
  const runner = createStarterRunner({ fork: () => child as unknown as StarterChildLike,
    env: async () => ({}), pickPort: async () => 4000, activity });
  try {
    const spawning = runner.spawn(root);
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    child.emit('spawn');
    child.stdout.write('starter ready http://127.0.0.1:4000\n');
    await spawning;
    expect(messages.at(-1)).toEqual({ type: 'heartbeat', windowMs: 5000 });
    activity.update({ focused: false });
    expect(messages.at(-1)).toEqual({ type: 'heartbeat', windowMs: 50_000 });
    expect(scheduled.at(-1)).toBe(10_000);
    activity.update({ focused: true });
    expect(messages.at(-1)).toEqual({ type: 'heartbeat', windowMs: 5000 });
    expect(scheduled.at(-1)).toBe(1000);
    activity.update({ onBattery: true });
    expect(messages.at(-1)).toEqual({ type: 'heartbeat', windowMs: 50_000 });
    await runner.stop(root);
    const stopped = messages.length;
    activity.update({ onBattery: false });
    expect(messages).toHaveLength(stopped);
  } finally {
    runner.dispose();
    timer.mockRestore();
  }
});
