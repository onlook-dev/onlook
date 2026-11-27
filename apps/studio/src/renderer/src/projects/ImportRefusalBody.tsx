import type { ProjectImportRefusalReason } from '@studio/events';
import { useId } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { FailureDialogBody } from '../FailureDialogBody.js';
import { t, type StringKey } from '@studio/i18n';
import { FailureDialog } from '../overlay/Dialog.js';

const IMPORT_REFUSAL_COPY: Record<
  ProjectImportRefusalReason,
  { title: StringKey; body: StringKey }
> = {
  'runtime-unavailable': {
    title: 'machine.wsl.unavailable.title',
    body: 'machine.wsl.unavailable.body',
  },
  'not-a-repository': {
    title: 'projects.import.refused.notARepository.title',
    body: 'projects.import.refused.notARepository.body',
  },
  'repository-gone': {
    title: 'projects.import.refused.repositoryGone.title',
    body: 'projects.import.refused.repositoryGone.body',
  },
  'is-the-repository': {
    title: 'projects.import.refused.isTheRepository.title',
    body: 'projects.import.refused.isTheRepository.body',
  },
  'inside-a-project': {
    title: 'projects.import.refused.insideAProject.title',
    body: 'projects.import.refused.insideAProject.body',
  },
  'already-a-project': {
    title: 'projects.import.refused.alreadyAProject.title',
    body: 'projects.import.refused.alreadyAProject.body',
  },
  busy: {
    title: 'projects.import.refused.busy.title',
    body: 'projects.import.refused.busy.body',
  },
  'being-cleaned-up': {
    title: 'projects.import.refused.beingCleanedUp.title',
    body: 'projects.import.refused.beingCleanedUp.body',
  },
  'fields-incomplete': {
    title: 'projects.import.refused.fieldsIncomplete.title',
    body: 'projects.import.refused.fieldsIncomplete.body',
  },
};

export function ImportRefusalBody({
  reason,
  detail,
  onDismiss,
  titleId,
  descriptionId,
}: {
  reason: ProjectImportRefusalReason;
  detail?: string;
  onDismiss: () => void;
  titleId?: string;
  descriptionId?: string;
}): React.JSX.Element {
  const copy = IMPORT_REFUSAL_COPY[reason];
  return (
    <FailureDialogBody
      title={t(copy.title)}
      body={t(copy.body)}
      detail={detail}
      detailTestId="import-refused-detail"
      {...(titleId === undefined ? {} : { titleId })}
      {...(descriptionId === undefined ? {} : { descriptionId })}
      data-testid="import-refused"
      actions={
        <Button
          label={t('projects.import.refused.dismiss')}
          variant="primary"
          data-testid="import-refused-dismiss"
          onClick={onDismiss}
        />
      }
    />
  );
}

export function ImportRefusalDialog({ reason, detail, onDismiss, isInline }: {
  reason: ProjectImportRefusalReason | null;
  detail?: string;
  onDismiss: () => void;
  isInline?: boolean;
}): React.JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <FailureDialog
      isOpen={reason !== null}
      onDismiss={onDismiss}
      titleId={titleId}
      descriptionId={descriptionId}
      {...(isInline === undefined ? {} : { isInline })}
      data-testid="import-dialog"
    >
      {reason !== null && <ImportRefusalBody reason={reason} detail={detail} onDismiss={onDismiss} titleId={titleId} descriptionId={descriptionId} />}
    </FailureDialog>
  );
}
