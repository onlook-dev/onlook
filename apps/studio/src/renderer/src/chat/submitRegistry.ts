import type { ArtifactAttachment, ChatFileRef, SkillAttachment } from '@studio/events';
import type { PromptFrameContext, PromptSubmitResult } from './submitPrompt.js';
import type { ElementSelection } from '../canvas/selection.js';

export interface ChatSubmitRequest {
  text: string;
  /** Replaces the composer's frame selection rather than merging with it (ONL-2455). */
  frames?: PromptFrameContext;
  elementSelections?: readonly ElementSelection[];
  /** Replaces the composer's pending attachments rather than merging with them; absent carries none (ONL-2549). */
  images?: readonly ChatFileRef[];
  skills?: readonly SkillAttachment[];
  artifacts?: readonly ArtifactAttachment[];
  /** Only the Project Chat composer sets it: an open question takes this send as its answer (ONL-2583). */
  answersQuestion?: boolean;
  /** Hidden from the chat; the model reads it beside the frame identity (ONL-2960). */
  context?: string;
}

export interface ChatSubmitActions {
  submit: (request: ChatSubmitRequest) => Promise<PromptSubmitResult>;
}

export type ChatSubmitResult = PromptSubmitResult | { outcome: 'unavailable' };

let registered: ChatSubmitActions | null = null;

/** The live send is held by the mounted chat region, which owns the session; nothing is registered while the project switches (ONL-2455). */
export function registerChatSubmit(actions: ChatSubmitActions): () => void {
  registered = actions;
  return () => {
    if (registered === actions) registered = null;
  };
}

export function submitChatPrompt(request: ChatSubmitRequest): Promise<ChatSubmitResult> {
  if (registered === null) return Promise.resolve({ outcome: 'unavailable' });
  return registered.submit(request);
}

export function isChatSubmitRegistered(): boolean {
  return registered !== null;
}
