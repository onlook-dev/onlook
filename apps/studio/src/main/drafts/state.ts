import { isArtifactId, isHarnessId, joinParagraphs, type ArtifactAttachment, type ComposerDraft, type ImageMediaType } from '@studio/events';
import { workspaceHash, workspaceHashes } from '../lib/canonical-path.js';
import type { ChatFileRef, SkillAttachment } from '@studio/events';
import { harnessFor } from '../agent-host/harness.js';
import { defineDomain } from '../state/store.js';

interface DraftsState {
  byWorkspace: Record<string, ComposerDraft>;
}

const domain = defineDomain<DraftsState>({
  name: 'composer-drafts',
  version: 1,
  fallback: () => ({ byWorkspace: {} }),
  // Nothing predates version 1; an unversioned file is not ours.
  migrate: (_data, from) => {
    throw new Error(`no migration from version ${String(from)}`);
  },
  // Every keystroke writes; the quit flush carries the last one.
  debounceMs: 400,
});

const removedProjects = new Set<string>();

export function reopenComposerDraft(cwd: string): void {
  for (const hash of workspaceHashes(cwd)) removedProjects.delete(hash);
}

const MEDIA_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] satisfies ImageMediaType[]);

const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

function sanitizeRef(value: unknown): ChatFileRef | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const id = v['id'];
  const mediaType = v['mediaType'];
  if (typeof id !== 'string' || id === '') return undefined;
  if (v['kind'] === 'file' && typeof v['name'] === 'string' && positive(v['originalSize']) && (mediaType === 'text/plain' || mediaType === 'application/pdf')) {
    return { kind: 'file', id, mediaType, name: v['name'], originalSize: v['originalSize'] };
  }
  if (typeof mediaType !== 'string' || !MEDIA_TYPES.has(mediaType)) return undefined;
  return {
    id,
    mediaType: mediaType as ImageMediaType,
    ...(typeof v['name'] === 'string' ? { name: v['name'] } : {}),
    ...(positive(v['originalSize']) ? { originalSize: v['originalSize'] } : {}),
    ...(positive(v['width']) ? { width: v['width'] } : {}),
    ...(positive(v['height']) ? { height: v['height'] } : {}),
  };
}

// Drop, never repair: half a stored entry restores text the user never typed.
function sanitize(value: unknown): ComposerDraft | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const text = v['text'];
  const images = v['images'];
  if (typeof text !== 'string' || !Array.isArray(images)) return undefined;
  const refs: ChatFileRef[] = [];
  for (const image of images) {
    const ref = sanitizeRef(image);
    if (ref !== undefined) refs.push(ref);
  }
  const artifacts: ArtifactAttachment[] = [];
  for (const raw of Array.isArray(v['artifacts']) ? v['artifacts'] : []) {
    if (typeof raw !== 'object' || raw === null) continue;
    if (raw.kind !== 'artifact' || !isArtifactId(raw.artifactId) || typeof raw.title !== 'string') continue;
    if (raw.pagePath !== undefined && (typeof raw.pagePath !== 'string' || !raw.pagePath.startsWith('pages/') || raw.pagePath.includes('..'))) continue;
    artifacts.push({ kind: 'artifact', artifactId: raw.artifactId, title: raw.title, ...(raw.pagePath === undefined ? {} : { pagePath: raw.pagePath }) });
    if (artifacts.length >= 64) break;
  }
  const skills: SkillAttachment[] = [];
  for (const raw of Array.isArray(v['skills']) ? v['skills'].slice(0, 1) : []) {
    if (raw?.kind !== 'skill' || typeof raw.name !== 'string' || !raw.name || typeof raw.description !== 'string' || !isHarnessId(raw.agent)) continue;
    if (harnessFor(raw.agent).skillsCarryPath && typeof raw.path !== 'string') continue;
    skills.push({ kind: 'skill', name: raw.name, description: raw.description, agent: raw.agent, ...(typeof raw.path === 'string' ? { path: raw.path } : {}) });
  }
  return { text, images: refs, ...(skills.length === 0 ? {} : { skills }), ...(artifacts.length === 0 ? {} : { artifacts }) };
}

const isEmpty = (draft: ComposerDraft): boolean =>
  draft.text === '' && draft.images.length === 0 && (draft.artifacts?.length ?? 0) === 0 && (draft.skills?.length ?? 0) === 0;

function forget(key: string): void {
  domain.update((state) => {
    if (state.byWorkspace[key] === undefined) return state;
    const byWorkspace = { ...state.byWorkspace };
    delete byWorkspace[key];
    return { byWorkspace };
  });
}

export function readComposerDraft(cwd: string): ComposerDraft {
  if (cwd === '') return { text: '', images: [] };
  const key = workspaceHash(cwd);
  if (removedProjects.has(key)) return { text: '', images: [] };
  return sanitize(domain.read().byWorkspace[key]) ?? { text: '', images: [] };
}

export function writeComposerDraft(cwd: string, draft: ComposerDraft): void {
  if (cwd === '') return;
  const key = workspaceHash(cwd);
  if (removedProjects.has(key)) return;
  const next = sanitize(draft);
  if (next === undefined || isEmpty(next)) {
    forget(key);
    return;
  }
  domain.update((state) => ({ byWorkspace: { ...state.byWorkspace, [key]: next } }));
}

export function forgetComposerDraft(cwd: string): void {
  const key = workspaceHash(cwd);
  removedProjects.add(key);
  if (domain.read().byWorkspace[key] === undefined) return;
  forget(key);
  domain.flush();
}

/** `writeComposerDraft` replaces, so a prompt handed over on the way out reads first and lands ahead of what the composer holds (ONL-2294). */
export function prependComposerDraft(cwd: string, leading: ComposerDraft): void {
  const stored = readComposerDraft(cwd);
  const seen = new Set<string>();
  const images: ChatFileRef[] = [];
  for (const image of [...leading.images, ...stored.images]) {
    if (seen.has(image.id)) continue;
    seen.add(image.id);
    images.push(image);
  }
  const artifacts = [...new Map([...(leading.artifacts ?? []), ...(stored.artifacts ?? [])].map((artifact) => [`${artifact.artifactId}:${artifact.pagePath ?? ''}`, artifact])).values()];
  writeComposerDraft(cwd, { text: joinParagraphs(leading.text, stored.text), images, skills: leading.skills?.length ? leading.skills : stored.skills, ...(artifacts.length === 0 ? {} : { artifacts }) });
}

/** GC roots: a cooled tab's `releaseAllPending` drops the hold on an attachment nobody sent (ONL-2207). */
export function draftImageIds(): Set<string> {
  const ids = new Set<string>();
  for (const stored of Object.values(domain.read().byWorkspace)) {
    for (const image of sanitize(stored)?.images ?? []) ids.add(image.id);
  }
  return ids;
}

export function resetComposerDraftsCache(): void {
  domain.reset();
  removedProjects.clear();
}
