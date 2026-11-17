import type { GitMeasuredPullRequest } from '@studio/events';
import type { GhResult, GhRunner } from '../gh.js';
import { ghReader, type RawPullRequest, type RawRepoView } from './gh-reader.js';
import type { GitHubReader } from './reader.js';

export function ok(out: string): GhResult {
  return { ok: true, out, err: '', timedOut: false, missing: false, exitCode: 0 };
}
export const FAIL: GhResult = { ok: false, out: '', err: 'boom', timedOut: false, missing: false, exitCode: 1 };
export const TIMEOUT: GhResult = { ok: false, out: '', err: '', timedOut: true, missing: false, exitCode: null };
export const MISSING: GhResult = { ok: false, out: '', err: 'spawn gh ENOENT', timedOut: false, missing: true, exitCode: null };

export function rawPr(overrides: Partial<RawPullRequest>): RawPullRequest {
  return {
    number: 1,
    url: 'https://github.com/onlook-dev/fixture/pull/1',
    state: 'OPEN',
    isDraft: false,
    mergeStateStatus: 'CLEAN',
    statusCheckRollup: [],
    baseRefName: 'main',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

export type ForkParent = NonNullable<RawRepoView['parent']>;

export const PARENT: ForkParent = { id: 'R_up', name: 'stream', owner: { id: 'O_up', login: 'up' } };

export function forkView(viewerPermission: string, parent: ForkParent | null = PARENT): GhResult {
  return ok(JSON.stringify({ viewerPermission, nameWithOwner: 'onlook-dev/fixture', isFork: parent !== null, parent }));
}

export interface GhScript {
  version?: GhResult;
  auth?: GhResult;
  authText?: GhResult;
  repo?: GhResult;
  views?: Record<string, GhResult>;
  prs?: GhResult;
  lists?: Record<string, GhResult>;
}

const AUTHED_AS_WREN = JSON.stringify({
  hosts: { 'github.com': [{ state: 'success', login: 'wrenquill', active: true }] },
});

export function scriptedGh(script: GhScript, cwd = '/tmp/any'): { runner: GhRunner; reader: GitHubReader; calls: string[][] } {
  const calls: string[][] = [];
  const runner: GhRunner = async (_cwd, args) => {
    calls.push(args);
    if (args[0] === '--version') return script.version ?? ok('gh version 2.0.0');
    if (args[0] === 'auth') return args.includes('--json') ? (script.auth ?? ok(AUTHED_AS_WREN)) : (script.authText ?? FAIL);
    if (args[0] === 'repo') {
      const slug = args[2] === '--json' ? undefined : args[2];
      return (slug === undefined ? undefined : script.views?.[slug]) ?? script.repo ?? ok(JSON.stringify({ viewerPermission: 'WRITE' }));
    }
    if (args[0] === 'pr') {
      const slug = args[2] === '-R' ? args[3] : undefined;
      return (slug === undefined ? undefined : script.lists?.[slug]) ?? script.prs ?? ok('[]');
    }
    return FAIL;
  };
  return { runner, reader: ghReader(cwd, runner), calls };
}

type Answer<K extends keyof GitHubReader> = GitHubReader[K] | Awaited<ReturnType<GitHubReader[K]>>;

export type ReaderAnswers = { [K in keyof GitHubReader]?: Answer<K> };

export function scriptedReader(answers: ReaderAnswers): { reader: GitHubReader; asked: string[] } {
  const asked: string[] = [];
  const ask = <K extends keyof GitHubReader>(name: K, fallback: Awaited<ReturnType<GitHubReader[K]>>) =>
    ((...args: Parameters<GitHubReader[K]>) => {
      asked.push(name);
      const answer = answers[name];
      if (typeof answer === 'function') {
        return (answer as (...a: Parameters<GitHubReader[K]>) => ReturnType<GitHubReader[K]>)(...args);
      }
      return Promise.resolve(answer ?? fallback);
    }) as GitHubReader[K];
  return {
    asked,
    reader: {
      present: ask('present', { ok: true, value: true }),
      identity: ask('identity', { ok: true, value: { account: 'wrenquill' } }),
      access: ask('access', { ok: true, value: { permission: 'granted' } }),
      pullRequests: ask('pullRequests', { ok: true, value: [] as GitMeasuredPullRequest[] }),
    },
  };
}
