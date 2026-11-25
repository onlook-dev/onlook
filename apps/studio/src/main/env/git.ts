import { dirname } from 'node:path';
import { type CliResult, type RunCliOptions, runCli } from './cli.js';
import { envWithout } from './child.js';
import { hostExecutable, hostSearchPath } from './executable.js';
import { hostSshPath, isMac, isWindows, nullDevice } from './platform.js';
import { gitExecutable } from './git-available.js';
import { mergeEnv, userEnv } from './shell-env.js';

export type GitResult = CliResult;

/** No `-c` setting at all: git on the user's own configuration. A named value, so an unhardened call says so. */
export const USER_GIT_CONFIG: readonly string[] = [];

export interface RunGitOptions extends RunCliOptions {
  /** `-c` settings in order, ahead of the command. */
  config: readonly string[];
}

export async function runGit(cwd: string, args: readonly string[], options: RunGitOptions, dependencies: {
  isMac: typeof isMac;
  gitExecutable: typeof gitExecutable;
  hostExecutable: typeof hostExecutable;
  userEnv: typeof userEnv;
  runCli: typeof runCli;
} = { isMac, gitExecutable, hostExecutable, userEnv, runCli }): Promise<GitResult> {
  const { config, ...rest } = options;
  if (dependencies.isMac()) {
    const environment = envWithout(mergeEnv(await dependencies.userEnv(), options.env), options.unset ?? []);
    const lookupEnv = options.searchPath === undefined ? environment : { ...environment, PATH: options.searchPath };
    const executable = await dependencies.gitExecutable(cwd, lookupEnv);
    if (executable === undefined) {
      return { ok: false, out: '', err: 'Git is unavailable without developer tools.', timedOut: false, missing: true, exitCode: null };
    }
    const original = dependencies.hostExecutable('git', cwd, { ...lookupEnv, PATH: hostSearchPath(cwd, lookupEnv) });
    if (executable !== original) rest.searchPath = dirname(executable);
  }
  return dependencies.runCli('git', cwd, [...config.flatMap((setting) => ['-c', setting]), ...args], rest);
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
