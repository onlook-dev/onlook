import { type ArtifactDimensions, type ArtifactId, type ArtifactPage, isArtifactId } from '@studio/events';
import { defineDomain } from '../state/store.js';
import { join } from 'node:path';
import { canWriteStateFile, writeStateFile } from '../state/file.js';
import { stateRoot } from '../state/root.js';
import { ARTIFACT_INDEX_DOMAIN } from './dir.js';

/** Every field here is also in the artifact's manifest, so the index is rebuildable from disk (ONL-2568). */
export interface ArtifactIndexRow {
  id: ArtifactId;
  title: string;
  pagePath: string;
  pages?: ArtifactPage[];
  dimensions?: ArtifactDimensions;
  createdAt: string;
  updatedAt: string;
  /** Carried so listing does not have to open every manifest to know what it may write. */
  minReaderVersion: number;
  [unknownField: string]: unknown;
}

export interface ArtifactIndex {
  artifacts: Record<ArtifactId, ArtifactIndexRow>;
  /** A sibling key a newer build wrote survives a read and the write-back after it (ONL-2568). */
  [unknownField: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lossless: a migration's return is written back the same tick, so a dropped field is gone for good (ONL-2568). */
function salvage(value: unknown): ArtifactIndex {
  if (!isRecord(value)) return { artifacts: {} };
  const rows = value['artifacts'];
  if (!isRecord(rows)) return { ...value, artifacts: {} };
  const artifacts: Record<ArtifactId, ArtifactIndexRow> = {};
  for (const [id, row] of Object.entries(rows)) {
    if (!isArtifactId(id)) continue;
    if (!isRecord(row)) continue;
    artifacts[id] = { ...row, id } as ArtifactIndexRow;
  }
  return { ...value, artifacts };
}

const domain = defineDomain<ArtifactIndex>({
  name: ARTIFACT_INDEX_DOMAIN,
  version: 1,
  fallback: () => ({ artifacts: {} }),
  migrate: (data) => salvage(data),
  readFuture: salvage,
  // Undebounced: the directory is on disk before this, so a lost write is an invisible orphan (ONL-2568).
});

/** Sanitised on every read: a version-matched file is returned unchecked, and `data: null` is a real shape on disk. */
export function readArtifactIndex(): ArtifactIndex {
  return salvage(domain.read());
}

export function writeArtifactIndex(next: ArtifactIndex): void {
  if (!writeStateFile(join(stateRoot(), `${ARTIFACT_INDEX_DOMAIN}.json`), 1, salvage(next))) {
    throw new Error('artifact index requires a newer Onlook build');
  }
  domain.reset();
}

export function canWriteArtifactIndex(): boolean {
  return canWriteStateFile(join(stateRoot(), `${ARTIFACT_INDEX_DOMAIN}.json`), 1);
}

export function updateArtifactIndex(fn: (current: ArtifactIndex) => ArtifactIndex): void {
  writeArtifactIndex(fn(readArtifactIndex()));
}

export function resetArtifactIndexCache(): void {
  domain.reset();
}
