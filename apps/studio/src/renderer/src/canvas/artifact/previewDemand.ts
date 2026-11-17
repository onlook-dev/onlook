import type { ArtifactId, ArtifactPreviewRequest, ArtifactPreviewResult, ArtifactSummary } from '@studio/events';
import { studio } from '../../bridge.js';

export type PreviewState = (ArtifactPreviewResult | { outcome: 'reading' }) & { image?: string };

/** The record carries the revision a request is keyed by, so a picture is only ever asked for once its artifact has resolved (ONL-2791). */
export const previewRequestFor = (
  artifactId: ArtifactId,
  nodePagePath: string | undefined,
  artifact: ArtifactSummary,
): ArtifactPreviewRequest => ({
  artifactId,
  pagePath: nodePagePath ?? artifact.pagePath,
  updatedAt: artifact.updatedAt,
});
const READING: PreviewState = { outcome: 'reading' };
const LIMIT = 96;
const BYTE_LIMIT = 32 * 1024 * 1024;
const keyOf = (request: ArtifactPreviewRequest): string => JSON.stringify([request.artifactId, request.pagePath, request.updatedAt]);
const pageKeyOf = (request: ArtifactPreviewRequest): string => JSON.stringify([request.artifactId, request.pagePath]);
const STORAGE_KEY = 'studio.artifact-previews.v1';

export function createPreviewDemand(
  read: (request: ArtifactPreviewRequest) => Promise<ArtifactPreviewResult>,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
  readHeld?: (request: ArtifactPreviewRequest) => Promise<ArtifactPreviewResult>,
) {
  type Entry = { request: ArtifactPreviewRequest; state: PreviewState; order: number; token: number; listeners: Set<(state: PreviewState) => void> };
  const entries = new Map<string, Entry>();
  const pictures = new Map<string, { request: ArtifactPreviewRequest; image: string; order: number }>();
  const queue = new Set<Entry>();
  const covers = new Set<{ request: ArtifactPreviewRequest; listener: () => void }>();
  /** In flight only, never a remembered miss: main answers `missing` for a record it merely failed to read (ONL-2791). */
  const askingHeld = new Map<string, { artifactId: string }>();
  /** A held read carries no `entry`, so this is its fence: an edit or a deletion bumps it and the answer already out lands nowhere (ONL-2791). */
  const heldRevisions = new Map<string, number>();
  let running = 0;
  let order = 0;

  function retireHeld(artifactId: string): void {
    heldRevisions.set(artifactId, (heldRevisions.get(artifactId) ?? 0) + 1);
    for (const [key, asking] of askingHeld) if (asking.artifactId === artifactId) askingHeld.delete(key);
  }

  function resetEntries(artifactId: string): void {
    for (const [key, entry] of entries) {
      if (entry.request.artifactId !== artifactId) continue;
      entry.token += 1;
      queue.delete(entry);
      entries.delete(key);
      for (const listener of entry.listeners) listener(shown(entry.request, READING));
    }
  }

  /** A picture arriving for a page reaches the nodes showing it, or a warm landing after mount repaints nothing (ONL-2791). */
  function announce(key: string): void {
    for (const cover of covers) if (pageKeyOf(cover.request) === key) cover.listener();
  }

  function remember(request: ArtifactPreviewRequest, image: string, requestedOrder = 0): void {
    const key = pageKeyOf(request);
    if ((pictures.get(key)?.order ?? 0) > requestedOrder) return;
    pictures.delete(key);
    pictures.set(key, { request, image, order: requestedOrder });
    let bytes = [...pictures.values()].reduce((sum, picture) => sum + picture.image.length, 0);
    // Never the page on screen or the one just remembered: the cap gives way instead, as `trim` lets it (ONL-2791).
    const shownPages = new Set([...covers].map((cover) => pageKeyOf(cover.request)));
    while (pictures.size > LIMIT || bytes > BYTE_LIMIT) {
      const oldest = [...pictures.keys()].find((candidate) => candidate !== key && !shownPages.has(candidate));
      const dropped = oldest === undefined ? undefined : pictures.get(oldest);
      if (oldest === undefined || dropped === undefined) break;
      bytes -= dropped.image.length;
      pictures.delete(oldest);
    }
    announce(key);
  }

  function persist(): void {
    let bytes = 0;
    const saved = [...pictures.values()].reverse().filter((picture) => {
      bytes += picture.image.length;
      return bytes < 4 * 1024 * 1024;
    }).reverse();
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {}
  }

  try {
    const saved: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(saved)) for (const picture of saved.slice(-LIMIT)) {
      if (typeof picture?.request?.artifactId === 'string' && typeof picture.request.pagePath === 'string' &&
        typeof picture.request.updatedAt === 'string' && typeof picture.image === 'string' &&
        picture.image.startsWith('data:image/png;base64,') && picture.image.length <= 4 * 1024 * 1024) remember(picture.request, picture.image);
    }
  } catch {}

  function shown(request: ArtifactPreviewRequest, state: PreviewState): PreviewState {
    const picture = pictures.get(pageKeyOf(request));
    return state.outcome === 'ready' || picture === undefined ? state : { ...state, image: picture.image };
  }

  function trim(): void {
    let bytes = [...entries.values()].reduce((sum, entry) => sum + (entry.state.outcome === 'ready' ? entry.state.image.length : 0), 0);
    for (const [key, entry] of entries) {
      if (entries.size <= LIMIT && bytes <= BYTE_LIMIT) break;
      if (entry.listeners.size > 0) continue;
      entries.delete(key);
      queue.delete(entry);
      entry.token += 1;
      if (entry.state.outcome === 'ready') bytes -= entry.state.image.length;
    }
  }

  function drain(): void {
    while (running < 2 && queue.size > 0) {
      const entry = queue.values().next().value!;
      queue.delete(entry);
      if (entry.listeners.size === 0) continue;
      const token = ++entry.token;
      running += 1;
      void Promise.resolve().then(() => read(entry.request)).catch((): ArtifactPreviewResult => ({ outcome: 'unavailable' })).then((state) => {
        if (entry.token !== token) return;
        entry.state = state;
        if (state.outcome === 'ready') { remember(entry.request, state.image, entry.order); persist(); }
        for (const listener of entry.listeners) listener(shown(entry.request, state));
      }).finally(() => { running -= 1; trim(); drain(); });
    }
  }

  function posterOf(request: ArtifactPreviewRequest): string | undefined {
    const picture = pictures.get(pageKeyOf(request));
    return picture !== undefined && keyOf(picture.request) === keyOf(request) ? picture.image : undefined;
  }

  return {
    peek(request: ArtifactPreviewRequest): PreviewState { return shown(request, entries.get(keyOf(request))?.state ?? READING); },
    /** Unlike `peek`, never a picture taken before the artifact's last edit (ONL-2791). */
    poster: posterOf,
    /** Hydrates from the picture main already keeps, which starts no render, and calls the listener again whenever a later read lands one for this page; read it with `poster` (ONL-2791). */
    cover(request: ArtifactPreviewRequest, listener: () => void): () => void {
      const cover = { request, listener };
      covers.add(cover);
      const key = keyOf(request);
      if (readHeld !== undefined && posterOf(request) === undefined && !askingHeld.has(key)) {
        const asking = { artifactId: request.artifactId };
        const revision = heldRevisions.get(request.artifactId) ?? 0;
        askingHeld.set(key, asking);
        const requestedOrder = ++order;
        void readHeld(request)
          .catch((): ArtifactPreviewResult => ({ outcome: 'unavailable' }))
          .then((state) => {
            // Its own ask and no other, or a retired read frees the slot the read replacing it is still using.
            if (askingHeld.get(key) === asking) askingHeld.delete(key);
            if ((heldRevisions.get(request.artifactId) ?? 0) !== revision) return;
            if (state.outcome !== 'ready') return;
            remember(request, state.image, requestedOrder);
            persist();
          });
      }
      return () => { covers.delete(cover); };
    },
    watch(request: ArtifactPreviewRequest, listener: (state: PreviewState) => void): () => void {
      const key = keyOf(request);
      let entry = entries.get(key);
      if (entry === undefined) {
        entry = { request, state: READING, order: ++order, token: 0, listeners: new Set() };
        entries.set(key, entry);
      } else {
        entries.delete(key);
        entries.set(key, entry);
      }
      entry.listeners.add(listener);
      listener(shown(request, entry.state));
      if (entry.state.outcome === 'reading' && entry.token === 0) queue.add(entry);
      drain();
      const held = entry;
      return () => { held.listeners.delete(listener); if (held.listeners.size === 0) queue.delete(held); trim(); };
    },
    invalidate(artifactId: string): void {
      retireHeld(artifactId);
      resetEntries(artifactId);
    },
    forget(artifactId: string): void {
      // Once, and before `announce` reaches a cover: a read started from there must not meet a bump still to come.
      retireHeld(artifactId);
      const dropped: string[] = [];
      for (const [key, picture] of pictures) {
        if (picture.request.artifactId !== artifactId) continue;
        pictures.delete(key);
        dropped.push(key);
      }
      persist();
      for (const key of dropped) announce(key);
      resetEntries(artifactId);
    },
    retain(artifactIds: readonly string[]): void {
      const present = new Set(artifactIds);
      const absent = new Set<string>();
      const drop = (artifactId: string): void => { if (!present.has(artifactId)) absent.add(artifactId); };
      for (const picture of pictures.values()) drop(picture.request.artifactId);
      // A read still out is an artifact's only state until it lands, and would land a picture for one the listing dropped (ONL-2791).
      for (const asking of askingHeld.values()) drop(asking.artifactId);
      for (const entry of entries.values()) drop(entry.request.artifactId);
      for (const artifactId of absent) this.forget(artifactId);
    },
    retry(request: ArtifactPreviewRequest): void {
      const entry = entries.get(keyOf(request));
      if (entry === undefined || entry.state.outcome === 'reading') return;
      entry.state = READING;
      entry.token += 1;
      for (const listener of entry.listeners) listener(shown(request, READING));
      if (entry.listeners.size > 0) queue.add(entry);
      drain();
    },
  };
}

function reloadStorage(): Storage | undefined {
  try { return window.sessionStorage; } catch { return undefined; }
}

/** Decoded before it is remembered, or the first node to use it paints the frame after it, not this one. */
async function decoded(result: ArtifactPreviewResult): Promise<ArtifactPreviewResult> {
  if (result.outcome === 'ready') {
    const image = new Image();
    image.src = result.image;
    await image.decode();
  }
  return result;
}

export const artifactPreviewDemand = createPreviewDemand(
  async (request) => decoded(await studio().artifactPreview(request)),
  reloadStorage(),
  async (request) => decoded(await studio().artifactPreviewHeld(request)),
);
