/** Separate from `store.ts` so the protocol handler composes a path without closing a cycle back through it (ONL-2568). */
import { join } from 'node:path';
import { type ArtifactId, isArtifactId } from '@studio/events';
import { stateRoot } from '../state/root.js';

/** Under `stateRoot()`, never `workspaceRoot()`: project teardown erases that root (ONL-2568). */
export function artifactsDir(): string {
  return join(stateRoot(), 'artifacts');
}

/** The grammar gate stands before every path join, so renderer or agent text never reaches one. */
export function artifactDir(id: ArtifactId): string {
  if (!isArtifactId(id)) throw new Error('refusing to compose an artifact path from a malformed id');
  return join(artifactsDir(), id);
}

export function artifactManifestPath(id: ArtifactId): string {
  return join(artifactDir(id), 'manifest.json');
}

/** `pagePath` is a manifest-named relative path; the caller still proves containment. */
export function artifactFilePath(id: ArtifactId, relativePath: string): string {
  return join(artifactDir(id), relativePath);
}

/** The index sits beside `artifacts/`: quarantine writes a sibling, which inside the store would land among real entries (ONL-2568). */
export const ARTIFACT_INDEX_DOMAIN = 'artifacts-index';
