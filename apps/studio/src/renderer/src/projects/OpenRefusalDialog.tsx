import { useId } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { MAX_PROJECT_TABS, type OpenProjectResult } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { FailureDialogBody } from '../FailureDialogBody.js';
import { FailureDialog } from '../overlay/Dialog.js';

type OpenFailure = Extract<OpenProjectResult, { ok: false }>['reason'] | 'failed';

const BODY: Record<OpenFailure, StringKey> = {
  'at-limit': 'tabs.newAtLimit',
  'unknown-project': 'projects.open.unknown',
  'workspace-missing': 'projects.open.missing',
  removing: 'projects.open.removing',
  failed: 'projects.open.failed',
};

export function OpenRefusalDialog({ reason, onDismiss, isInline }: {
  reason: OpenFailure | null;
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
      data-testid="project-open-dialog"
    >
      {reason !== null && <FailureDialogBody
        title={t('projects.open.title')}
        body={t(BODY[reason], { max: MAX_PROJECT_TABS })}
        titleId={titleId}
        descriptionId={descriptionId}
        data-testid="project-open-refused"
        actions={<Button label={t('projects.import.refused.dismiss')} variant="primary" onClick={onDismiss} data-testid="project-open-dismiss" />}
      />}
    </FailureDialog>
  );
}
