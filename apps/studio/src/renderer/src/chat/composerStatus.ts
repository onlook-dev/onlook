import type { ComposerStatus } from '@studio/chat-ui';
import { MAX_ELEMENT_SELECTIONS } from '@studio/events';
import type { GatherRefusal } from '../canvas/selection.js';
import { t } from '@studio/i18n';
import type { AttachFailure } from '../attachments.js';

/** Spelled out: a template-literal key is invisible to the string check. */
export function gatherRefusalStatus(reason: GatherRefusal): ComposerStatus {
  switch (reason) {
    case 'count-cap':
      return {
        type: 'warning',
        message: t('chat.refusal.countCap', { count: MAX_ELEMENT_SELECTIONS }),
      };
    case 'byte-cap':
      return { type: 'warning', message: t('chat.refusal.byteCap') };
  }
}

const ATTACH_COPY = {
  'unsupported-format': 'chat.attach.failed.unsupported-format',
  'too-large': 'chat.attach.failed.too-large',
  unreadable: 'chat.attach.failed.unreadable',
  'pdf-unsupported': 'chat.attach.failed.pdfUnsupported',
  'text-too-large': 'chat.attach.failed.textTooLarge',
} as const;

export function attachFailureStatus(failure: AttachFailure): ComposerStatus {
  return { type: 'error', message: [...(failure.previous ?? []), failure].map((item) => t(ATTACH_COPY[item.reason], { name: item.name })).join(' · ') };
}

/**
 * One band, one notice: a failure the user has to act on outranks a cap they just bumped (ONL-2482).
 * An attached PDF on ChatGPT leads, because removing the file is the only thing that clears it (ONL-2607).
 */
export function composerStatusFor(state: {
  unsupportedPdfName: string | undefined;
  sendRejected: boolean;
  attachFailure: AttachFailure | undefined;
  gatherRefusal: GatherRefusal | null;
}): ComposerStatus | undefined {
  if (state.unsupportedPdfName !== undefined) {
    return { type: 'error', message: t('chat.attach.pdfDraft', { name: state.unsupportedPdfName }) };
  }
  if (state.sendRejected) return { type: 'error', message: t('chat.error.sendFailed') };
  const failure = state.attachFailure;
  if (failure) return attachFailureStatus(failure);
  return state.gatherRefusal === null ? undefined : gatherRefusalStatus(state.gatherRefusal);
}
