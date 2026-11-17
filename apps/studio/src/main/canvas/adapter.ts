import type { CanvasDoc, CanvasDocId, CanvasOpEntry } from '@studio/events';

export type CanvasDocLoad =
  | { outcome: 'existing'; doc: CanvasDoc }
  | { outcome: 'fresh'; doc: CanvasDoc }
  /** A NEW id: the caller rewrites its association, or the next open loads the dead one (ONL-1993). */
  | { outcome: 'recovered'; doc: CanvasDoc };

export interface CanvasDocumentStore {
  /** Never rejects (ONL-1993). */
  load(docId: CanvasDocId): Promise<CanvasDocLoad>;

  persist(doc: CanvasDoc): Promise<void>;

  /** Never rejects: a failed append costs history only (ONL-1993). */
  appendHistory(docId: CanvasDocId, entries: CanvasOpEntry[]): Promise<void>;

  /** Any failure answers `[]`. */
  readHistory(docId: CanvasDocId): Promise<CanvasOpEntry[]>;

  subscribe(docId: CanvasDocId, onChange: (doc: CanvasDoc) => void): () => void;
}
