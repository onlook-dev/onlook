import { artifactSummaryPages, artifactTitleLabels, type ArtifactAttachment, type ArtifactSummary, type ComposerDraft, type PromptAttachment } from '@studio/events';
import type { ElementSelection } from '../canvas/selection.js';

export function planRecalledElements(
  attachments: readonly PromptAttachment[],
  frames: readonly { id: string; currentUrl?: string; targetUrl?: string }[],
): { selections: ElementSelection[]; missing: string[] } {
  const selections: ElementSelection[] = [];
  const missing: string[] = [];
  for (const attachment of attachments) {
    if (!('kind' in attachment) || attachment.kind !== 'element') continue;
    const matches = frames.filter((frame) => frame.currentUrl === attachment.frameUrl || frame.targetUrl === attachment.frameUrl);
    if (matches.length !== 1) { missing.push(attachment.tag); continue; }
    selections.push({ evidence: attachment, frameNodeId: matches[0]!.id, stale: true });
  }
  return { selections, missing };
}

/** This page's frames, by the label the chip row shows; an ambiguous name resolves to nothing (ONL-2509). */
export function planRecalledFrames(
  attachments: readonly PromptAttachment[],
  onThisPage: readonly { id: string; label: string | undefined }[],
): { frameNodeIds: string[]; missing: string[] } {
  const frameNodeIds: string[] = [];
  const missing: string[] = [];
  for (const attachment of attachments) {
    if (!('kind' in attachment) || attachment.kind !== 'frame') continue;
    const matches = onThisPage.flatMap((node) => node.label === attachment.name ? [node.id] : []);
    if (matches.length !== 1) { missing.push(attachment.name); continue; }
    frameNodeIds.push(matches[0]!);
  }
  return { frameNodeIds, missing };
}

const ARTIFACT_CHIP = 'artifact-ref-';

/** A restored artifact reference is a chip with no canvas node behind it, so it carries its own id. */
export function artifactChipId(reference: { artifactId: string; pagePath?: string }): string {
  return `${ARTIFACT_CHIP}${reference.artifactId}:${reference.pagePath ?? ''}`;
}

export function isArtifactChipId(id: string): boolean {
  return id.startsWith(ARTIFACT_CHIP);
}

export function restoredArtifactLabels(references: readonly ArtifactAttachment[], canvasArtifacts: readonly { id: string; title: string }[], titles: ReadonlyMap<string, string>): Map<string, string> {
  return artifactTitleLabels([
    ...canvasArtifacts.map((artifact) => ({ ...artifact, title: titles.get(artifact.id) ?? artifact.title })),
    ...references.map((artifact) => ({ id: artifact.artifactId, title: titles.get(artifact.artifactId) ?? artifact.title })),
  ]);
}

/**
 * `refused: 'keep'` for a chip already on screen, which a refusal must not take
 * away; `'drop'` for one being introduced, which is then named as missing.
 */
export async function restoreArtifactReferences(
  references: readonly ArtifactAttachment[],
  read: (id: string) => Promise<ArtifactSummary | null>,
  refused: 'keep' | 'drop' = 'keep',
): Promise<ArtifactAttachment[]> {
  const restored = await Promise.all(references.map(async (reference) => {
    let artifact: ArtifactSummary | null;
    try { artifact = await read(reference.artifactId); }
    catch { return refused === 'keep' ? reference : null; }
    if (artifact === null) return null;
    if (reference.pagePath !== undefined && !artifactSummaryPages(artifact).some((page) => page.path === reference.pagePath)) return null;
    return { ...reference, title: artifact.title };
  }));
  return restored.filter((reference) => reference !== null);
}

export interface ComposerSnapshot {
  text: string;
}

export interface DraftRestore {
  text: string;
}

/** Text only; chips restore separately (ONL-2207). */
export function planDraftRestore(
  stored: ComposerDraft,
  composer: ComposerSnapshot,
): DraftRestore | null {
  if (stored.text === '') return null;
  if (composer.text !== '') return null;
  return { text: stored.text };
}
