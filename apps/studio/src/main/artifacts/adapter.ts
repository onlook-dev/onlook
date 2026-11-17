import type { ArtifactDimensions, ArtifactId, ArtifactManifest, ArtifactPage, ArtifactRefusal, ArtifactSummary } from '@studio/events';

interface ArtifactFile {
  path: string;
  bytes: Uint8Array;
}

export interface ArtifactFileBundle {
  pages: ArtifactPage[];
  files: ArtifactFile[];
}

export type ArtifactRead =
  | { outcome: 'resolved'; manifest: ArtifactManifest; readOnly: boolean; blockedDocuments?: number }
  | { outcome: 'missing' };

export interface ArtifactCreate {
  title?: string;
  html: string;
  copiedFrom?: ArtifactId;
  bundle?: ArtifactFileBundle;
  dimensions?: ArtifactDimensions;
}

/** Local editing contract. Static cloud snapshots do not supply private read/list or revision semantics. */
export interface ArtifactStore {
  /** Never rejects: one unreadable record must not cost a user the rest of them. */
  list(): Promise<ArtifactSummary[]>;

  /** Never rejects; an absent or unreadable record answers `missing`. */
  read(id: ArtifactId): Promise<ArtifactRead>;
  /** `read` without the directory walk: `undefined` exactly where `read` answers `missing`. */
  readManifest(id: ArtifactId): Promise<ArtifactManifest | undefined>;
  readFiles(id: ArtifactId, purpose?: 'export'): Promise<ArtifactFileBundle | ArtifactRefusal>;
  writeFiles(id: ArtifactId, bundle: ArtifactFileBundle, expectedUpdatedAt?: string): Promise<{ ok: true } | ArtifactRefusal>;

  /** @parked ONL-2568 */
  /** Any failure answers `null`, which the caller renders as missing rather than as empty. */
  readPage(id: ArtifactId, pagePath: string, maxBytes?: number): Promise<string | null>;

  create(input: ArtifactCreate): Promise<ArtifactSummary | ArtifactRefusal>;
  saveDimensions(id: ArtifactId, dimensions: ArtifactDimensions, options?: { onlyIfUnset?: boolean }): { ok: true } | ArtifactRefusal;

  /** @parked ONL-2568 */
  writePage(id: ArtifactId, html: string): Promise<{ ok: true } | ArtifactRefusal>;

  /** @parked ONL-2568 */
  rename(id: ArtifactId, title: string, expectedUpdatedAt?: string): Promise<{ ok: true } | ArtifactRefusal>;

  /** The only thing that removes an artifact: there is no sweep (ONL-2568). */
  remove(id: ArtifactId, expectedUpdatedAt?: string): Promise<{ ok: true } | ArtifactRefusal>;

  /** On the store so the startup trigger cannot be wired without its integrity reporter. */
  rebuildIndexOnce(): void;
}
