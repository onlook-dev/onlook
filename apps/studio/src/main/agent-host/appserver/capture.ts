import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, constants, openSync, readFileSync, readdirSync, readSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { canonicalPath, pathSpellings } from '../../lib/canonical-path.js';
import { removeAtomicFile, writeAtomicFile } from '../../fs-atomic.js';
import { decodeStateFile } from '../../state/file.js';

const APPSERVER_MAPPING_VERSION = 1;
export const APPSERVER_CAPTURE_MAX_BYTES = 4 * 1_048_576;
export const APPSERVER_CAPTURE_TOTAL_MAX_BYTES = 32 * 1_048_576;
export const APPSERVER_CAPTURE_MAX_FILES = 32;

const CAPTURE_DIR = 'appserver-capture';
const HEADER_MAX_BYTES = 65_536;
const FILE_MODE = 0o600;

interface AppServerCaptureHeader {
  kind: 'appserver-capture-header';
  codexVersion: string;
  mappingVersion: number;
  startedAt: number;
  projectKey?: string;
}

interface CapturedFrame {
  at: number;
  dir: 'in' | 'out';
  frame: unknown;
}

const THREAD_ID_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

interface CaptureWriter {
  usable: boolean;
  bytes: number;
}

interface CaptureFile {
  path: string;
  threadId: string;
  bytes: number;
  modifiedAt: number;
  header?: AppServerCaptureHeader;
  writable: boolean;
  temporary: boolean;
}

const writers = new Map<string, CaptureWriter>();
const removedProjects = new Map<string, Set<string>>();
const totalBytesByRoot = new Map<string, number>();

function captureRoot(root: string): string {
  const resolved = resolve(root);
  const canonical = canonicalPath(resolved);
  if (canonical !== resolved || resolved === dirname(resolved)) return canonical;
  return join(captureRoot(dirname(resolved)), basename(resolved));
}

function projectKey(cwd: string): string {
  return createHash('sha256').update(cwd).digest('hex');
}

function readHeader(path: string): AppServerCaptureHeader | undefined {
  let descriptor: number;
  try {
    descriptor = openSync(path, 'r');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  try {
    const chunks: Buffer[] = [];
    let position = 0;
    let header: Buffer | undefined;
    while (position < HEADER_MAX_BYTES) {
      const bytes = Buffer.alloc(Math.min(512, HEADER_MAX_BYTES - position));
      const length = readSync(descriptor, bytes, 0, bytes.length, position);
      if (length === 0) break;
      const newline = bytes.subarray(0, length).indexOf(10);
      chunks.push(bytes.subarray(0, newline < 0 ? length : newline));
      position += length;
      if (newline >= 0) {
        header = Buffer.concat(chunks);
        break;
      }
    }
    if (header === undefined) throw new Error('capture has no complete header');
    const parsed = JSON.parse(header.toString('utf8')) as Partial<AppServerCaptureHeader> | null;
    if (parsed === null || typeof parsed !== 'object' || parsed.kind !== 'appserver-capture-header' ||
      typeof parsed.mappingVersion !== 'number' || !Number.isFinite(parsed.mappingVersion)) {
      throw new Error('capture has no versioned header');
    }
    return parsed as AppServerCaptureHeader;
  } finally {
    closeSync(descriptor);
  }
}

function supportedHeader(header: AppServerCaptureHeader): boolean {
  return decodeStateFile({ version: header.mappingVersion, data: header }, APPSERVER_MAPPING_VERSION).kind !== 'future';
}

function sealWriter(path: string): void {
  const writer = writers.get(path);
  if (writer !== undefined) writer.usable = false;
  writers.delete(path);
}

function inventory(root: string): CaptureFile[] {
  const directory = join(root, CAPTURE_DIR);
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const files: CaptureFile[] = [];
  for (const name of names) {
    const temp = /^(.*)\.jsonl\.\d+\.tmp$/.exec(name);
    if (!name.endsWith('.jsonl') && temp === null) continue;
    const temporary = temp !== null;
    const threadId = temp?.[1] ?? name.slice(0, -'.jsonl'.length);
    if (!isCapturableThreadId(threadId)) continue;
    const path = join(directory, name);
    const stats = statSync(path);
    if (!stats.isFile()) continue;
    let header: AppServerCaptureHeader | undefined;
    try {
      header = readHeader(path);
    } catch {}
    if (header === undefined && temporary) {
      try {
        header = readHeader(join(directory, `${threadId}.jsonl`));
      } catch {}
    }
    files.push({ path, threadId, bytes: stats.size, modifiedAt: stats.mtimeMs, header, writable: header === undefined ? temporary : supportedHeader(header), temporary });
  }
  const protectedIds = new Set(files.filter((file) => !file.writable).map((file) => file.threadId));
  for (const file of files) if (protectedIds.has(file.threadId)) file.writable = false;
  return files;
}

function boundedStream(path: string): Buffer {
  const descriptor = openSync(path, 'r');
  try {
    const bytes = Buffer.alloc(APPSERVER_CAPTURE_MAX_BYTES);
    const length = readSync(descriptor, bytes, 0, bytes.length, 0);
    const prefix = bytes.subarray(0, length);
    return prefix.subarray(0, prefix.lastIndexOf(10) + 1);
  } finally {
    closeSync(descriptor);
  }
}

function boundFile(file: CaptureFile): void {
  if (!file.writable || file.bytes <= APPSERVER_CAPTURE_MAX_BYTES) return;
  const header = readHeader(file.path);
  if (header === undefined || !supportedHeader(header)) return;
  writeAtomicFile(file.path, boundedStream(file.path), { mode: FILE_MODE });
}

function cacheCaptureSizes(root: string, files: readonly CaptureFile[]): number {
  for (const file of files) {
    const writer = writers.get(file.path);
    if (writer !== undefined) writer.bytes = file.bytes;
  }
  const bytes = files.reduce((total, file) => total + file.bytes, 0);
  totalBytesByRoot.set(root, bytes);
  return bytes;
}

function pruneCaptures(root: string, reservedBytes = 0): void {
  for (const file of inventory(root)) {
    if (file.temporary && file.writable) removeAtomicFile(file.path);
    else boundFile(file);
  }
  const files = inventory(root).sort((first, second) => first.modifiedAt - second.modifiedAt || first.path.localeCompare(second.path));
  let totalBytes = cacheCaptureSizes(root, files);
  let count = files.length;
  for (const file of files) {
    if (totalBytes + reservedBytes <= APPSERVER_CAPTURE_TOTAL_MAX_BYTES && count <= APPSERVER_CAPTURE_MAX_FILES) break;
    if (!file.writable) continue;
    const header = readHeader(file.path);
    if (header === undefined || !supportedHeader(header)) continue;
    sealWriter(file.path);
    removeAtomicFile(file.path);
    totalBytes -= file.bytes;
    count -= 1;
  }
  totalBytesByRoot.set(root, totalBytes);
}

function isCapturableThreadId(threadId: string): boolean {
  return THREAD_ID_SHAPE.test(threadId) && !threadId.includes('..');
}

export function capturePath(root: string, threadId: string): string | undefined {
  if (!isCapturableThreadId(threadId)) return undefined;
  return join(root, CAPTURE_DIR, `${threadId}.jsonl`);
}

export interface FrameCapture {
  write(dir: 'in' | 'out', frame: unknown, at?: number): void;
  readonly path: string | undefined;
}

export const NO_CAPTURE: FrameCapture = { write: () => {}, path: undefined };

export function openCapture(options: {
  root: string;
  threadId: string;
  codexVersion: string;
  cwd?: string;
}): FrameCapture {
  const root = captureRoot(options.root);
  const path = capturePath(root, options.threadId);
  const owner = options.cwd === undefined ? undefined : projectKey(canonicalPath(options.cwd));
  if (path === undefined || (owner !== undefined && removedProjects.get(root)?.has(owner))) return NO_CAPTURE;

  try {
    let header = readHeader(path);
    if (inventory(root).some((file) => file.threadId === options.threadId && !file.writable)) {
      sealWriter(path);
      return NO_CAPTURE;
    }
    if (header !== undefined && (!supportedHeader(header) || (owner !== undefined && header.projectKey !== undefined && header.projectKey !== owner))) {
      sealWriter(path);
      return NO_CAPTURE;
    }
    pruneCaptures(root);
    header = readHeader(path);
    if (header !== undefined && !supportedHeader(header)) return NO_CAPTURE;
    if (header === undefined) {
      header = {
        kind: 'appserver-capture-header',
        codexVersion: options.codexVersion.slice(0, 256),
        mappingVersion: APPSERVER_MAPPING_VERSION,
        startedAt: Date.now(),
        ...(owner === undefined ? {} : { projectKey: owner }),
      };
      writeAtomicFile(path, `${JSON.stringify(header)}\n`, { mode: FILE_MODE });
    } else {
      const stream = boundedStream(path);
      const firstNewline = stream.indexOf(10);
      const adopted = owner !== undefined && header.projectKey === undefined;
      if (adopted) header = { ...header, projectKey: owner };
      const repaired = adopted ? Buffer.concat([Buffer.from(`${JSON.stringify(header)}\n`), stream.subarray(firstNewline + 1)]) : stream;
      if (adopted || statSync(path).size !== repaired.length) {
        const length = repaired.length <= APPSERVER_CAPTURE_MAX_BYTES ? repaired.length : repaired.lastIndexOf(10, APPSERVER_CAPTURE_MAX_BYTES - 1) + 1;
        writeAtomicFile(path, repaired.subarray(0, length), { mode: FILE_MODE });
      }
    }
    pruneCaptures(root);
    if (readHeader(path) === undefined) return NO_CAPTURE;
  } catch {
    sealWriter(path);
    return NO_CAPTURE;
  }

  const writer = writers.get(path) ?? { usable: true, bytes: 0 };
  writer.bytes = statSync(path).size;
  writers.set(path, writer);
  return {
    path: capturePath(options.root, options.threadId),
    write(dir, frame, at) {
      if (!writer.usable) return;
      try {
        const header = readHeader(path);
        if (header === undefined || !supportedHeader(header)) {
          sealWriter(path);
          return;
        }
        const record: CapturedFrame = { at: at ?? Date.now(), dir, frame };
        const line = `${JSON.stringify(record)}\n`;
        const size = statSync(path).size;
        const total = (totalBytesByRoot.get(root) ?? 0) + size - writer.bytes;
        totalBytesByRoot.set(root, total);
        writer.bytes = size;
        const bytes = Buffer.byteLength(line);
        if (size + bytes > APPSERVER_CAPTURE_MAX_BYTES) return;
        if (total + bytes > APPSERVER_CAPTURE_TOTAL_MAX_BYTES) {
          pruneCaptures(root, bytes);
          if (!writer.usable) return;
        }
        const descriptor = openSync(path, constants.O_WRONLY | constants.O_APPEND);
        try {
          appendFileSync(descriptor, line, 'utf8');
        } finally {
          closeSync(descriptor);
        }
        writer.bytes += bytes;
        totalBytesByRoot.set(root, (totalBytesByRoot.get(root) ?? 0) + bytes);
      } catch {
        sealWriter(path);
      }
    },
  };
}

export interface ReadCapture {
  header?: AppServerCaptureHeader;
  frames: CapturedFrame[];
}

export function readCaptureFile(path: string): ReadCapture {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { frames: [] };
  }

  let header: AppServerCaptureHeader | undefined;
  const frames: CapturedFrame[] = [];
  for (const line of raw.split('\n')) {
    if (!line) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object') continue;
    const record = parsed as Record<string, unknown>;
    if (record['kind'] === 'appserver-capture-header') {
      header = record as unknown as AppServerCaptureHeader;
      continue;
    }
    if (typeof record['at'] === 'number' && 'frame' in record) {
      frames.push(record as unknown as CapturedFrame);
    }
  }
  return { header, frames };
}

function projectFiles(root: string, cwd: string, threadIds: readonly string[]): CaptureFile[] {
  const owners = new Set(pathSpellings(cwd).map(projectKey));
  const legacyIds = new Set(threadIds);
  return inventory(root).filter((file) => file.header?.projectKey === undefined ? legacyIds.has(file.threadId) : owners.has(file.header.projectKey));
}

export function canClearProjectCaptures(root: string, cwd: string, threadIds: readonly string[] = []): boolean {
  try {
    return projectFiles(root, cwd, threadIds).every((file) => file.writable);
  } catch {
    return false;
  }
}

export function clearProjectCaptures(root: string, cwd: string, threadIds: readonly string[] = []): void {
  const files = projectFiles(root, cwd, threadIds);
  if (files.some((file) => !file.writable)) throw new Error('Project capture belongs to a newer build or cannot be read');
  const rootKey = captureRoot(root);
  const removed = removedProjects.get(rootKey) ?? new Set<string>();
  for (const spelling of pathSpellings(cwd)) removed.add(projectKey(spelling));
  removedProjects.set(rootKey, removed);
  for (const file of files) sealWriter(join(rootKey, CAPTURE_DIR, basename(file.path)));
  for (const file of files) removeAtomicFile(file.path);
  cacheCaptureSizes(rootKey, inventory(rootKey));
}

export function reopenProjectCaptures(root: string, cwd: string, spellings = pathSpellings(cwd)): void {
  const removed = removedProjects.get(captureRoot(root));
  for (const spelling of spellings) removed?.delete(projectKey(spelling));
}
