import type { WorkspaceRefusalReason } from '@studio/events';
import { useId } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { FailureDialogBody } from '../FailureDialogBody.js';
import { t, type StringKey } from '@studio/i18n';
import { FailureDialog } from '../overlay/Dialog.js';
import type { Refusal } from './refusal.js';

export { refusalFrom, type Refusal } from './refusal.js';

const REFUSAL_COPY: Record<WorkspaceRefusalReason, { title: StringKey; body: StringKey }> = {
  'nothing-to-copy': {
    title: 'workspace.startFresh.title',
    body: 'workspace.startFresh.body',
  },
  'already-copied': {
    title: 'workspace.refused.alreadyCopied.title',
    body: 'workspace.refused.alreadyCopied.body',
  },
  'no-base-ref': {
    title: 'workspace.refused.noBaseRef.title',
    body: 'workspace.refused.noBaseRef.body',
  },
  'name-unavailable': {
    title: 'workspace.refused.nameUnavailable.title',
    body: 'workspace.refused.nameUnavailable.body',
  },
};

export function RefusalBody({
  refusal,
  onDismiss,
  onCreateBlank,
  titleId,
  descriptionId,
}: {
  refusal: Refusal;
  onDismiss: () => void;
  onCreateBlank?: () => void;
  titleId?: string;
  descriptionId?: string;
}): React.JSX.Element {
  const isEmpty = refusal.reason === 'nothing-to-copy';
  const copy = REFUSAL_COPY[refusal.reason];
  const params = { projectName: refusal.projectName ?? '', folderName: refusal.folderName ?? '' };
  return (
    <FailureDialogBody
      title={t(copy.title, params)}
      body={t(copy.body, params)}
      {...(titleId === undefined ? {} : { titleId })}
      {...(descriptionId === undefined ? {} : { descriptionId })}
      {...(refusal.detail === undefined ? {} : { detail: refusal.detail })}
      detailTestId="workspace-refused-detail"
      data-testid={isEmpty ? 'workspace-start-fresh' : 'workspace-refused'}
      actions={
        <>
          <Button
            label={t('workspace.refused.dismiss')}
            variant={isEmpty && onCreateBlank !== undefined ? 'secondary' : 'primary'}
            data-testid="workspace-refused-dismiss"
            onClick={onDismiss}
          />
          {isEmpty && onCreateBlank !== undefined && (
            <Button
              label={t('workspace.startFresh.startBlank')}
              variant="primary"
              data-testid="workspace-start-blank"
              onClick={onCreateBlank}
            />
          )}
        </>
      }
    />
  );
}

export function RefusalDialog({
  refusal,
  onDismiss,
  onCreateBlank,
  isInline,
}: {
  refusal: Refusal | undefined;
  onDismiss: () => void;
  onCreateBlank?: () => void;
  isInline?: boolean;
}): React.JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <FailureDialog
      isOpen={refusal !== undefined}
      onDismiss={onDismiss}
      titleId={titleId}
      descriptionId={descriptionId}
      {...(isInline === undefined ? {} : { isInline })}
      data-testid="connect-dialog"
    >
      {refusal && (
        <RefusalBody
          refusal={refusal}
          titleId={titleId}
          descriptionId={descriptionId}
          onDismiss={onDismiss}
          {...(onCreateBlank === undefined ? {} : { onCreateBlank })}
        />
      )}
    </FailureDialog>
  );
}
