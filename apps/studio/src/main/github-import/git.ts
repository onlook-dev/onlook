import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GithubCloneFailure } from '@studio/events';
import type { CliResult } from '../env/cli.js';
import { runGit, untrustedCloneGitConfig } from '../env/git.js';
import { userEnv } from '../env/shell-env.js';
import type { GithubCredential } from './backend.js';
import { hostCurlPath, isWindows, nullDevice } from '../env/platform.js';

type Credential = Extract<GithubCredential, { status: 'ready' }>;

export function cloneFailure(result: Pick<CliResult, 'err'>, cancelled = false): GithubCloneFailure {
  if (cancelled) return 'cancelled';
  if (/no space left|disk full|ENOSPC/i.test(result.err)) return 'disk';
  if (/authentication failed|not found|access denied|403|401|could not read Username/i.test(result.err)) return 'access';
  if (/empty repository|remote branch .* not found/i.test(result.err)) return 'empty';
  if (/resolve host|connect|timed out|early EOF|RPC failed|SSL|TLS/i.test(result.err)) return 'network';
  return 'unknown';
}

export function cloneProgress(previous: number, chunk: string): number {
  let next = previous;
  for (const match of chunk.matchAll(/(Receiving objects|Resolving deltas|Updating files):\s+(\d+)%/g)) {
    const percent = Math.min(100, Number(match[2]));
    const weighted = match[1] === 'Receiving objects' ? percent * 0.8
      : match[1] === 'Resolving deltas' ? 80 + percent * 0.15 : 95 + percent * 0.04;
    next = Math.max(next, Math.floor(weighted));
  }
  return next;
}

export function validCredential(credential: Credential, repository: string, now = Date.now()): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    && repository.split('/').every((part) => part !== '.' && part !== '..')
    && credential.remoteUrl === `https://github.com/${repository}.git`
    && credential.username === 'x-access-token'
    && typeof credential.password === 'string' && credential.password.length > 0
    && !/[\r\n\0]/.test(credential.password)
    && Number.isFinite(credential.expiresAt) && credential.expiresAt > now + 30_000
    && credential.expiresAt <= now + 8 * 60 * 60 * 1000;
}

// Binding a Unix socket fails on a path near 104 bytes, and a configured temporary directory can sit arbitrarily deep (ONL-3203).
function credentialSocketRoot(): string {
  const configured = tmpdir();
  const socketPath = join(configured, 'onlook-github-XXXXXX', 'credential.sock');
  return isWindows() || Buffer.byteLength(socketPath) <= 100 ? configured : '/tmp';
}

export async function withGitCredential<Result>(credential: Credential, work: (run: (args: string[], options?: {
  signal?: AbortSignal; onStderr?: (chunk: string) => void;
  stdin?: string; timeoutMs?: number;
}) => Promise<CliResult>) => Promise<Result>): Promise<Result> {
  const directory = await mkdtemp(join(credentialSocketRoot(), 'onlook-github-'));
  const nonce = randomUUID();
  const helper = join(directory, 'helper.conf');
  const socket = join(directory, 'credential.sock');
  const remote = new URL(credential.remoteUrl);
  const server = createServer((request, response) => {
    request.socket.setTimeout(2000, () => request.destroy());
    response.setHeader('Connection', 'close');
    let input = '';
    request.on('data', (chunk: Buffer) => {
      input += chunk.toString();
      if (input.length > 8192) request.destroy();
    });
    request.on('end', () => {
      const fields = Object.fromEntries(input.trimEnd().split('\n').map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }));
      const allowed = request.method === 'POST' && request.url === '/' && request.headers['x-onlook-nonce'] === nonce
        && fields['protocol'] === 'https'
        && fields['host'] === remote.host && fields['path'] === remote.pathname.slice(1)
        && Date.now() < credential.expiresAt;
      response.writeHead(allowed ? 200 : 403);
      response.end(allowed ? `username=${credential.username}\npassword=${credential.password}\n\n` : '\n');
    });
    request.on('error', () => {});
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      // A path listens as a named pipe on Windows, which curl cannot reach, so only there is it a loopback port (ONL-3203).
      if (isWindows()) server.listen(0, '127.0.0.1', resolve); else server.listen(socket, resolve);
    });
    const address = server.address();
    if (address === null) throw new Error('Credential listener unavailable');
    const endpoint = typeof address === 'string'
      ? [`unix-socket = ${JSON.stringify(address)}`, 'url = "http://localhost/"']
      : [`url = ${JSON.stringify(`http://127.0.0.1:${address.port}/`)}`];
    await writeFile(helper, [
      'silent', 'show-error', 'fail', 'noproxy = "*"', 'max-time = 2', 'proto = "=http"',
      ...endpoint, `header = "X-Onlook-Nonce: ${nonce}"`,
      '',
    ].join('\n'), { mode: 0o600 });
    const inherited = await userEnv();
    const noFile = nullDevice();
    const unset = Object.keys(inherited).filter((key) => /^(GIT_|SSH_|NODE_OPTIONS$|NODE_PATH$|ELECTRON_)/i.test(key));
    const env = {
      GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: noFile, GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: '', SSH_ASKPASS: '', GIT_LFS_SKIP_SMUDGE: '1',
    };
    const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
    const helperCommand = `!credential() { if test "$1" = get; then ${quote(hostCurlPath())} --disable --config ${quote(helper.replaceAll('\\', '/'))} --data-binary @-; fi; }; credential`;
    const safety = untrustedCloneGitConfig(helperCommand);
    return await work((args, options = {}) => runGit(directory, args, {
      config: safety, timeoutMs: 15 * 60 * 1000, maxBuffer: 1024 * 1024, ...options,
      unset: unset.filter((key) => !(key in env)), env,
    }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}
