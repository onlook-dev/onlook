import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { CODE_MAX_LENGTH, sanitizeCode } from '@studio/events';
import { describe, expect, it } from 'bun:test';
import {
  startClaudeLogin,
  validateLoginUrl,
  type ClaudeLoginHandle,
  type LoginChild,
} from './login.js';

const AUTH_URL =
  'https://claude.com/cai/oauth/authorize?code=true&client_id=fixture&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&state=fixture';
const PROMPT = `Opening browser to sign in…\nIf the browser didn't open, visit: ${AUTH_URL}\nPaste code here if prompted > `;
const INVALID_CODE = 'Invalid code. Please make sure the full code was copied.\n';
const LOGIN_FAILED = 'Login failed: Request failed with status code 400\n';

class FakeChild extends EventEmitter implements LoginChild {
  readonly pid = 4242;
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly written: string[] = [];
  readonly signals: NodeJS.Signals[] = [];
  killed = false;

  constructor() {
    super();
    this.stdin.on('data', (chunk: Buffer | string) => {
      this.written.push(chunk.toString());
    });
  }

  kill(signal: NodeJS.Signals = 'SIGTERM'): boolean {
    this.killed = true;
    this.signals.push(signal);
    return true;
  }

  exit(code: number | null, signal: NodeJS.Signals | null = null): void {
    this.emit('exit', code, signal);
  }
}

interface Rig {
  child: FakeChild;
  spawned: Array<{ bin: string; args: string[]; env: Record<string, string>; detached: boolean }>;
  opened: string[];
  handle: Promise<ClaudeLoginHandle>;
}

function rig(options: { abandonMs?: number; urlTimeoutMs?: number; bin?: string } = {}): Rig {
  const child = new FakeChild();
  const spawned: Rig['spawned'] = [];
  const opened: string[] = [];
  const handle = startClaudeLogin({
    bin: options.bin ?? '/bin/claude',
    env: { PATH: '/usr/bin', ANTHROPIC_API_KEY: 'fixture-key' },
    openExternal: async (url) => {
      opened.push(url);
    },
    spawn: (bin, args, spawnOptions) => {
      spawned.push({ bin, args, env: spawnOptions.env, detached: spawnOptions.detached });
      return child;
    },
    signal: (target, signal) => target.kill(signal),
    killGraceMs: 20,
    ...(options.abandonMs === undefined ? {} : { abandonMs: options.abandonMs }),
    ...(options.urlTimeoutMs === undefined ? {} : { urlTimeoutMs: options.urlTimeoutMs }),
  });
  return { child, spawned, opened, handle };
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));
const rejection = (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, (error: unknown) => error);

describe('sanitizeCode', () => {
  it('strips control characters and line breaks, trims, and refuses empty or over-long codes', () => {
    expect(sanitizeCode('  abc#def ')).toBe('abc#def');
    expect(sanitizeCode('abc\n#def\r\n')).toBe('abc#def');
    expect(sanitizeCode('abc[0m')).toBe('abc[0m');
    expect(sanitizeCode('ab\u0085cd\u009f')).toBe('abcd');
    expect(sanitizeCode('')).toBeUndefined();
    expect(sanitizeCode('   \n ')).toBeUndefined();
    expect(sanitizeCode('x'.repeat(CODE_MAX_LENGTH))).toHaveLength(CODE_MAX_LENGTH);
    expect(sanitizeCode('x'.repeat(CODE_MAX_LENGTH + 1))).toBeUndefined();
  });
});

describe('validateLoginUrl', () => {
  it('accepts https on a known host by exact hostname and nothing else', () => {
    expect(validateLoginUrl(AUTH_URL)).toBe(AUTH_URL);
    expect(validateLoginUrl('https://platform.claude.com/oauth/authorize?state=shim')).toBeDefined();
    expect(validateLoginUrl('https://claude.ai/login')).toBeDefined();
    expect(validateLoginUrl('http://claude.com/cai/oauth/authorize')).toBeUndefined();
    expect(validateLoginUrl('https://claude.com.evil.test/cai/oauth/authorize')).toBeUndefined();
    expect(validateLoginUrl('https://evil.test/?next=claude.com')).toBeUndefined();
    expect(validateLoginUrl('https://notclaude.com/')).toBeUndefined();
    expect(validateLoginUrl('not a url')).toBeUndefined();
    expect(validateLoginUrl('file:///etc/passwd')).toBeUndefined();
  });
});

describe('startClaudeLogin', () => {
  it('spawns auth login --claudeai with piped stdio in its own group, on the given env', async () => {
    const { child, spawned, handle } = rig();
    child.stdout.write(PROMPT);
    await handle;
    expect(spawned).toEqual([
      {
        bin: '/bin/claude',
        args: ['auth', 'login', '--claudeai'],
        env: { PATH: '/usr/bin', ANTHROPIC_API_KEY: 'fixture-key' },
        detached: process.platform !== 'win32',
      },
    ]);
  });

  it('the measured three-line chunk yields the URL, and nothing is opened on the happy path', async () => {
    const { child, opened, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    expect(login.authUrl).toBe(AUTH_URL);
    expect(opened).toEqual([]);
    expect(login.loginFailed()).toBe(false);
  });

  it('a chunk split across two data events still yields the URL', async () => {
    const { child, handle } = rig();
    child.stdout.write('Opening browser to sign in…\n');
    child.stdout.write(`If the browser didn't open, visit: ${AUTH_URL.slice(0, 40)}`);
    await tick();
    child.stdout.write(`${AUTH_URL.slice(40)}\nPaste code here if prompted > `);
    expect((await handle).authUrl).toBe(AUTH_URL);
  });

  it('a URL the CLI wraps in a terminal hyperlink yields the link target exactly as signed', async () => {
    const coloured = `\x1b[94m${AUTH_URL}\x1b[39m`;
    for (const end of ['\x07', '\x1b\\']) {
      const { child, handle } = rig();
      child.stdout.write(`Opening browser to sign in…\nIf the browser didn't open, visit: \x1b]8;;${AUTH_URL}${end}${coloured}\x1b]8;;${end}\nPaste code here if prompted > `);
      expect((await handle).authUrl).toBe(AUTH_URL);
    }
  });

  it('a coloured URL with no hyperlink yields the URL', async () => {
    const { child, handle } = rig();
    child.stdout.write(`If the browser didn't open, visit: \x1b[94m${AUTH_URL}\x1b[39m\n`);
    expect((await handle).authUrl).toBe(AUTH_URL);
  });

  it('a hyperlink whose target is not a known host fails even when its text is', async () => {
    const { child, handle } = rig();
    child.stdout.write(`If the browser didn't open, visit: \x1b]8;;https://evil.test/login\x07${AUTH_URL}\x1b]8;;\x07\n`);
    expect(await rejection(handle)).toBeInstanceOf(Error);
  });

  it('a visit line that is not https on a known host fails the handle and kills the child', async () => {
    const { child, handle } = rig();
    child.stdout.write("Opening browser to sign in…\nIf the browser didn't open, visit: https://evil.test/login\n");
    expect(await rejection(handle)).toBeInstanceOf(Error);
    expect(child.signals).toEqual(['SIGTERM']);
  });

  it('a child that exits before printing a page fails the handle', async () => {
    const { child, handle } = rig();
    child.exit(1);
    expect(await rejection(handle)).toBeInstanceOf(Error);
  });

  it('a spawn error fails the handle with the error itself', async () => {
    const { child, handle } = rig();
    const enoent = Object.assign(new Error('spawn /bin/claude ENOENT'), { code: 'ENOENT' });
    child.emit('error', enoent);
    expect(await rejection(handle)).toBe(enoent);
  });

  it('a child that prints nothing within the URL bound fails the handle', async () => {
    const { child, handle } = rig({ urlTimeoutMs: 10 });
    expect(await rejection(handle)).toBeInstanceOf(Error);
    expect(child.signals).toEqual(['SIGTERM']);
  });

  it('openPage opens the retained URL through the injected browser', async () => {
    const { child, opened, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    await login.openPage();
    expect(opened).toEqual([AUTH_URL]);
  });

  it('stderr "Invalid code" emits rejected and the handle stays open', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    let rejected = 0;
    login.onRejected(() => {
      rejected += 1;
    });
    expect(login.submitCode('bad')).toBe(true);
    child.stderr.write(INVALID_CODE);
    await tick();
    expect(rejected).toBe(1);
    expect(child.killed).toBe(false);
    expect(login.submitCode('good')).toBe(true);
    expect(child.written).toEqual(['bad\n', 'good\n']);
    child.exit(0);
    expect(await login.completed).toBe('exited');
  });

  it('stderr "Login failed" then exit 1 completes as exited with loginFailed set', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    child.stderr.write(LOGIN_FAILED);
    await tick();
    child.exit(1);
    expect(await login.completed).toBe('exited');
    expect(login.loginFailed()).toBe(true);
    expect(login.exitCode()).toBe(1);
  });

  it('a "Login failed" line with no trailing newline before the exit still counts', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    child.stderr.write('Login failed: refused');
    await tick();
    child.exit(1);
    expect(await login.completed).toBe('exited');
    expect(login.loginFailed()).toBe(true);
  });

  it('exit 0 completes as exited', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    child.exit(0);
    expect(await login.completed).toBe('exited');
    expect(login.exitCode()).toBe(0);
  });

  it('cancel kills the child, completes as cancelled, and a second cancel or a late exit changes nothing', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    login.cancel();
    login.cancel();
    expect(child.signals).toEqual(['SIGTERM']);
    expect(await login.completed).toBe('cancelled');
    child.exit(143);
    expect(await login.completed).toBe('cancelled');
    expect(login.submitCode('late')).toBe(false);
  });

  it('a child ignoring SIGTERM is SIGKILLed after the grace', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    login.cancel();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(child.signals).toEqual(['SIGTERM', 'SIGKILL']);
  });

  it('the abandon bound kills the child and completes as abandoned', async () => {
    const { child, handle } = rig({ abandonMs: 10 });
    child.stdout.write(PROMPT);
    const login = await handle;
    expect(await login.completed).toBe('abandoned');
    expect(child.signals[0]).toBe('SIGTERM');
  });

  it('submitCode writes one sanitized line; an embedded line break cannot become a second line', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    expect(login.submitCode('  abc#def ')).toBe(true);
    expect(login.submitCode('abc\n#def\n')).toBe(true);
    await tick();
    expect(child.written).toEqual(['abc#def\n', 'abc#def\n']);
  });

  it('an over-long or empty code is refused without a write', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    expect(login.submitCode('')).toBe(false);
    expect(login.submitCode('   ')).toBe(false);
    expect(login.submitCode('x'.repeat(CODE_MAX_LENGTH + 1))).toBe(false);
    await tick();
    expect(child.written).toEqual([]);
    login.cancel();
  });

  it('a code after the child exited is refused', async () => {
    const { child, handle } = rig();
    child.stdout.write(PROMPT);
    const login = await handle;
    child.exit(0);
    await login.completed;
    expect(login.submitCode('late')).toBe(false);
    expect(child.written).toEqual([]);
  });
});
