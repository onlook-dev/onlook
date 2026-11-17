import { type CliResult, type RunCliOptions, runCli } from './cli.js';
import { hostSshPath, isWindows, nullDevice } from './platform.js';

export type GitResult = CliResult;

/** No `-c` setting at all: git on the user's own configuration. A named value, so an unhardened call says so. */
export const USER_GIT_CONFIG: readonly string[] = [];

export interface RunGitOptions extends RunCliOptions {
  /** `-c` settings in order, ahead of the command. */
  config: readonly string[];
}

export function runGit(cwd: string, args: readonly string[], options: RunGitOptions): Promise<GitResult> {
  const { config, ...rest } = options;
  return runCli('git', cwd, [...config.flatMap((setting) => ['-c', setting]), ...args], rest);
}

function noRepositoryPrograms(): string[] {
  return [`core.hooksPath=${nullDevice()}`, 'core.fsmonitor=false'];
}

const NO_BACKGROUND_WORK = ['maintenance.auto=false', 'gc.auto=0'] as const;

/** For a Project's worktree and the repository behind it. */
export function worktreeGitConfig(): string[] {
  return [
    ...noRepositoryPrograms(),
    `core.sshCommand="${hostSshPath()}"`,
    'credential.helper=',
    'core.gitProxy=',
    'protocol.ext.allow=never',
    ...NO_BACKGROUND_WORK,
    ...(isWindows() ? ['core.longpaths=true'] : []),
  ];
}

/** For a repository cloned from GitHub on a short-lived credential: https only, and `helperCommand` the one helper. */
export function untrustedCloneGitConfig(helperCommand: string): string[] {
  return [
    ...noRepositoryPrograms(),
    'credential.helper=',
    `credential.helper=${helperCommand}`,
    'credential.useHttpPath=true',
    'http.followRedirects=false',
    'protocol.allow=never',
    'protocol.https.allow=always',
    'init.templateDir=',
    ...NO_BACKGROUND_WORK,
  ];
}
