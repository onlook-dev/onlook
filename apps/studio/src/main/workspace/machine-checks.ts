import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MACHINE_CHECK_IDS, type MachineCheck, type MachineCheckId, type MachineFailureCause } from '@studio/events';
import type { CliResult } from '../env/cli.js';
import { runGit, USER_GIT_CONFIG } from '../env/git.js';
import { pickStarterPort } from '../starter/port.js';
import { git, initializeRepository } from './git.js';
import { systemAuthorArgs } from '../starter/retire.js';
import { gitFailureCause, systemErrorCode, thrownCause } from './creation-failure.js';

export interface MachineCheckDeps {
  git(cwd: string, args: string[]): Promise<CliResult>;
  workspace(): Promise<void>;
  port(): Promise<unknown>;
  helper(): Promise<void>;
  failed(id: MachineCheckId): void;
}

function probeFailure(id: MachineCheckId, error: unknown): MachineFailureCause | 'inconclusive' {
  const failure = thrownCause(error);
  if (id === 'workspace') {
    if (failure === 'disk_full' || failure === 'permission_denied') return failure;
    const code = systemErrorCode(error);
    return code !== undefined && ['ENOTDIR', 'EEXIST', 'ENOENT', 'EIO'].includes(code) ? 'workspace_not_writable' : 'inconclusive';
  }
  if (id === 'port' && failure === 'no_free_port') return 'no_free_port';
  if (id === 'helper' && failure === 'starter_exited') return 'helper_failed';
  return 'inconclusive';
}

export async function checkGit(run: MachineCheckDeps['git']): Promise<MachineFailureCause | 'inconclusive' | undefined> {
  const scratch = await mkdtemp(join(tmpdir(), 'studio-git-check-'));
  try {
    const version = await run(scratch, ['--version']);
    if (!version.ok) return gitFailureCause(version);
    const initialized = await initializeRepository(scratch, run);
    if (!initialized.ok) return gitFailureCause(initialized);
    const committed = await run(scratch, [...systemAuthorArgs(), 'commit', '--quiet', '--allow-empty', '-m', 'Onlook machine check']);
    if (!committed.ok) return gitFailureCause(committed);
    const worktree = await run(scratch, ['worktree', 'add', '--no-track', '-b', 'onlook-check', join(scratch, 'worktree'), 'main']);
    if (!worktree.ok) return gitFailureCause(worktree);
    return undefined;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export async function checkProjectsFolder(folder: string): Promise<void> {
  await mkdir(folder, { recursive: true });
  const scratch = await mkdtemp(join(folder, '.onlook-check-'));
  try {
    await writeFile(join(scratch, 'write-test'), 'onlook', { flag: 'wx' });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

export function machineCheckDeps(folder: string, helper: () => Promise<void>, failed: MachineCheckDeps['failed']): MachineCheckDeps {
  return {
    git: (cwd, args) => args[0] === '--version'
      ? runGit(cwd, args, { config: USER_GIT_CONFIG, timeoutMs: 8_000 })
      : git(cwd, args, { timeoutMs: 8_000 }),
    workspace: () => checkProjectsFolder(folder),
    port: () => pickStarterPort(),
    helper,
    failed,
  };
}

export async function runMachineChecks(deps: MachineCheckDeps): Promise<MachineCheck[]> {
  return Promise.all(MACHINE_CHECK_IDS.map(async (id): Promise<MachineCheck> => {
    let cause: MachineFailureCause | 'inconclusive' | undefined;
    try {
      if (id === 'git') cause = await checkGit(deps.git);
      else await deps[id]();
    } catch (error) {
      cause = probeFailure(id, error);
    }
    if (cause === undefined) return { id, status: 'passed' };
    if (cause === 'inconclusive') return { id, status: 'inconclusive' };
    deps.failed(id);
    return { id, status: 'failed', cause };
  }));
}
