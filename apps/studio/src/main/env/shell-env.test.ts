import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { alive, manualClock, until } from '@studio/fixtures';
import { captureShellEnv, mergeEnv, parseEnvBlock } from './shell-env.js';

const made: string[] = [];

setDefaultTimeout(45_000);

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function scratch(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `studio-env-${name}-`));
  made.push(dir);
  return dir;
}

/** One executable per file: on macOS the first exec of a freshly written file costs ~120 ms. */
const RC = 'STUDIO_TEST_SHELL_RC';
const SHELL = join(scratch('shell'), 'shell');
writeFileSync(SHELL, `#!/bin/sh\neval "$${RC}"\n`);
chmodSync(SHELL, 0o755);

/** Every well-behaved rc ends with this: the payload is nonce-fenced, so a canned `env -0` block is discarded (ONL-1902). */
const RUN_THE_COMMAND = 'shift $(($# - 1)); eval "$1"\n';

function shellWith(rc: string, inherited: NodeJS.ProcessEnv = process.env) {
  return { shell: SHELL, inherited: { ...inherited, [RC]: rc }, timeoutMs: 15_000 };
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function shellRunning(preamble = '', inherited?: NodeJS.ProcessEnv) {
  return shellWith(`${preamble}${RUN_THE_COMMAND}`, inherited);
}

function lines(path: string): number {
  return existsSync(path) ? readFileSync(path, 'utf8').split('\n').filter(Boolean).length : 0;
}


function untilLines(path: string, count: number): Promise<void> {
  return until(async () => lines(path), (seen) => seen >= count, {
    what: `${count} shell helpers to report readiness`, limitMs: 30_000, everyMs: 10,
  }).then(() => undefined);
}

describe('parseEnvBlock', () => {
  it('keeps a multi-line value intact', () => {
    const raw = 'PATH=/usr/bin\0GPG_KEY=line1\nline2\nline3\0LANG=en_US.UTF-8\0';
    expect(parseEnvBlock(raw)).toEqual({
      PATH: '/usr/bin',
      GPG_KEY: 'line1\nline2\nline3',
      LANG: 'en_US.UTF-8',
    });
  });

  it('splits on the first = only, and drops what cannot be an assignment', () => {
    const raw = 'LS_COLORS=di=1;34:ln=35\0NOT_AN_ASSIGNMENT\0=leading\0';
    expect(parseEnvBlock(raw)).toEqual({ LS_COLORS: 'di=1;34:ln=35' });
  });
});

describe('captureShellEnv — the instrument', () => {
  it('reads back an environment the child alone could have produced', async () => {
    const captured = await captureShellEnv(
      shellRunning('RESOLVED_BY_SHELL=yes; export RESOLVED_BY_SHELL\nPATH=/opt/homebrew/bin:/usr/bin\n'),
    );
    expect(captured?.['RESOLVED_BY_SHELL']).toBe('yes');
    expect(captured?.['PATH']).toBe('/opt/homebrew/bin:/usr/bin');
  });

  it('returns undefined when the shell does not exist', async () => {
    const captured = await captureShellEnv({ shell: '/nonexistent/shell' });
    expect(captured).toBeUndefined();
  });

  it('rejects a bare env block that carries no markers', async () => {
    expect(await captureShellEnv(shellWith('printf "PATH=/opt/homebrew/bin\\0"\n'))).toBeUndefined();
  });

  it('returns undefined when the shell wedges, and leaves nothing its rc started alive', async () => {
    const pids = join(scratch('pids'), 'pids');
    const timeoutMs = 1_000;
    const clock = manualClock();
    const capture = captureShellEnv({ ...shellWith(`sleep 120 &\necho $! >> '${pids}'\nwait\n`), timeoutMs, clock });
    await untilLines(pids, 1);
    clock.advanceBy(timeoutMs - 1);
    expect(alive(Number(readFileSync(pids, 'utf8').trim()))).toBe(true);
    clock.advanceBy(1);
    await untilLines(pids, 2);
    clock.advanceBy(timeoutMs);
    expect(await capture).toBeUndefined();
    expect(clock.pending).toBe(0);

    const children = readFileSync(pids, 'utf8').trim().split('\n').map(Number);
    expect(children).toHaveLength(2);
    await until(async () => children.some(isAlive), (present) => !present, {
      what: 'both abandoned shell helpers to be reaped', limitMs: 30_000, everyMs: 10,
    });
  });

  it('does not let ELECTRON_RUN_AS_NODE reach the probe', async () => {
    const captured = await captureShellEnv(
      shellRunning('SAW="[${ELECTRON_RUN_AS_NODE:-none}]"; export SAW\n', { PATH: '/usr/bin', ELECTRON_RUN_AS_NODE: '1' }),
    );
    expect(captured?.['SAW']).toBe('[none]');
  });
});

describe('captureShellEnv — the interactive login shell (ONL-1902)', () => {
  it('asks for an interactive login shell, not a login shell', async () => {
    const captured = await captureShellEnv(shellRunning('ARGV="$1 $2"; export ARGV\n'));
    expect(captured?.['ARGV']).toBe('-i -l');
  });

  it('parses clean through rc chatter on both sides of the payload', async () => {
    const shell = shellRunning(
      'printf "\\033]7;file://mac.lan/Users/someone\\033\\\\"\n' +
        'PATH=/opt/homebrew/bin:/usr/bin\n' +
        'trap \'printf "\\n[oh-my-zsh] plugins reloaded\\n"\' EXIT\n',
    );
    const captured = await captureShellEnv(shell);
    expect(captured?.['PATH']).toBe('/opt/homebrew/bin:/usr/bin');
    expect(Object.keys(captured ?? {}).some((key) => key.includes('\u001b'))).toBe(false);
  });

  it('survives a shell that echoes the command before running it', async () => {
    // Asserted on key shape, not `PATH`: absorbed chatter damages whichever entry `env` printed first, and a `PATH` assertion stayed green under the mutation.
    const shell = shellRunning(
      'for a in "$@"; do last="$a"; done\nprintf "+ %s\\n" "$last"\n' +
        // A real bin dir: the fixture still has to find `env`.
        'PATH=/opt/xtrace/bin:/usr/bin\nexport PATH\n',
      { PATH: '/usr/bin' },
    );
    const captured = await captureShellEnv(shell);

    expect(captured?.['PATH']).toBe('/opt/xtrace/bin:/usr/bin');
    const malformed = Object.keys(captured ?? {}).filter((key) => !/^[A-Za-z_]\w*$/.test(key));
    expect(malformed).toEqual([]);
  });

  it('falls back to a plain login shell when the interactive one fails', async () => {
    const captured = await captureShellEnv(shellRunning('case "$1" in -i) exit 1;; esac\nMODE=login; export MODE\n'));
    expect(captured?.['MODE']).toBe('login');
  });
});

describe('captureShellEnv — an rc that reads stdin', () => {
  it('completes promptly instead, because the capture hands it /dev/null', async () => {
    const captured = await captureShellEnv({
      ...shellRunning('read _ignored\nSAW_EOF=yes; export SAW_EOF\n'),
      timeoutMs: 15_000,
    });

    expect(captured?.['SAW_EOF']).toBe('yes');
  });
});

describe('mergeEnv — the policy', () => {
  it('lets a spawn site override both', () => {
    const merged = mergeEnv(
      { GIT_PAGER: 'less' },
      { GIT_PAGER: 'less', PATH: '/opt/homebrew/bin' },
      { GIT_PAGER: 'cat', GIT_TERMINAL_PROMPT: '0' },
    );
    expect(merged['GIT_PAGER']).toBe('cat');
    expect(merged['GIT_TERMINAL_PROMPT']).toBe('0');
    expect(merged['PATH']).toBe('/opt/homebrew/bin');
  });

  it('skips undefined values rather than writing them as holes', () => {
    const merged = mergeEnv({ A: '1' }, { A: undefined, B: '2' });
    expect(merged).toEqual({ A: '1', B: '2' });
  });
});
