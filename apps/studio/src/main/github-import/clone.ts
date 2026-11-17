import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { GithubCloneFailure } from '@studio/events';
import type { GithubCredential } from './backend.js';
import { cloneFailure, cloneProgress, validCredential, withGitCredential } from './git.js';
import { completeClone, trackClone } from './pending.js';

export type CloneResult = { ok: true; sourcePath: string } | { ok: false; failure: GithubCloneFailure };

export interface GithubCloneNetwork {
  author(credential: Extract<GithubCredential, { status: 'ready' }>, signal: AbortSignal): Promise<{ id: number; login: string }>;
  withCredential: typeof withGitCredential;
}

const network: GithubCloneNetwork = {
  withCredential: withGitCredential,
  async author(credential, signal) {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${credential.password}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Onlook-Studio' },
      redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'access' : 'network');
    return await response.json() as { id: number; login: string };
  },
};

export async function cloneRepository(options: {
  credential: Extract<GithubCredential, { status: 'ready' }>;
  repository: string;
  branch: string;
  parent: string;
  signal: AbortSignal;
  progress(value: number, path: string): void;
}, transport: GithubCloneNetwork = network): Promise<CloneResult> {
  if (!validCredential(options.credential, options.repository)) return { ok: false, failure: 'access' };
  let owned: string | undefined;
  let completed = false;
  const attempt = async (): Promise<CloneResult> => {
  try {
    if (options.signal.aborted) return { ok: false, failure: 'cancelled' };
    const author: unknown = await transport.author(options.credential, options.signal);
    if (typeof author !== 'object' || author === null || !('id' in author) || !('login' in author)
      || typeof author.id !== 'number' || !Number.isSafeInteger(author.id) || author.id < 1 || typeof author.login !== 'string' || !/^[A-Za-z0-9-]+$/.test(author.login)) {
      return { ok: false, failure: 'access' };
    }
    const name = author.login;
    const email = `${String(author.id)}+${name}@users.noreply.github.com`;
    await mkdir(options.parent, { recursive: true });
    owned = await mkdtemp(join(options.parent, `${options.repository.split('/')[1]}-`));
    await trackClone(owned);
    const sourcePath = join(owned, options.repository.split('/')[1]!);
    let progress = 0;
    options.progress(progress, sourcePath);
    return await transport.withCredential(options.credential, async (run) => {
      const cloned = await run(['clone', '--progress', '--single-branch', ...(options.branch ? ['--branch', options.branch] : []), '--', options.credential.remoteUrl, sourcePath], {
        signal: options.signal,
        onStderr: (chunk) => {
          progress = cloneProgress(progress, chunk);
          options.progress(progress, sourcePath);
        },
      });
      if (!cloned.ok || options.signal.aborted) return { ok: false, failure: cloneFailure(cloned, options.signal.aborted) };
      const head = await run(['-C', sourcePath, 'rev-parse', '--verify', 'HEAD'], { signal: options.signal });
      if (!head.ok) return { ok: false, failure: 'empty' };
      for (const [key, value] of [['user.name', name], ['user.email', email]]) {
        const configured = await run(['-C', sourcePath, 'config', '--local', key!, value!], { signal: options.signal });
        if (!configured.ok || options.signal.aborted) return { ok: false, failure: options.signal.aborted ? 'cancelled' : 'unknown' };
      }
      if (options.signal.aborted) return { ok: false, failure: 'cancelled' };
      await completeClone(owned!);
      completed = true;
      options.progress(100, sourcePath);
      return { ok: true, sourcePath };
    });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined;
    return { ok: false, failure: options.signal.aborted ? 'cancelled' : error instanceof Error && error.message === 'access' ? 'access' : code === 'ENOSPC' ? 'disk'
      : code === 'EACCES' || code === 'ENOENT' || code === 'EPERM' ? 'destination' : 'network' };
  }
  };
  const result = await attempt();
  if (!completed && owned !== undefined) {
    try {
      await rm(owned, { recursive: true, force: true });
      await completeClone(owned);
    } catch { return { ok: false, failure: 'cleanup' }; }
  }
  return result;
}
