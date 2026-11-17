import type { ProjectCreateState } from '@studio/events';
import { narrationFor } from '../create/projectCreate.js';
import { t } from '@studio/i18n';

type FailedStage = 'setup' | 'preview';

export type EmptyCanvasState =
  | { kind: 'copying'; repo?: string }
  | { kind: 'question' }
  | { kind: 'failed'; stage: FailedStage }
  | { kind: 'ready' }
  | { kind: 'ideas' }
  | { kind: 'quiet' }
  | { kind: 'unknown' };

export interface EmptyCanvasInputs {
  hasLiveServer: boolean;
  needsAnswer: boolean;
  isBlankProject?: boolean;
  /** The `blank-first-moment` flag. */
  isBlankMomentOn?: boolean;
  hasNodes?: boolean;
  hasUserMessage?: boolean;
  isDocumentKnown: boolean;
  isChatKnown: boolean;
}

function readyState({ isBlankProject = false, isBlankMomentOn = false, hasNodes = false, hasUserMessage = false, isDocumentKnown, isChatKnown }: EmptyCanvasInputs): EmptyCanvasState {
  if (!isDocumentKnown) return { kind: 'unknown' };
  if (!isBlankProject || !isBlankMomentOn || hasNodes) return { kind: 'ready' };
  if (!isChatKnown) return { kind: 'unknown' };
  return hasUserMessage ? { kind: 'quiet' } : { kind: 'ideas' };
}

export function emptyCanvasState(create: ProjectCreateState | null, inputs: EmptyCanvasInputs): EmptyCanvasState {
  const { hasLiveServer, needsAnswer, isBlankProject = false, isBlankMomentOn = false } = inputs;
  const narration = narrationFor(create, { hasLiveServer });
  if (narration?.kind === 'failed') {
    // The preview's own failure says so on the canvas itself, never in a second notice (ONL-2744).
    return { kind: 'failed', stage: narration.phase === 'installing' || narration.phase === 'starting' ? 'preview' : 'setup' };
  }
  if (needsAnswer && !(isBlankProject && isBlankMomentOn)) return { kind: 'question' };
  switch (create?.kind) {
    case 'planning':
      return { kind: 'copying' };
    case 'copying':
      return { kind: 'copying', repo: create.sourceRepoName };
    default:
      return readyState(inputs);
  }
}

const NAME_MAX = 24;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const segments = (text: string): string[] => Array.from(graphemes.segment(text), (part) => part.segment);

export function shortName(name: string): string {
  const parts = segments(name);
  if (parts.length <= NAME_MAX) return name;
  return t('canvas.empty.truncated', { name: parts.slice(0, NAME_MAX - 1).join('') });
}

/** True when a character is built from several code points, which the character morph would split. */
export function hasJoinedCharacters(text: string): boolean {
  return segments(text).some((part) => Array.from(part).length > 1);
}
