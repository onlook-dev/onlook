import { afterEach, describe, expect, it } from 'bun:test';
import { APP_ENV, envWithout, leadsOwnGroup, runChild, runChildOutput, signalGroup, signalTree, startChild } from './child.js';

const realPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
const realKill = process.kill;

afterEach(() => {
  Object.defineProperty(process, 'platform', realPlatform);
  process.kill = realKill;
  delete process.env['CHILD_SEAM_PROBE'];
});

function output(child: ReturnType<typeof startChild>): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = '';
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => { out += chunk; });
    child.on('error', reject);
    child.on('close', () => resolve(out));
  });
}

describe.skipIf(process.platform === 'win32')('the environment a child receives', () => {
  it('is exactly the built one: nothing of the app leaks in', async () => {
    process.env['CHILD_SEAM_PROBE'] = 'app';
    const out = await output(startChild('/usr/bin/env', [], { env: { ONLY: 'this' }, stdio: ['ignore', 'pipe', 'ignore'] }));
    expect(out.trim().split('\n').filter((line) => !line.startsWith('__CF'))).toEqual(['ONLY=this']);
  });

  it("is the app's own only when named", async () => {
    process.env['CHILD_SEAM_PROBE'] = 'app';
    const out = await output(startChild('/usr/bin/env', [], { env: APP_ENV, stdio: ['ignore', 'pipe', 'ignore'] }));
    expect(out).toContain('CHILD_SEAM_PROBE=app');
  });

  it('holds for a run to completion, with its bounds', async () => {
    process.env['CHILD_SEAM_PROBE'] = 'app';
    const built = await new Promise<string>((resolve) => runChild('/usr/bin/env', [], { env: { ONLY: 'this' }, timeout: 5_000 }, (_error, stdout) => resolve(stdout)));
    expect(built).toContain('ONLY=this');
    expect(built).not.toContain('CHILD_SEAM_PROBE');
    const own = await runChildOutput('/usr/bin/env', [], { env: APP_ENV, timeout: 5_000 });
    expect(own.stdout).toContain('CHILD_SEAM_PROBE=app');
    const bounded = await new Promise<{ killed?: boolean; signal?: unknown } | null>((resolve) => runChild('/bin/sleep', ['5'], { env: APP_ENV, timeout: 50, killSignal: 'SIGKILL' }, (error) => resolve(error)));
    expect(bounded).toMatchObject({ killed: true, signal: 'SIGKILL' });
  });
});

describe('envWithout', () => {
  it('copies, and removes exactly the named variables', () => {
    const env: Record<string, string> = { KEEP: '1', GIT_DIR: 'x', NODE_OPTIONS: 'y' };
    expect(envWithout(env, ['GIT_DIR', 'NODE_OPTIONS', 'ABSENT'])).toEqual({ KEEP: '1' });
    expect(env).toEqual({ KEEP: '1', GIT_DIR: 'x', NODE_OPTIONS: 'y' });
    expect(envWithout(env, [])).not.toBe(env);
  });
});

describe('signals', () => {
  function recordedKill(fail?: NodeJS.ErrnoException): Array<[number, string | number | undefined]> {
    const sent: Array<[number, string | number | undefined]> = [];
    process.kill = ((pid: number, signal?: string | number) => {
      sent.push([pid, signal]);
      if (fail) throw fail;
      return true;
    }) as typeof process.kill;
    return sent;
  }
  const child = (pid: number | undefined, direct: string[]) => ({ pid, kill: (signal?: NodeJS.Signals) => { direct.push(signal ?? 'default'); return true; } });

  it('a group is led everywhere but Windows', () => {
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'darwin' });
    expect(leadsOwnGroup()).toBe(true);
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'win32' });
    expect(leadsOwnGroup()).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('signals the whole group by negative pid', () => {
    const sent = recordedKill();
    const direct: string[] = [];
    signalGroup(child(4242, direct), 'SIGTERM', 'signal-child');
    signalGroup(child(4242, direct), 'SIGKILL', 'throw-unless-gone');
    expect(sent).toEqual([[-4242, 'SIGTERM'], [-4242, 'SIGKILL']]);
    expect(direct).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')('an unreachable group falls back to the child, or throws unless it is gone, as the caller says', () => {
    const denied = Object.assign(new Error('denied'), { code: 'EPERM' });
    const gone = Object.assign(new Error('gone'), { code: 'ESRCH' });
    const direct: string[] = [];
    recordedKill(denied);
    signalGroup(child(4242, direct), 'SIGTERM', 'signal-child');
    expect(direct).toEqual(['SIGTERM']);
    expect(() => signalGroup(child(4242, direct), 'SIGTERM', 'throw-unless-gone')).toThrow('denied');
    recordedKill(gone);
    expect(() => signalGroup(child(4242, direct), 'SIGTERM', 'throw-unless-gone')).not.toThrow();
    expect(direct).toEqual(['SIGTERM']);
  });

  it('a child that never started is left alone', () => {
    const sent = recordedKill();
    signalGroup(child(undefined, []), 'SIGTERM', 'signal-child');
    expect(sent).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')('one process is signalled by its own pid', () => {
    const sent = recordedKill();
    expect(signalTree(4242, 'SIGTERM')).toBeUndefined();
    expect(sent).toEqual([[4242, 'SIGTERM']]);
  });

  it('on Windows a signal ends the tree and never reaches process.kill', async () => {
    Object.defineProperty(process, 'platform', { ...realPlatform, value: 'win32' });
    const sent = recordedKill();
    await expect(signalTree(1, 'SIGTERM')).rejects.toThrow('Refusing to terminate an invalid process tree');
    expect(sent).toEqual([]);
  });
});
