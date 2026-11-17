import {
  existsSync,
  constants,
  openSync,
  closeSync,
  readSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ARTIFACT_FIRST_PAGE_PATH,
  ARTIFACT_MANIFEST_VERSION,
  ARTIFACT_MIN_READER_VERSION,
  ARTIFACT_ID_SHAPE,
  type ArtifactId,
  type ArtifactManifest,
  type ArtifactRefusal,
  type ArtifactSummary,
  artifactRefusal,
  artifactDimensions,
  isArtifactId,
} from '@studio/events';
import { writeAtomicFile } from '../fs-atomic.js';
import { readStateFile, writeStateFile } from '../state/file.js';
import { log } from '../log/index.js';
import { nextArtifactTitle } from './naming.js';
import type { ArtifactCreate, ArtifactFileBundle, ArtifactRead, ArtifactStore } from './adapter.js';
import { artifactDocumentPaths, readArtifactBundle, validArtifactBundle } from './files.js';
import { artifactDir, artifactFilePath, artifactManifestPath, artifactsDir } from './dir.js';
import { decodeManifest, machineLocalFieldIn } from './manifest.js';
import {
  type ArtifactIndex,
  type ArtifactIndexRow,
  canWriteArtifactIndex,
  readArtifactIndex,
  resetArtifactIndexCache,
  updateArtifactIndex,
  writeArtifactIndex,
} from './state.js';

const logger = log('artifacts');

function indexReadOnly(): boolean {
  try {
    return !canWriteArtifactIndex();
  } catch {
    return true;
  }
}

/** Reported as counts and scalars only; no title, path or content (ONL-2568). */
type ArtifactIntegrityEvent = 'quarantined' | 'newer_build_refused' | 'index_rebuilt';

export interface ArtifactStoreDeps {
  mintId?: () => ArtifactId;
  onIntegrity?: (event: ArtifactIntegrityEvent, count: number) => void;
  onChanged?: (artifactId: ArtifactId) => void;
  now?: () => string;
}

const rowOf = (manifest: ArtifactManifest): ArtifactIndexRow => ({
  id: manifest.id,
  title: manifest.title,
  pagePath: manifest.pages[0]?.path ?? ARTIFACT_FIRST_PAGE_PATH,
  pages: manifest.pages,
  ...(artifactDimensions(manifest.dimensions) === undefined ? {} : { dimensions: artifactDimensions(manifest.dimensions) }),
  createdAt: manifest.createdAt,
  updatedAt: manifest.updatedAt,
  minReaderVersion: manifest.minReaderVersion,
});

const summaryOf = (row: ArtifactIndexRow): ArtifactSummary => ({
  id: row.id,
  title: row.title,
  pagePath: row.pagePath,
  ...(row.pages === undefined ? {} : { pages: row.pages }),
  ...(artifactDimensions(row.dimensions) === undefined ? {} : { dimensions: artifactDimensions(row.dimensions) }),
  updatedAt: row.updatedAt,
  readOnly: row.minReaderVersion > ARTIFACT_MANIFEST_VERSION || (row.pages?.length ?? 1) > 1,
});

/** Renames the whole directory, so every walker's grammar filter stops seeing it at once. */
function quarantine(id: ArtifactId, why: string): void {
  const aside = `${artifactDir(id)}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  try {
    renameSync(artifactDir(id), aside);
    logger.error('artifact set aside', { why });
  } catch (err) {
    logger.error('artifact could not be set aside', { why, error: err });
  }
}

type ManifestFile =
  | { parsed: unknown }
  | { absent: true }
  | { unreadable: true }
  | { corrupt: true };

/** Read and parse are separate, and so are the two read failures: absent is a fact, unreadable may pass (ONL-2568). */
function readManifestFile(id: ArtifactId): ManifestFile {
  try {
    const file = readStateFile(artifactManifestPath(id), ARTIFACT_MANIFEST_VERSION, { inline: true, versionKey: 'schemaVersion' });
    return file.kind === 'missing' ? { absent: true } : { parsed: file.data };
  } catch (err) {
    return err instanceof SyntaxError ? { corrupt: true } : { unreadable: true };
  }
}

function canChangeManifestDirectory(directory: string): boolean {
  try {
    const file = readStateFile(join(directory, 'manifest.json'), ARTIFACT_MANIFEST_VERSION, { inline: true, versionKey: 'schemaVersion' });
    if (file.kind === 'future') return false;
    if (file.kind === 'missing') return true;
    const data = file.data as { minReaderVersion?: unknown } | null;
    return typeof data?.minReaderVersion !== 'number' || data.minReaderVersion <= ARTIFACT_MANIFEST_VERSION;
  } catch (error) {
    if (error instanceof SyntaxError) return true;
    throw error;
  }
}

function loadManifest(
  id: ArtifactId,
  deps: ArtifactStoreDeps,
): { manifest: ArtifactManifest; readOnly: boolean } | undefined {
  const previous = `${artifactDir(id)}.previous`;
  if (!existsSync(artifactDir(id)) && existsSync(previous)) {
    try {
      if (lstatSync(previous).isSymbolicLink() || !lstatSync(previous).isDirectory()) return undefined;
      if (!canChangeManifestDirectory(previous)) return undefined;
      renameSync(previous, artifactDir(id));
    } catch { return undefined; }
  }
  const file = readManifestFile(id);

  if ('parsed' in file) {
    const decoded = decodeManifest(file.parsed, id);
    if (decoded.repaired && !decoded.readOnly) repairManifest(decoded.manifest);
    return { manifest: decoded.manifest, readOnly: decoded.readOnly };
  }

  // EMFILE, EACCES, EIO: the bytes are there and may read next time, so nothing is written
  // over them (ONL-2568).
  if ('unreadable' in file) {
    logger.warn('artifact manifest could not be read');
    return undefined;
  }

  // The page is the work; a manifest is recoverable metadata, so it is rebuilt from the
  // directory rather than costing the user their page (ONL-2568).
  if (existsSync(artifactFilePath(id, ARTIFACT_FIRST_PAGE_PATH))) {
    const decoded = decodeManifest({}, id);
    repairManifest(decoded.manifest);
    return { manifest: decoded.manifest, readOnly: decoded.readOnly };
  }

  // Only corrupt bytes are set aside. A read that merely failed may succeed next time, and
  // renaming on it would destroy an artifact over a transient error.
  if ('corrupt' in file && existsSync(artifactDir(id))) {
    quarantine(id, 'manifest bytes do not parse and no page remains');
    deps.onIntegrity?.('quarantined', 1);
  }
  return undefined;
}

/** A read must not reject because its repair could not be saved; the in-memory manifest still answers. */
function repairManifest(manifest: ArtifactManifest): void {
  try {
    writeManifest(manifest);
  } catch (err) {
    logger.warn('manifest repair could not be saved', { error: err });
  }
}

function writeManifest(manifest: ArtifactManifest): void {
  const offender = machineLocalFieldIn(manifest);
  if (offender !== undefined) {
    throw new Error(`refusing to write a manifest whose ${offender} carries a location`);
  }
  if (!canChangeManifestDirectory(artifactDir(manifest.id)) || !writeStateFile(artifactManifestPath(manifest.id), ARTIFACT_MANIFEST_VERSION, manifest, { inline: true, versionKey: 'schemaVersion' })) {
    throw new Error('artifact manifest requires a newer Onlook build');
  }
}

/** Runs only when the index holds nothing: a readable index is never added to (ONL-2568). */
export function rebuildArtifactIndexFromDisk(deps: ArtifactStoreDeps = {}): ArtifactIndex {
  // Read once and spread: salvage kept whatever a newer build wrote beside `artifacts` (ONL-2568).
  const held = readArtifactIndex();
  if (indexReadOnly()) return held;
  let names: string[];
  try {
    names = readdirSync(artifactsDir());
  } catch {
    return { ...held, artifacts: {} };
  }

  const artifacts: Record<ArtifactId, ArtifactIndexRow> = {};
  for (const name of names) {
    if (!name.endsWith('.previous')) continue;
    const id = name.slice(0, -'.previous'.length);
    if (!isArtifactId(id) || existsSync(artifactDir(id))) continue;
    try {
      if (!canChangeManifestDirectory(join(artifactsDir(), name))) {
        const row = held.artifacts[id];
        if (row !== undefined) artifacts[id] = row;
        continue;
      }
    } catch {
      const row = held.artifacts[id];
      if (row !== undefined) artifacts[id] = row;
      continue;
    }
    const restored = loadManifest(id, deps);
    if (restored !== undefined) artifacts[id] = rowOf(restored.manifest);
  }
  for (const name of names) {
    if (!ARTIFACT_ID_SHAPE.test(name)) continue;
    const file = readManifestFile(name);
    // A read that merely failed may succeed next time; the row it would carry is not invented here.
    if ('unreadable' in file) continue;
    if ('parsed' in file) {
      const decoded = decodeManifest(file.parsed, name);
      // A manifest naming someone else is not this directory's: adopting it would invent a record.
      if (decoded.idConflict && !decoded.readOnly) continue;
      artifacts[name] = rowOf(decoded.manifest);
      continue;
    }
    // The same recovery `read` does: a page with no readable manifest is still the user's work,
    // and a rebuild that skipped it would drop it from `list()` for good (ONL-2568).
    if (!existsSync(artifactFilePath(name, ARTIFACT_FIRST_PAGE_PATH))) continue;
    artifacts[name] = rowOf(decodeManifest({}, name).manifest);
  }

  const rebuilt: ArtifactIndex = { ...held, artifacts };
  const count = Object.keys(artifacts).length;
  if (count > 0) {
    writeArtifactIndex(rebuilt);
    deps.onIntegrity?.('index_rebuilt', count);
    logger.warn('artifact index rebuilt from disk', { count });
  }
  return rebuilt;
}

function currentIndex(deps: ArtifactStoreDeps): ArtifactIndex {
  const index = readArtifactIndex();
  if (indexReadOnly()) return index;
  if (Object.keys(index.artifacts).length > 0) return index;
  return rebuildArtifactIndexFromDisk(deps);
}

export function createArtifactStore(deps: ArtifactStoreDeps = {}): ArtifactStore {
  const mintId = deps.mintId ?? ((): ArtifactId => randomUUID());
  const now = deps.now ?? ((): string => new Date().toISOString());

  const saveBundle = (directory: string, bundle: ArtifactFileBundle, manifest: ArtifactManifest): void => {
    if (machineLocalFieldIn(manifest) !== undefined) throw new Error('unsafe manifest');
    mkdirSync(directory);
    for (const file of bundle.files) {
      const target = join(directory, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeAtomicFile(target, Buffer.from(file.bytes), { mode: 0o600 });
    }
    if (!writeStateFile(join(directory, 'manifest.json'), ARTIFACT_MANIFEST_VERSION, manifest, { inline: true, versionKey: 'schemaVersion' })) {
      throw new Error('artifact manifest requires a newer Onlook build');
    }
  };

  /** Answers with what it loaded: `loadManifest` reads from disk and can repair, so one write is one read. */
  const openForWrite = (
    id: ArtifactId,
    expectedUpdatedAt?: string,
  ): { manifest: ArtifactManifest } | ArtifactRefusal => {
    if (!isArtifactId(id)) return artifactRefusal('badId');
    try {
      if (!canWriteArtifactIndex() || !canChangeManifestDirectory(`${artifactDir(id)}.previous`)) {
        deps.onIntegrity?.('newer_build_refused', 1);
        return artifactRefusal('newerBuild');
      }
    } catch {
      return artifactRefusal('unavailable');
    }
    let loaded: ReturnType<typeof loadManifest>;
    if (expectedUpdatedAt === undefined) loaded = loadManifest(id, deps);
    else {
      const file = readManifestFile(id);
      if (!('parsed' in file)) return artifactRefusal('unreadable' in file ? 'unavailable' : 'stale');
      loaded = decodeManifest(file.parsed, id);
    }
    if (loaded === undefined) return artifactRefusal('unknown');
    if (loaded.readOnly) {
      deps.onIntegrity?.('newer_build_refused', 1);
      return artifactRefusal('newerBuild');
    }
    if (expectedUpdatedAt !== undefined && loaded.manifest.updatedAt !== expectedUpdatedAt) return artifactRefusal('stale');
    if (loaded.manifest.pages.length > 1 || (Array.isArray(loaded.manifest.files) && loaded.manifest.files.filter((path) => typeof path === 'string' && path.toLowerCase().endsWith('.html')).length > 1)) return artifactRefusal('multipleDocuments');
    try {
      if (artifactDocumentPaths(artifactDir(id)).length > 1) return artifactRefusal('multipleDocuments');
    } catch { return artifactRefusal('invalidFiles'); }
    return { manifest: loaded.manifest };
  };

  const store: ArtifactStore = {
    async list(): Promise<ArtifactSummary[]> {
      const index = currentIndex(deps);
      return Promise.all(Object.values(index.artifacts).map(async (row) => {
        const read = await store.read(row.id);
        return read.outcome === 'resolved' ? {...summaryOf(row), readOnly: read.readOnly, ...(read.blockedDocuments ? {blockedDocuments: read.blockedDocuments} : {})} : summaryOf(row);
      }));
    },

    read(id): Promise<ArtifactRead> {
      if (!isArtifactId(id)) return Promise.resolve({ outcome: 'missing' });
      const loaded = loadManifest(id, deps);
      if (loaded === undefined) return Promise.resolve({ outcome: 'missing' });
      const manifest = loaded.manifest;
      let blockedDocuments = 0;
      let unsafeDocuments = false;
      try {
        const paths = artifactDocumentPaths(artifactDir(id));
        const extras = paths.filter((path) => !manifest.pages.some((page) => page.path === path));
        blockedDocuments = extras.length;
      } catch { unsafeDocuments = true; }
      return Promise.resolve({
        outcome: 'resolved',
        manifest,
        readOnly: loaded.readOnly || indexReadOnly() || unsafeDocuments || blockedDocuments > 0 || manifest.pages.length > 1,
        ...(blockedDocuments ? {blockedDocuments} : {}),
      });
    },

    readManifest(id): Promise<ArtifactManifest | undefined> {
      return Promise.resolve(isArtifactId(id) ? loadManifest(id, deps)?.manifest : undefined);
    },

    readFiles(id, purpose): Promise<ArtifactFileBundle | ArtifactRefusal> {
      if (!isArtifactId(id)) return Promise.resolve(artifactRefusal('badId'));
      if (purpose === 'export') {
        const writable = openForWrite(id);
        if ('code' in writable) return Promise.resolve(writable);
      }
      const loaded = loadManifest(id, deps);
      if (loaded === undefined) return Promise.resolve(artifactRefusal('unknown'));
      try {
        return Promise.resolve(readArtifactBundle(artifactDir(id), loaded.manifest));
      } catch {
        return Promise.resolve(artifactRefusal('invalidFiles'));
      }
    },

    writeFiles(id, bundle, expectedUpdatedAt): Promise<{ ok: true } | ArtifactRefusal> {
      const opened = openForWrite(id, expectedUpdatedAt);
      if ('code' in opened) return Promise.resolve(opened);
      if (!validArtifactBundle(bundle)) return Promise.resolve(artifactRefusal('invalidFiles'));
      const directory = artifactDir(id);
      const stage = `${directory}.staged-${randomUUID()}`;
      const previous = `${directory}.previous`;
      const timestamp = now();
      const previousTime = Date.parse(opened.manifest.updatedAt) || 0;
      const next = { ...opened.manifest, pages: bundle.pages, files: bundle.files.map((file) => file.path), updatedAt: Date.parse(timestamp) > previousTime ? timestamp : new Date(previousTime + 1).toISOString() };
      let replaced = false;
      let moved = false;
      try {
        saveBundle(stage, bundle, next);
        rmSync(previous, { recursive: true, force: true });
        renameSync(directory, previous);
        moved = true;
        renameSync(stage, directory);
        replaced = true;
        updateArtifactIndex((index) => ({
          ...index,
          artifacts: { ...index.artifacts, [id]: { ...index.artifacts[id], ...rowOf(next) } },
        }));
      } catch {
        resetArtifactIndexCache();
        try {
          if (replaced) rmSync(directory, { recursive: true, force: true });
          if (moved) renameSync(previous, directory);
        } catch { logger.error('artifact replacement recovery deferred'); }
        try { rmSync(stage, { recursive: true, force: true }); }
        catch { logger.error('artifact replacement staging cleanup deferred'); }
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      try { rmSync(previous, { recursive: true, force: true }); } catch { }
      deps.onChanged?.(id);
      return Promise.resolve({ ok: true });
    },

    readPage(id, pagePath, maxBytes): Promise<string | null> {
      if (!isArtifactId(id)) return Promise.resolve(null);
      const loaded = loadManifest(id, deps);
      if (loaded === undefined) return Promise.resolve(null);
      // Only a path the manifest names: the manifest is the index of what this artifact holds.
      if (!loaded.manifest.pages.some((page) => page.path === pagePath)) return Promise.resolve(null);
      try {
        const dir = realpathSync(artifactDir(id));
        const real = realpathSync(artifactFilePath(id, pagePath));
        // A symlink at a manifest-named path still resolves inside the root (ONL-2568).
        if (!real.startsWith(dir + sep) || real !== join(dir, ...pagePath.split('/'))) {
          return Promise.resolve(null);
        }
        if (maxBytes === undefined) return Promise.resolve(readFileSync(real, 'utf8'));
        if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > 5 * 1024 * 1024) return Promise.resolve(null);
        const descriptor = openSync(real, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        try {
          const stat = fstatSync(descriptor);
          if (!stat.isFile() || stat.size > maxBytes) return Promise.resolve(null);
          let bytes = Buffer.alloc(stat.size + 1);
          let count = readSync(descriptor, bytes, 0, bytes.length, 0);
          // Grew since the stat: read again against the caller's whole budget.
          if (count > stat.size) {
            bytes = Buffer.alloc(maxBytes + 1);
            count = readSync(descriptor, bytes, 0, bytes.length, 0);
          }
          return Promise.resolve(count > maxBytes ? null : bytes.subarray(0, count).toString('utf8'));
        } finally { closeSync(descriptor); }
      } catch {
        return Promise.resolve(null);
      }
    },

    create(input: ArtifactCreate): Promise<ArtifactSummary | ArtifactRefusal> {
      try {
        if (!canWriteArtifactIndex()) return Promise.resolve(artifactRefusal('newerBuild'));
      } catch {
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      const id = mintId();
      if (!isArtifactId(id)) return Promise.resolve(artifactRefusal('badId'));
      try {
        if (!canChangeManifestDirectory(`${artifactDir(id)}.previous`)) return Promise.resolve(artifactRefusal('newerBuild'));
      } catch {
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      const bundle = input.bundle ?? {
        pages: [{ path: ARTIFACT_FIRST_PAGE_PATH, name: 'index.html' }],
        files: [{ path: ARTIFACT_FIRST_PAGE_PATH, bytes: Buffer.from(input.html) }],
      };
      if (!validArtifactBundle(bundle)) return Promise.resolve(artifactRefusal('invalidFiles'));
      const base = currentIndex(deps);
      const at = now();
      const manifest: ArtifactManifest = {
        schemaVersion: ARTIFACT_MANIFEST_VERSION,
        minReaderVersion: ARTIFACT_MIN_READER_VERSION,
        id,
        title: input.title ?? nextArtifactTitle(Object.values(base.artifacts).map((artifact) => artifact.title)),
        createdAt: at,
        updatedAt: at,
        pages: bundle.pages,
        files: bundle.files.map((file) => file.path),
        ...(artifactDimensions(input.dimensions) === undefined ? {} : { dimensions: artifactDimensions(input.dimensions) }),
        provenance: { madeIn: 'onlook', ...(input.copiedFrom ? { copiedFrom: input.copiedFrom } : {}) },
      };

      mkdirSync(artifactsDir(), { recursive: true });
      if (existsSync(artifactDir(id))) return Promise.resolve(artifactRefusal('unavailable'));
      try {
        saveBundle(artifactDir(id), bundle, manifest);
        writeArtifactIndex({ ...base, artifacts: { ...base.artifacts, [id]: rowOf(manifest) } });
      } catch {
        rmSync(artifactDir(id), { recursive: true, force: true });
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      deps.onChanged?.(id);
      return Promise.resolve(summaryOf(rowOf(manifest)));
    },

    saveDimensions(id, dimensions, options) {
      const size = artifactDimensions(dimensions);
      if (size === undefined) return artifactRefusal('invalidFiles');
      const opened = openForWrite(id);
      if ('code' in opened) return opened;
      if (options?.onlyIfUnset && opened.manifest.dimensions !== undefined) return { ok: true };
      if (opened.manifest.dimensions?.width === size.width && opened.manifest.dimensions.height === size.height) return { ok: true };
      const next = { ...opened.manifest, dimensions: size };
      try {
        writeManifest(next);
        updateArtifactIndex((index) => ({
          ...index,
          artifacts: { ...index.artifacts, [id]: { ...index.artifacts[id], ...rowOf(next) } },
        }));
      } catch {
        try { writeManifest(opened.manifest); } catch { logger.error('artifact dimensions recovery deferred'); }
        resetArtifactIndexCache();
        return artifactRefusal('unavailable');
      }
      return { ok: true };
    },

    writePage(id, html): Promise<{ ok: true } | ArtifactRefusal> {
      const opened = openForWrite(id);
      if ('code' in opened) return Promise.resolve(opened);

      const pagePath = opened.manifest.pages[0]?.path ?? ARTIFACT_FIRST_PAGE_PATH;
      return store.readFiles(id).then((bundle) => {
        if ('code' in bundle) return bundle;
        return store.writeFiles(id, {
          ...bundle,
          files: bundle.files.map((file) => file.path === pagePath ? { path: pagePath, bytes: Buffer.from(html) } : file),
        }, opened.manifest.updatedAt);
      });
    },

    rename(id, title, expectedUpdatedAt): Promise<{ ok: true } | ArtifactRefusal> {
      const opened = openForWrite(id);
      if ('code' in opened) return Promise.resolve(opened);
      if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200 || /[\u0000-\u001f\u007f]/.test(title)) return Promise.resolve(artifactRefusal('invalidFiles'));
      if (expectedUpdatedAt !== undefined && opened.manifest.updatedAt !== expectedUpdatedAt) return Promise.resolve(artifactRefusal('stale'));
      if (opened.manifest.title === title.trim()) return Promise.resolve({ok: true});
      const timestamp = now();
      const previousTime = Date.parse(opened.manifest.updatedAt) || 0;
      const next: ArtifactManifest = { ...opened.manifest, title: title.trim(), updatedAt: Date.parse(timestamp) > previousTime ? timestamp : new Date(previousTime + 1).toISOString() };
      try {
        writeManifest(next);
        updateArtifactIndex((index) => ({
          ...index,
          artifacts: { ...index.artifacts, [id]: { ...index.artifacts[id], ...rowOf(next) } },
        }));
      } catch {
        try { writeManifest(opened.manifest); } catch { logger.error('artifact rename recovery deferred'); }
        resetArtifactIndexCache();
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      deps.onChanged?.(id);
      return Promise.resolve({ ok: true });
    },

    /** Nothing else reads the index at startup, so a lost one would stay lost (ONL-2568). */
    rebuildIndexOnce(): void {
      currentIndex(deps);
    },

    remove(id, expectedUpdatedAt): Promise<{ ok: true } | ArtifactRefusal> {
      if (!isArtifactId(id)) return Promise.resolve(artifactRefusal('badId'));
      try {
        if (!canWriteArtifactIndex() || !canChangeManifestDirectory(`${artifactDir(id)}.previous`)) return Promise.resolve(artifactRefusal('newerBuild'));
      } catch {
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      if (!existsSync(artifactDir(id))) {
        updateArtifactIndex((index) => {
          const { [id]: _gone, ...rest } = index.artifacts;
          return { ...index, artifacts: rest };
        });
        return Promise.resolve(artifactRefusal('unknown'));
      }
      const opened = openForWrite(id);
      if ('code' in opened) return Promise.resolve(opened);
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== opened.manifest.updatedAt) return Promise.resolve(artifactRefusal('stale'));
      const directory = artifactDir(id);
      const removed = `${directory}.deleted-${randomUUID()}`;
      let moved = false;
      try {
        renameSync(directory, removed);
        moved = true;
        updateArtifactIndex((index) => {
          const { [id]: _gone, ...rest } = index.artifacts;
          return { ...index, artifacts: rest };
        });
      } catch {
        if (moved) {try {renameSync(removed, directory);} catch {logger.error('artifact deletion recovery deferred');}}
        resetArtifactIndexCache();
        return Promise.resolve(artifactRefusal('unavailable'));
      }
      try {rmSync(removed, {recursive: true, force: true}); rmSync(`${directory}.previous`, {recursive: true, force: true});}
      catch {logger.error('artifact deletion cleanup deferred');}
      deps.onChanged?.(id);
      return Promise.resolve({ ok: true });
    },
  };
  return store;
}
