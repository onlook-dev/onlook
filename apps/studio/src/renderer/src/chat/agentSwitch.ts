import type { AgentCommandAcceptance, HarnessId, RetryPrompt } from '@studio/events';
import type { ArtifactAttachment } from '@studio/events';
import type { ElementSelection } from '../canvas/selection.js';

export interface ManualComposerDraft {
  prompt: RetryPrompt;
  elements: ElementSelection[];
  selectedNodeIds: string[];
  artifacts: ArtifactAttachment[];
}

export type SwitchRefill =
  | { kind: 'manual'; draft: ManualComposerDraft }
  | { kind: 'failed'; prompt: RetryPrompt }
  | { kind: 'none' };

export interface PendingRefill {
  refill: SwitchRefill;
  fromSessionId: string | undefined;
  workspacePath: string | undefined;
  harness: HarnessId;
}

/** A refused switch holds nothing, so the composer is left as it was (ONL-2903). */
export async function switchAgent(
  harness: HarnessId,
  failed: RetryPrompt | undefined,
  fromSessionId: string | undefined,
  deps: {
    command: (harness: HarnessId) => Promise<AgentCommandAcceptance>;
    hold: (pending: PendingRefill) => void;
    workspacePath: string | undefined;
    captureManual?: () => ManualComposerDraft;
  },
): Promise<boolean> {
  const { accepted } = await deps.command(harness);
  if (accepted) {
    const refill: SwitchRefill = deps.captureManual !== undefined
      ? { kind: 'manual', draft: deps.captureManual() }
      : failed === undefined
        ? { kind: 'none' }
        : { kind: 'failed', prompt: failed.attachments === undefined ? { text: failed.text } : { text: failed.text, attachments: failed.attachments } };
    deps.hold({ refill, fromSessionId, workspacePath: deps.workspacePath, harness });
  }
  return accepted;
}

/** Waits for the new chat's announcement, which ends any recall restore begun under the old one (ONL-2509); `context` was the model's alone. */
export function refillDue(
  pending: PendingRefill | undefined,
  announcedSessionId: string | undefined,
  workspacePath: string | undefined,
  harness: HarnessId | undefined,
): SwitchRefill | undefined {
  if (pending === undefined || announcedSessionId === undefined || announcedSessionId === pending.fromSessionId ||
    pending.workspacePath !== workspacePath || pending.harness !== harness) return undefined;
  return pending.refill;
}
