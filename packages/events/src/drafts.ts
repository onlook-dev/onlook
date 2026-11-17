import type { ArtifactAttachment } from './events.js';

/** `images` carries refs alone; the bytes stay in main's blob store (ONL-2207). */
export interface ComposerDraft {
  text: string;
  images: import('./attachments.js').ChatFileRef[];
  skills?: import('./attachments.js').SkillAttachment[];
  artifacts?: ArtifactAttachment[];
}

export const EMPTY_COMPOSER_DRAFT: ComposerDraft = { text: '', images: [] };

export interface ComposerDraftRequest {
  cwd: string;
}

export interface ComposerDraftSave {
  cwd: string;
  draft: ComposerDraft;
}
