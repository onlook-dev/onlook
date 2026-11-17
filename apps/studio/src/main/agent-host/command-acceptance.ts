import { MAX_NEXT_TASKS, type AgentCommandAcceptance, type ClientCommand, type SuggestionSend } from '@studio/events';
import type { PenPrompt } from './pen.js';
import { splitAttachments } from './prompt-content.js';

interface PromptSession {
  cwd: string;
}

/** What became of an admitted prompt; `refused` is a backend that would not take it. */
export type PromptAdmission = 'sent' | 'held' | 'refused';

export function acceptPromptCommand(
  command: Extract<ClientCommand, { type: 'prompt' }>,
  session: PromptSession | undefined,
  settle: (cwd: string, imageIds: string[]) => void,
  admit: (prompt: PenPrompt) => PromptAdmission,
): AgentCommandAcceptance {
  if (!session) return { accepted: false };

  const admitted = splitAttachments(command.attachments ?? []);
  // Artifacts were checked upstream; leaving them out here dropped them from the message and the prompt (ONL-2593).
  const attachments = [...admitted.images, ...admitted.files, ...admitted.skills, ...admitted.elements, ...admitted.artifacts];
  const text = command.text.trim();
  // `context` and frames are ambient selection; neither admits alone.
  if (text.length === 0 && attachments.length === 0) return { accepted: false };

  const outcome = admit({
    text,
    attachments: [...attachments, ...admitted.frames],
    ...(command.context === undefined || command.context === ''
      ? {}
      : { context: command.context }),
    ...(isSuggestionSend(command.suggestion) ? { suggestion: { index: command.suggestion.index, taps: command.suggestion.taps } } : {}),
    ...(command.resends === 'suggestion' && !isSuggestionSend(command.suggestion) ? { resends: 'suggestion' as const } : {}),
  });
  if (outcome === 'refused') return { accepted: false };
  // A waiting prompt keeps its hold: no row names its images yet, so the hold is their only root (ONL-2294).
  if (outcome === 'held') return { accepted: true, held: true };

  settle(
    session.cwd,
    [...admitted.images, ...admitted.files].map((ref) => ref.id),
  );
  return { accepted: true };
}

function isSuggestionSend(value: SuggestionSend | undefined): value is SuggestionSend {
  return value !== undefined && Number.isInteger(value.index) && value.index >= 0 && value.index < MAX_NEXT_TASKS && Number.isInteger(value.taps) && value.taps >= 1;
}
