import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { spawn } from 'node:child_process';
import * as childProcess from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { writeStateFile } from '../../../apps/studio/src/main/state/file.js';
import {
  installComplaint,
  launchMarks,
  launchProcesses,
  launchStudio,
  listProcesses,
  machineClaudeLogin,
  machineCodexHome,
  missingInstall,
  prepareLaunch,
  stopLaunch,
  type LaunchPlanOptions,
  type ProcessRow,
} from './launch.js';

const roots: string[] = [];
const RUNNER_ENV = {
  CLAUDE_CONFIG_DIR: '/runner/claude/login',
  CLAUDE_SECURESTORAGE_CONFIG_DIR: '/runner/claude/secure',
  CODEX_HOME: '/runner/codex',
  GIT_CONFIG_GLOBAL: '/runner/.gitconfig',
  RUNNER_SECRET: 'not-for-the-handle',
};
const before: Record<string, string | undefined> = {};

function plan(options: Partial<LaunchPlanOptions> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'launch-plan-'));
  roots.push(root);
  return { root, launch: prepareLaunch({ stateRoot: join(root, 'state'), userDataDir: join(root, 'user-data'), ...options }) };
}

beforeEach(() => {
  for (const [key, value] of Object.entries(RUNNER_ENV)) {
    before[key] = process.env[key];
    process.env[key] = value;
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(before)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('a launch', () => {
  for (const telemetryConsent of [undefined, 'unanswered'] as const) {
    it(`the agent launcher ${telemetryConsent === undefined ? 'defaults to refusal' : 'can leave consent unanswered'} before starting Electron`, async () => {
      const tree = mkdtempSync(join(tmpdir(), 'launch-consent-'));
      roots.push(tree);
      for (const [path, contents] of [
        ['apps/studio/package.json', '{}'], ['node_modules/.bin/turbo', ''],
        ['apps/studio/node_modules/electron/path.txt', 'electron'], ['apps/studio/out/main/index.js', ''],
      ]) {
        const file = join(tree, path!);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, contents!);
      }
      const starting = spyOn(childProcess, 'spawn').mockReturnValue(new childProcess.ChildProcess() as ReturnType<typeof spawn>);
      try {
        const root = join(tree, 'run');
        await expect(launchStudio({ root, tree, build: false, telemetryConsent })).rejects.toThrow('Electron did not start');
        expect(starting).toHaveBeenCalledTimes(1);
        const path = join(root, 'state/settings.json');
        if (telemetryConsent === undefined) expect(JSON.parse(readFileSync(path, 'utf8')).data.telemetryConsent).toBe('declined');
        else expect(existsSync(path)).toBe(false);
      } finally {
        starting.mockRestore();
      }
    });
  }

  it('seeds an explicit source refusal only when asked and preserves an existing answer', () => {
    const { root } = plan({ telemetryConsent: 'declined' });
    const stateRoot = join(root, 'state');
    const path = join(stateRoot, 'settings.json');
    expect(JSON.parse(readFileSync(path, 'utf8')).data.telemetryConsent).toBe('declined');
    writeStateFile(path, 1, { telemetryConsent: 'accepted' });
    prepareLaunch({ stateRoot, userDataDir: join(root, 'user-data'), telemetryConsent: 'declined' });
    expect(JSON.parse(readFileSync(path, 'utf8')).data.telemetryConsent).toBe('accepted');
    const unanswered = plan({ telemetryConsent: 'unanswered' });
    expect(existsSync(join(unanswered.root, 'state', 'settings.json'))).toBe(false);
  });
  it('seeds the tour as seen before Electron starts', () => {
    const { root } = plan({ tourSeen: true });
    expect(JSON.parse(readFileSync(join(root, 'state', 'settings.json'), 'utf8'))).toEqual({
      version: 1, data: { tourSeen: true },
    });
  });

  it('preserves existing settings when seeding the tour, including on relaunch', () => {
    const { root } = plan();
    const stateRoot = join(root, 'state');
    const path = join(stateRoot, 'settings.json');
    const settings = { harness: 'codex', analyticsEnabled: false, tourSeen: false, tipsPillDismissed: true };
    writeStateFile(path, 1, settings);
    for (let launchCount = 0; launchCount < 2; launchCount++) {
      prepareLaunch({ stateRoot, userDataDir: join(root, 'user-data'), tourSeen: true });
      expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ version: 1, data: { ...settings, tourSeen: true } });
    }
  });

  it('leaves tour state untouched unless requested', () => {
    const { root } = plan({ tourSeen: false });
    const stateRoot = join(root, 'state');
    const path = join(stateRoot, 'settings.json');
    expect(existsSync(path)).toBe(false);
    writeStateFile(path, 1, { tourSeen: false, analyticsEnabled: false });
    const before = readFileSync(path, 'utf8');
    prepareLaunch({ stateRoot, userDataDir: join(root, 'user-data') });
    prepareLaunch({ stateRoot, userDataDir: join(root, 'user-data'), tourSeen: false });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('refuses unsupported settings without replacing them', () => {
    const { root } = plan();
    const stateRoot = join(root, 'state');
    const path = join(stateRoot, 'settings.json');
    for (const [version, data] of [[1, []], [1, null], [2, { tourSeen: false }]] as const) {
      writeStateFile(path, version, data);
      const before = readFileSync(path, 'utf8');
      expect(() => prepareLaunch({ stateRoot, userDataDir: join(root, 'user-data'), tourSeen: true })).toThrow('unsupported settings');
      expect(readFileSync(path, 'utf8')).toBe(before);
    }
  });

  it('never reaches the runner’s Claude store or git config: an empty Claude store under the state root, git config off', () => {
    const { root, launch } = plan();
    expect(launch.processEnv['CLAUDE_CONFIG_DIR']).toBe(join(root, 'state', 'claude-config'));
    expect(readdirSync(launch.processEnv['CLAUDE_CONFIG_DIR']!)).toEqual([]);
    expect(launch.processEnv['GIT_CONFIG_GLOBAL']).toBe('/dev/null');
  });

  it('is never a user session: no telemetry, no window, no first run', () => {
    const { env } = plan().launch;
    expect(env['STUDIO_TELEMETRY']).toBe('0');
    expect(env['AGENT_HEADLESS']).toBe('1');
    expect(env['STUDIO_FIRST_RUN']).toBe('0');
  });

  it('records what it set and never the runner’s environment', () => {
    const { launch } = plan();
    expect(launch.env['RUNNER_SECRET']).toBeUndefined();
    expect(launch.processEnv['RUNNER_SECRET']).toBe('not-for-the-handle');
  });

  it('gives the caller’s env the last word, an empty value included', () => {
    const { env } = plan({ env: { STUDIO_FIRST_RUN: '', STUDIO_TELEMETRY: '1' } }).launch;
    expect(env['STUDIO_FIRST_RUN']).toBe('');
    expect(env['STUDIO_TELEMETRY']).toBe('1');
  });

  it('writes no shim when the caller names its own Claude binary', () => {
    const { root, launch } = plan({ env: { STUDIO_CLAUDE_BIN: '/callers/claude' } });
    expect(launch.shim).toBeUndefined();
    expect(launch.processEnv['STUDIO_CLAUDE_BIN']).toBe('/callers/claude');
    expect(existsSync(join(root, 'state', 'claude-shim'))).toBe(false);
  });

  it('runs no Claude on a replayed stream: the connection check is pinned unless the caller pins it', () => {
    expect(plan({ env: { STUDIO_AGENT_REPLAY: '/r.jsonl' } }).launch.env['STUDIO_AGENT_PROBE']).toBe('ok');
    expect(plan({ env: { STUDIO_AGENT_REPLAY: '/r.jsonl', STUDIO_AGENT_PROBE: 'error' } }).launch.env['STUDIO_AGENT_PROBE']).toBe('error');
    expect(plan().launch.env['STUDIO_AGENT_PROBE']).toBeUndefined();
  });

  it('refuses a caller naming the machine’s own Claude store, where a real turn writes transcripts and memory', () => {
    for (const store of ['', join(homedir(), '.claude'), '/runner/claude/login']) {
      expect(() => plan({ env: { CLAUDE_CONFIG_DIR: store } })).toThrow('machine\'s own Claude store');
    }
    expect(plan({ env: { CLAUDE_CONFIG_DIR: '/scratch/claude-config' } }).launch.processEnv['CLAUDE_CONFIG_DIR']).toBe('/scratch/claude-config');
  });

  it('launches signed out on a runner that names a keychain login: its own login is a scratch one under the state root', () => {
    const { root, launch } = plan();
    expect(launch.processEnv['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toBe(join(root, 'state', 'claude-login'));
    delete process.env['CLAUDE_SECURESTORAGE_CONFIG_DIR'];
    const unnamed = plan();
    expect(unnamed.launch.processEnv['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toBe(join(unnamed.root, 'state', 'claude-login'));
  });

  it('opts a real turn into the machine’s keychain login: the runner’s named one, or the default when none is named', () => {
    expect(plan({ env: machineClaudeLogin() }).launch.processEnv['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toBe('/runner/claude/secure');
    delete process.env['CLAUDE_SECURESTORAGE_CONFIG_DIR'];
    expect(plan({ env: machineClaudeLogin() }).launch.processEnv['CLAUDE_SECURESTORAGE_CONFIG_DIR']).toBe('');
  });

  it('never reaches the runner’s Codex home: an empty one under the state root', () => {
    const { root, launch } = plan();
    expect(launch.processEnv['CODEX_HOME']).toBe(join(root, 'state', 'codex-home'));
    expect(readdirSync(launch.processEnv['CODEX_HOME']!)).toEqual([]);
  });

  it('opts a deliberate Codex drive into the machine’s Codex home: the runner’s named one, or ~/.codex when none is named', () => {
    expect(plan({ env: machineCodexHome() }).launch.processEnv['CODEX_HOME']).toBe('/runner/codex');
    delete process.env['CODEX_HOME'];
    expect(plan({ env: machineCodexHome() }).launch.processEnv['CODEX_HOME']).toBe(join(homedir(), '.codex'));
  });
});

describe('the install check', () => {
  const tree = (present: readonly string[]) => (path: string) => present.some((p) => path.endsWith(p));

  it('lists every marker an uninstalled worktree is missing', () => {
    expect(missingInstall('/w', tree([]))).toEqual([
      'node_modules',
      'node_modules/.bin/turbo',
      'apps/studio/node_modules/electron/path.txt',
    ]);
    expect(missingInstall('/w', tree(['node_modules', 'node_modules/.bin/turbo']))).toEqual([
      'apps/studio/node_modules/electron/path.txt',
    ]);
    expect(missingInstall('/w', () => true)).toEqual([]);
  });

  it('names the worktree and the command, and says nothing when the tree is installed', () => {
    const complaint = installComplaint('/w', missingInstall('/w', tree([])));
    expect(complaint).toContain('bun install');
    expect(complaint).toContain('/w');
    expect(installComplaint('/w', [])).toBeNull();
  });
});

describe('stopping a launch', () => {
  const marks = launchMarks({ userDataDir: '/s/a/user-data', stateRoot: '/s/a/state' });
  const row = (pid: number, ppid: number, pgid: number, args = 'x'): ProcessRow => ({ pid, ppid, pgid, args });

  it('takes main, its descendants, its group and the crash handler that carries its marks, and nothing else', () => {
    const rows = [
      row(1, 0, 1),
      row(10, 1, 10, 'Electron /s/a/out/main/index.js --user-data-dir=/s/a/user-data'),
      row(11, 10, 10, 'Electron Helper --type=utility'),
      row(12, 1, 10, 'Electron Helper (Renderer) orphaned to launchd'),
      row(13, 11, 13, 'a shell the helper started in its own group'),
      row(20, 1, 20, 'chrome_crashpad_handler --database=/s/a/state/crashes'),
      row(30, 1, 30, 'Electron --user-data-dir=/s/b/user-data'),
      row(31, 1, 31, 'chrome_crashpad_handler --database=/s/b/state/crashes'),
      row(40, 1, 40, 'bun walk.ts --user-data-dir=/s/a/user-data'),
    ];
    expect(launchProcesses(rows, 10, marks, 40).map((r) => r.pid)).toEqual([10, 11, 12, 13, 20]);
  });

  it('returns only once every process is gone, including a detached helper and a crash handler outside its tree', async () => {
    const root = mkdtempSync(join(tmpdir(), 'launch-stop-'));
    roots.push(root);
    const launch = { userDataDir: join(root, 'user-data'), stateRoot: join(root, 'state') };
    const stubborn = 'perl -MPOSIX=setsid -e "\\$SIG{TERM}=q(IGNORE); setsid(); sleep 10"';
    const main = spawn('/bin/sh', ['-c', `${stubborn} & wait`, 'sh', `--user-data-dir=${launch.userDataDir}`], { detached: true, stdio: 'ignore' });
    spawn('perl', ['-e', '$SIG{TERM}="IGNORE"; sleep 10', '--', `--database=${join(launch.stateRoot, 'crashes')}`], { detached: true, stdio: 'ignore' });
    const mainPid = main.pid!;
    let started: ProcessRow[] = [];
    try {
      for (let tries = 0; tries < 100; tries++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        started = launchProcesses(listProcesses(), mainPid, launchMarks(launch));
        if (started.length === 3 && started.some((process) => process.ppid === mainPid && process.pgid === process.pid)) break;
      }
      expect(started.length).toBe(3);
      expect(started.some((process) => process.ppid === mainPid && process.pgid === process.pid)).toBe(true);

      await stopLaunch(mainPid, launchMarks(launch), { graceMs: 50 });

      const left = listProcesses().filter((process) => started.some((initial) => initial.pid === process.pid && initial.args === process.args));
      expect(left).toEqual([]);
    } finally {
      const remaining = listProcesses().filter((process) => started.some((initial) => initial.pid === process.pid && initial.args === process.args));
      for (const remainingProcess of remaining) {
        try {
          process.kill(remainingProcess.pid, 'SIGKILL');
        } catch {}
      }
    }
  });

  it('waits for a detached child after main exits, including its disappearance after SIGKILL', async () => {
    const alive = new Set([900_010, 900_011, 900_013]);
    const signals: string[] = [];
    let killed = false;
    let postKillReads = 0;
    const kill = spyOn(process, 'kill').mockImplementation(((pid: number, signal?: string | number) => {
      if (!alive.has(pid)) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      if (signal === 0) return true;
      signals.push(`${String(pid)} ${String(signal)}`);
      if (pid === 900_010) {
        alive.delete(900_010);
        alive.delete(900_011);
      }
      if (signal === 'SIGKILL') killed = true;
      return true;
    }) as typeof process.kill);
    const list = (): ProcessRow[] => {
      if (killed && ++postKillReads === 3) alive.delete(900_013);
      return [
        row(900_010, 1, 900_010, 'Electron --user-data-dir=/s/a/user-data'),
        row(900_011, 900_010, 900_010, 'Electron Helper --type=utility'),
        row(900_013, alive.has(900_010) ? 900_011 : 1, 900_013, 'a shell the helper started in its own group'),
      ].filter((process) => alive.has(process.pid));
    };
    try {
      await stopLaunch(900_010, marks, { graceMs: 20, list });
    } finally {
      kill.mockRestore();
    }
    expect(signals).toEqual(['900010 SIGTERM', '900013 SIGKILL']);
    expect(postKillReads).toBe(3);
  });

  it('waits for a reparented child to exit during grace without sending SIGKILL', async () => {
    let mainAlive = true;
    let childExited = false;
    const signals: string[] = [];
    const kill = spyOn(process, 'kill').mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0) return true;
      signals.push(`${String(pid)} ${String(signal)}`);
      mainAlive = false;
      return true;
    }) as typeof process.kill);
    let orphanReads = 0;
    const list = (): ProcessRow[] => {
      if (!mainAlive && ++orphanReads === 2) childExited = true;
      return [
        ...(mainAlive ? [row(900_010, 1, 900_010)] : []),
        ...(!childExited ? [row(900_013, mainAlive ? 900_010 : 1, 900_013, 'detached child')] : []),
      ];
    };
    try {
      await stopLaunch(900_010, marks, { graceMs: 1_000, list });
    } finally {
      kill.mockRestore();
    }
    expect(childExited).toBe(true);
    expect(signals).toEqual(['900010 SIGTERM']);
  });

  it('keeps caller, sibling launches, changed-argument pids and unseen unmarked processes untouched', async () => {
    const alive = new Set([900_010, 900_013, 900_014, 900_030, 900_031, 900_032, process.pid]);
    const signals: string[] = [];
    const kill = spyOn(process, 'kill').mockImplementation(((pid: number, signal?: string | number) => {
      if (signal === 0) return alive.has(pid);
      signals.push(`${String(pid)} ${String(signal)}`);
      alive.delete(pid);
      return true;
    }) as typeof process.kill);
    const list = (): ProcessRow[] => {
      const mainAlive = alive.has(900_010);
      return [
        row(900_010, 1, 900_010),
        row(900_013, mainAlive ? 900_010 : 1, 900_013, 'detached child'),
        row(900_014, mainAlive ? 900_010 : 1, 900_014, mainAlive ? 'original child' : 'unrelated replacement'),
        row(900_030, 1, 900_030, 'Electron --user-data-dir=/s/b/user-data'),
        row(process.pid, 1, process.pid, 'bun walk.ts --user-data-dir=/s/a/user-data'),
        ...(!mainAlive ? [
          row(900_031, 1, 900_031, 'unseen unmarked process'),
          row(900_032, 1, 900_032, 'chrome_crashpad_handler --database=/s/a/state/crashes'),
        ] : []),
      ].filter((process) => alive.has(process.pid));
    };
    try {
      await stopLaunch(900_010, marks, { graceMs: 0, list });
    } finally {
      kill.mockRestore();
    }
    expect(signals).toEqual(['900010 SIGTERM', '900013 SIGKILL', '900032 SIGKILL']);
    expect([...alive]).toEqual([900_014, 900_030, 900_031, process.pid]);
  });
});
