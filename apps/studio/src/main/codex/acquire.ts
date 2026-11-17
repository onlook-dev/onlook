import { createHash } from 'node:crypto';
import { createWriteStream, type WriteStream } from 'node:fs';
import { mkdtemp, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkHealth, resolveCodex } from '../agent-host/appserver/resolve.js';
import { CODEX_VERSION, codexInstallRoot, codexPlatformTag } from './paths.js';
import { hostPlatform, isWindows, systemExecutable } from '../env/platform.js';
import { APP_ENV, startChild } from '../env/child.js';
import { messageOf } from '../errors/message.js';

/** Absolute: a `tar` shadowed on PATH would unpack the tree Studio then executes. */
const TAR = isWindows()
  ? systemExecutable('tar.exe')
  : '/usr/bin/tar';

const REGISTRY = 'https://registry.npmjs.org';

const STAGING_PREFIX = '.codex-staging-';

const METADATA_TIMEOUT_MS = 30_000;

const STALL_TIMEOUT_MS = 60_000;

const UNPACK_TIMEOUT_MS = 300_000;

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes?: number;
}

export type AcquireFailure = 'metadata' | 'prepare' | 'integrity' | 'download';

/** `message` carries paths and raw errors: the log reads it, the setup card does not (ONL-2459). */
export type AcquireResult =
  | { outcome: 'ok'; root: string; bin: string; downloaded: boolean }
  | { outcome: 'unsupported'; message: string }
  /** `failed` is retryable; `broken` arrived intact and a retry repeats it. */
  | { outcome: 'failed'; failure: AcquireFailure; message: string }
  | { outcome: 'broken'; message: string };

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export interface AcquireOptions {
  cacheRoot: string;
  force?: boolean;
  version?: string;
  /** An explicit `undefined` means unsupported; only an absent key detects. */
  platformTag?: string | undefined;
  registryBase?: string;
  fetch?: FetchLike;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
  metadataTimeoutMs?: number;
  stallTimeoutMs?: number;
}

interface VersionDocument {
  dist?: { tarball?: unknown; integrity?: unknown };
}

export async function acquireCodex(options: AcquireOptions): Promise<AcquireResult> {
  const version = options.version ?? CODEX_VERSION;
  const platformTag =
    'platformTag' in options ? options.platformTag : codexPlatformTag();
  const root = codexInstallRoot(version, options.cacheRoot);

  const existing = checkHealth(resolveCodex(root), root);
  if (!options.force && existing.ok && existing.bin !== undefined) {
    return { outcome: 'ok', root, bin: existing.bin, downloaded: false };
  }

  if (platformTag === undefined) {
    return {
      outcome: 'unsupported',
      message: `no codex runtime is published for ${hostPlatform()}/${process.arch}`,
    };
  }

  const doFetch = options.fetch ?? ((url, init) => fetch(url, init));
  const registry = options.registryBase ?? REGISTRY;

  let dist: { tarball: string; integrity: string };
  try {
    dist = await readDist(
      doFetch,
      registry,
      version,
      platformTag,
      options.metadataTimeoutMs ?? METADATA_TIMEOUT_MS,
      options.signal,
    );
  } catch (error) {
    return {
      outcome: 'failed',
      failure: 'metadata',
      message: `could not read codex release metadata: ${messageOf(error)}`,
    };
  }

  let staging: string;
  try {
    await mkdir(options.cacheRoot, { recursive: true });
    await sweepStaging(options.cacheRoot);
    staging = await mkdtemp(join(options.cacheRoot, STAGING_PREFIX));
  } catch (error) {
    return {
      outcome: 'failed',
      failure: 'prepare',
      message: `could not prepare ${options.cacheRoot}: ${messageOf(error)}`,
    };
  }
  const archive = join(staging, 'codex.tgz');

  try {
    const digest = await download(
      doFetch,
      dist.tarball,
      archive,
      options.stallTimeoutMs ?? STALL_TIMEOUT_MS,
      options.onProgress,
      options.signal,
    );

    // Before the unpack: the only moment the bytes are inert.
    if (digest !== dist.integrity) {
      return {
        outcome: 'failed',
        failure: 'integrity',
        message: `codex download failed its integrity check — expected ${dist.integrity}, got ${digest}`,
      };
    }

    const unpacked = join(staging, 'tree');
    await mkdir(unpacked, { recursive: true });
    await untar(archive, unpacked);

    // The rename is the completion marker: a torn unpack at the versioned path would be cached forever.
    const staged = checkHealth(resolveCodex(unpacked), unpacked);
    if (!staged.ok) {
      return {
        outcome: 'broken',
        message: `the downloaded codex is not one we can drive: ${staged.problems.join('; ')}`,
      };
    }

    await rm(root, { recursive: true, force: true });
    await rename(unpacked, root);

    const settled = checkHealth(resolveCodex(root), root);
    if (!settled.ok || settled.bin === undefined) {
      return { outcome: 'broken', message: settled.problems.join('; ') };
    }
    return { outcome: 'ok', root, bin: settled.bin, downloaded: true };
  } catch (error) {
    return { outcome: 'failed', failure: 'download', message: messageOf(error) };
  } finally {
    // A throw here would replace the result the caller is owed with a rejection.
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** A quit or a crash never reaches the `finally`; unswept, a staging tree is permanent. */
async function sweepStaging(cacheRoot: string): Promise<void> {
  const entries = await readdir(cacheRoot).catch((): string[] => []);
  await Promise.all(
    entries
      .filter((entry) => entry.startsWith(STAGING_PREFIX))
      .map((entry) =>
        rm(join(cacheRoot, entry), { recursive: true, force: true }).catch(() => undefined),
      ),
  );
}

/** `dist.tarball` is followed as advertised: the registry owns that address. */
async function readDist(
  doFetch: FetchLike,
  registry: string,
  version: string,
  platformTag: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ tarball: string; integrity: string }> {
  const url = `${registry}/@openai/codex/${version}-${platformTag}`;
  const deadline = new Deadline(timeoutMs, `${url} did not answer in time`, signal);
  try {
    const response = await Promise.race([doFetch(url, { signal: deadline.signal }), deadline.expiry]);
    if (!response.ok) throw new Error(`${url} answered ${String(response.status)}`);
    const document = (await Promise.race([response.json(), deadline.expiry])) as VersionDocument;
    const tarball = document.dist?.tarball;
    const integrity = document.dist?.integrity;
    if (typeof tarball !== 'string' || typeof integrity !== 'string') {
      throw new Error(`${url} carried no dist.tarball/dist.integrity`);
    }
    return { tarball, integrity };
  } catch (error) {
    throw deadline.translate(error);
  } finally {
    deadline.clear();
  }
}

/** The length comes off this GET: the registry's HEAD carries no `content-length`. */
async function download(
  doFetch: FetchLike,
  url: string,
  destination: string,
  stallTimeoutMs: number,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  const deadline = new Deadline(
    stallTimeoutMs,
    `the codex download stalled — no data for ${String(Math.round(stallTimeoutMs / 1000))}s`,
    signal,
  );

  let response: Response;
  try {
    response = await Promise.race([doFetch(url, { signal: deadline.signal }), deadline.expiry]);
    if (!response.ok) throw new Error(`${url} answered ${String(response.status)}`);
    if (response.body === null) throw new Error(`${url} answered with no body`);
  } catch (error) {
    deadline.clear();
    throw deadline.translate(error);
  }

  const declared = response.headers.get('content-length');
  const totalBytes = declared === null ? undefined : Number(declared);
  const hash = createHash('sha512');
  const file = createWriteStream(destination);
  // Attached before the first write: `ENOSPC` arrives outside every `try` and, unlistened, is an uncaught exception in main.
  let writeError: Error | undefined;
  file.on('error', (error: Error) => (writeError ??= error));
  let receivedBytes = 0;
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();

  try {
    for (;;) {
      const next = await Promise.race([reader.read(), deadline.expiry]);
      if (writeError !== undefined) throw writeError;
      if (next.done) break;
      const chunk = next.value;
      deadline.extend();
      hash.update(chunk);
      receivedBytes += chunk.byteLength;
      if (!file.write(chunk)) await drain(file);
      onProgress?.({ receivedBytes, ...(totalBytes === undefined ? {} : { totalBytes }) });
    }
  } catch (error) {
    if (writeError !== undefined) throw writeError;
    throw deadline.translate(error);
  } finally {
    deadline.clear();
    await reader.cancel().catch(() => undefined);
    await closeStream(file);
  }
  if (writeError !== undefined) throw writeError;

  if (totalBytes !== undefined && receivedBytes !== totalBytes) {
    throw new Error(
      `codex download ended early — ${String(receivedBytes)} of ${String(totalBytes)} bytes`,
    );
  }

  return `sha512-${hash.digest('base64')}`;
}

async function untar(archive: string, into: string, timeoutMs = UNPACK_TIMEOUT_MS): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = startChild(TAR, ['-xzf', archive, '-C', into, '--strip-components=1'], {
      env: APP_ENV,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => (stderr += chunk));

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`unpacking the codex archive did not finish in ${String(timeoutMs)}ms`));
    }, timeoutMs);
    timer.unref?.();
    const settle = (finish: () => void): void => {
      clearTimeout(timer);
      finish();
    };

    child.on('error', (error) => settle(() => reject(error)));
    child.on('exit', (code) => {
      settle(() => {
        if (code === 0) resolve();
        else reject(new Error(`tar exited ${String(code)}: ${stderr.trim()}`));
      });
    });
  });
}

/** An errored stream never drains. */
function drain(file: WriteStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const onDrain = (): void => {
      file.off('error', onError);
      resolve();
    };
    const onError = (error: Error): void => {
      file.off('drain', onDrain);
      reject(error);
    };
    file.once('drain', onDrain);
    file.once('error', onError);
  });
}

/** `close` rather than `finish`: an errored stream destroys itself and never finishes. */
function closeStream(file: WriteStream): Promise<void> {
  return new Promise((resolve) => {
    if (file.closed || file.destroyed) {
      resolve();
      return;
    }
    file.once('close', () => resolve());
    file.end();
  });
}

/** `expiry` is raced against every await: an injected `fetch` may not honour the abort signal. */
class Deadline {
  private readonly controller = new AbortController();
  private readonly fail: (error: Error) => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private tripped = false;
  readonly expiry: Promise<never>;
  private readonly ms: number;
  private readonly message: string;

  constructor(ms: number, message: string, external?: AbortSignal) {
    this.ms = ms;
    this.message = message;
    let fail: (error: Error) => void = () => undefined;
    this.expiry = new Promise<never>((_, reject) => (fail = reject));
    // Held so an unconsumed race arm is never an unhandled rejection.
    this.expiry.catch(() => undefined);
    this.fail = fail;

    if (external !== undefined) {
      if (external.aborted) this.controller.abort(external.reason);
      else {
        external.addEventListener('abort', () => this.controller.abort(external.reason), {
          once: true,
        });
      }
    }
    this.extend();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  extend(): void {
    if (this.ms <= 0) return;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.tripped = true;
      const error = new Error(this.message);
      this.controller.abort(error);
      this.fail(error);
    }, this.ms);
    this.timer.unref?.();
  }

  clear(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  translate(error: unknown): unknown {
    return this.tripped ? new Error(this.message) : error;
  }
}
