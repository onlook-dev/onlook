import { type CliResult, runCli } from '../env/cli.js';
import { devSwitches } from '../env/dev-switches.js';
import { githubCliEnv, isShellEnvFallback, mergeEnv } from '../env/shell-env.js';
import { isMac } from '../env/platform.js';

export const GH_TIMEOUT_MS = 20_000;

export type GhResult = CliResult;

export type GhRunner = (cwd: string, args: string[]) => Promise<GhResult>;

function ghBinary(): string {
  return devSwitches.ghBin || 'gh';
}

export async function gh(cwd: string, args: string[]): Promise<GhResult> {
  const env = await githubCliEnv();
  const result = await runCli(ghBinary(), cwd, args, {
    timeoutMs: GH_TIMEOUT_MS,
    env: mergeEnv(env, { GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' }),
  });
  return result.missing && isMac() && isShellEnvFallback(env) ? { ...result, missing: false } : result;
}
