import { type CliResult, runCli } from '../env/cli.js';
import { devSwitches } from '../env/dev-switches.js';

export const GH_TIMEOUT_MS = 20_000;

export type GhResult = CliResult;

export type GhRunner = (cwd: string, args: string[]) => Promise<GhResult>;

function ghBinary(): string {
  return devSwitches.ghBin || 'gh';
}

export function gh(cwd: string, args: string[]): Promise<GhResult> {
  return runCli(ghBinary(), cwd, args, {
    timeoutMs: GH_TIMEOUT_MS,
    env: { GH_PROMPT_DISABLED: '1', GH_NO_UPDATE_NOTIFIER: '1', NO_COLOR: '1' },
  });
}
