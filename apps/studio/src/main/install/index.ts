import { mergeEnv, userEnv } from '../env/shell-env.js';
import { detectInstall, snapshotDir, type InstallPlan, type PackageManager } from './detect.js';
import { appendInstallLog } from './log.js';
import { packageManagerPath, resolvePackageManager } from './resolve.js';
import { runCli } from '../env/cli.js';
import type { DeadlineClock } from '../env/deadline.js';
import { log } from '../log/index.js';
import { t } from '@studio/i18n';

const logger = log('install');

// The tail: a manager prints its progress first and its reason last.
const ERR_TAIL = 2_000;

function tail(text: string): string {
  return text.length > ERR_TAIL ? `…${text.slice(-ERR_TAIL)}` : text;
}

function describe(plan: InstallPlan): string {
  return [plan.command, ...plan.args].join(' ');
}

const INSTALL_TIMEOUT_MS = 10 * 60_000;

export type InstallOutcome =
  | { outcome: 'skipped' }
  | { outcome: 'installed'; manager: PackageManager }
  | { outcome: 'failed'; manager: PackageManager; detail: string }
  | { outcome: 'canceled' };

export interface RunResult {
  ok: boolean;
  err: string;
  timedOut: boolean;
  aborted?: boolean;
  missing?: boolean;
}

export async function runInstall(
  plan: InstallPlan,
  cwd: string,
  options: { signal?: AbortSignal; abortGraceMs?: number; clock?: DeadlineClock } = {},
): Promise<RunResult> {
  const canceled: RunResult = { ok: false, err: '', timedOut: false, aborted: true };
  if (options.signal?.aborted) return canceled;
  const env = await userEnv();
  if (options.signal?.aborted) return canceled;
  const command = plan.command === plan.manager ? await resolvePackageManager(plan.manager, env, { cwd }) : plan.command;
  if (options.signal?.aborted) return canceled;
  if (!command) return { ok: false, err: '', timedOut: false, missing: true };
  const installEnv = mergeEnv(env, { GIT_TERMINAL_PROMPT: '0' });
  if (command !== plan.command) {
    installEnv['PATH'] = packageManagerPath(plan.manager, env);
  }
  const result = await runCli(command, cwd, plan.args, {
    env: installEnv,
    timeoutMs: INSTALL_TIMEOUT_MS,
    signal: options.signal,
    killGraceMs: options.abortGraceMs,
    clock: options.clock,
  });
  return {
    ok: result.ok, err: result.err, timedOut: result.timedOut,
    ...(options.signal?.aborted ? { aborted: true } : {}),
    ...(result.missing ? { missing: true } : {}),
  };
}

function installFailureDetail(plan: InstallPlan, result: RunResult): string {
  if (result.timedOut) return t('project.install.timedOut', { manager: plan.manager });
  if (result.missing) return t('project.install.managerMissing', { manager: plan.manager });
  if (result.err) return tail(result.err);
  return t('project.install.failed', { manager: plan.manager });
}

export async function autoInstall(
  workspacePath: string,
  runner: (plan: InstallPlan, cwd: string, signal?: AbortSignal) => Promise<RunResult> = runInstallWith,
  signal?: AbortSignal,
): Promise<InstallOutcome> {
  try {
    const plan = detectInstall(await snapshotDir(workspacePath));
    if (!plan) {
      logger.info('no package manager detected; continuing without installing');
      appendInstallLog(`skipped: no package manager detected in ${workspacePath}`);
      return { outcome: 'skipped' };
    }

    const result = await runner(plan, workspacePath, signal);
    if (result.aborted) {
      appendInstallLog(`canceled: ${describe(plan)} in ${workspacePath}`);
      return { outcome: 'canceled' };
    }
    if (!result.ok) {
      logger.warn(result.timedOut ? 'install timed out' : 'install failed', { manager: plan.manager, stderr: result.err });
      appendInstallLog(
        `failed: ${describe(plan)} in ${workspacePath}${result.timedOut ? ' — timed out' : ''}` +
          `${result.err ? `\n${tail(result.err)}` : ''}`,
      );
      const detail = installFailureDetail(plan, result);
      return { outcome: 'failed', manager: plan.manager, detail };
    }

    logger.info('install complete', { manager: plan.manager });
    appendInstallLog(`installed: ${describe(plan)} in ${workspacePath}`);
    return { outcome: 'installed', manager: plan.manager };
  } catch (error) {
    logger.warn('skipped', { error });
    appendInstallLog(`skipped: ${String(error)}`);
    return { outcome: 'skipped' };
  }
}

function runInstallWith(plan: InstallPlan, cwd: string, signal?: AbortSignal): Promise<RunResult> {
  return runInstall(plan, cwd, signal === undefined ? {} : { signal });
}

export { planFor } from './detect.js';
export type { InstallPlan } from './detect.js';
