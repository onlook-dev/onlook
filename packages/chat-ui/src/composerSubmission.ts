import type { RetryPrompt, TranscriptItem } from '@studio/events';

// `unknown` is pre-probe and counts as connected; a second copy of this drifted (ONL-1981).
export function isComposerConnected(status: string): boolean {
  return status === 'ok' || status === 'unknown';
}

export function canSubmitComposer(
  isConnected: boolean,
  text: string,
  hasPayload: boolean,
): boolean {
  return isConnected && (text.trim().length > 0 || hasPayload);
}

export interface ComposerEnterState {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
  isConnected: boolean;
  text: string;
  hasPayload: boolean;
}

// `send` needs the caller's `preventDefault()`: Astryx's own Enter handler clears the draft.
export type ComposerEnterVerdict = 'ignore' | 'send';

/** No turn term: a prompt sent mid-turn loads main's pen, so there is nothing left to refuse (ONL-2294). */
export function resolveComposerEnter(state: ComposerEnterState): ComposerEnterVerdict {
  if (
    state.key !== 'Enter' ||
    state.shiftKey ||
    state.isComposing ||
    state.keyCode === 229
  ) {
    return 'ignore';
  }
  return canSubmitComposer(state.isConnected, state.text, state.hasPayload) ? 'send' : 'ignore';
}

export interface ComposerRecallState {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  isComposing: boolean;
  keyCode?: number;
  text: string;
  hasSkill: boolean;
  items: readonly TranscriptItem[];
  walk?: ComposerWalk;
}

export interface ComposerWalk {
  entries: RetryPrompt[];
  index: number;
  draft: RetryPrompt;
}

function promptIdentity(prompt: RetryPrompt): string {
  return JSON.stringify([prompt.text, prompt.attachments ?? [], prompt.context ?? '']);
}

export function composerHistory(items: readonly TranscriptItem[]): RetryPrompt[] {
  const entries: RetryPrompt[] = [];
  for (const item of items) {
    if (item.kind !== 'user' || item.origin === 'studio' || item.origin === 'suggestion') continue;
    if (item.text.trim() === '' && !item.attachments?.length) continue;
    if (promptIdentity(item) !== promptIdentity(entries[entries.length - 1] ?? { text: '' })) {
      entries.push({ text: item.text, ...(item.attachments ? { attachments: item.attachments } : {}), ...(item.context !== undefined ? { context: item.context } : {}) });
    }
  }
  return entries;
}

export function resolveComposerRecall(state: ComposerRecallState, draft: RetryPrompt = { text: state.text }): { prompt: RetryPrompt; walk?: ComposerWalk; stepsBack: number } | undefined {
  if (
    (state.key !== 'ArrowUp' && state.key !== 'ArrowDown') ||
    state.shiftKey ||
    state.altKey ||
    state.metaKey ||
    state.ctrlKey ||
    state.isComposing || state.keyCode === 229
  ) {
    return undefined;
  }
  // `hasSkill` gates only the start: every step of a walk may restore a prompt that carries a token (ONL-2047).
  if (!state.walk && (state.key !== 'ArrowUp' || state.text !== '' || state.hasSkill)) return undefined;
  const entries = state.walk?.entries ?? composerHistory(state.items);
  if (entries.length === 0) return undefined;
  const previousIndex = state.walk?.index ?? entries.length;
  const index = Math.max(0, previousIndex + (state.key === 'ArrowUp' ? -1 : 1));
  const savedDraft = state.walk?.draft ?? draft;
  if (index >= entries.length) {
    return { prompt: savedDraft, stepsBack: 0 };
  }
  return { prompt: entries[index]!, walk: { entries, index, draft: savedDraft }, stepsBack: entries.length - index };
}

export interface ComposerEscapeState {
  key: string;
  isComposing: boolean;
  keyCode: number;
  isRepeat: boolean;
  isTurnRunning: boolean;
  isAwaitingUser: boolean;
  isEscapeClaimed: boolean;
}

export type ComposerEscapeVerdict = 'ignore' | 'stop';

/** Pressed only from the composer: Esc elsewhere closes menus, dialogs and canvas tools (ONL-2505). */
export function resolveComposerEscape(state: ComposerEscapeState): ComposerEscapeVerdict {
  if (
    state.key !== 'Escape' ||
    state.isComposing ||
    state.keyCode === 229 ||
    state.isRepeat ||
    !state.isTurnRunning ||
    state.isAwaitingUser ||
    state.isEscapeClaimed
  ) {
    return 'ignore';
  }
  return 'stop';
}
