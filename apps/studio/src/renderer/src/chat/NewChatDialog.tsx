import { useRef, useState } from 'react';
import type { AgentCommandAcceptance } from '@studio/events';
import { AlertDialog } from '../overlay/Dialog.js';
import { t } from '@studio/i18n';
import {
  beginAttempt,
  dismissConfirm,
  idleConfirm,
  settleConfirm,
  type ConfirmState,
} from './newChatConfirm.js';

export interface NewChatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => Promise<AgentCommandAcceptance>;
  /** Showroom only: renders without `showModal()` and its scroll lock. */
  isInline?: boolean;
}

/** Held open until main answers; closing regardless would leave the old chat on screen with the refusal unsaid (ONL-2198). */
export function NewChatDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isInline,
}: NewChatDialogProps): React.JSX.Element {
  const [confirm, setConfirm] = useState(idleConfirm);
  // Mirrors `confirm` so a late answer is judged against the live state outside a state updater.
  const live = useRef(confirm);
  const apply = (next: ConfirmState): void => {
    live.current = next;
    setConfirm(next);
  };

  const close = (next: boolean): void => {
    if (next) return;
    apply(dismissConfirm(live.current));
    onOpenChange(false);
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={close}
      title={t('chat.newChat.confirm.title')}
      description={confirm.status === 'failed' ? t('chat.newChat.failed') : t('chat.newChat.confirm.body')}
      actionLabel={t('chat.newChat.confirm.start')}
      // Explicit: the library default is an uncatalogued string that reads the same, so neither `check:strings` nor the test sees it return.
      cancelLabel={t('chat.newChat.confirm.cancel')}
      actionVariant="primary"
      isActionLoading={confirm.status === 'starting'}
      data-testid="chat-new-confirm"
      onAction={() => {
        const begun = beginAttempt(live.current);
        if (!begun.started) return;
        apply(begun.next);
        const { attempt } = begun.next;
        // Judged outside the updater: an updater must be pure, and React runs it during render.
        const settle = (outcome: 'accepted' | 'refused'): void => {
          const settled = settleConfirm(live.current, attempt, outcome);
          if (!settled.applied) return;
          apply(settled.next);
          if (settled.close) onOpenChange(false);
        };
        void onConfirm()
          .then((acceptance) => {
            settle(acceptance.accepted ? 'accepted' : 'refused');
          })
          .catch(() => {
            settle('refused');
          });
      }}
    />
  );
}
