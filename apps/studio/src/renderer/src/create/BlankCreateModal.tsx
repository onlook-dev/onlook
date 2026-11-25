import { useId } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { FailureDialogBody } from '../FailureDialogBody.js';
import { t, type StringKey } from '@studio/i18n';
import { FailureDialog } from '../overlay/Dialog.js';
import { dismissBlankCreate, retryBlankCreate, useBlankCreateStore, type BlankCreateStage, type BlankCreateStatus } from './store.js';

const STAGE_COPY: Record<BlankCreateStage, StringKey> = {
  'setting-up': 'blank.create.stage.settingUp',
  installing: 'blank.create.stage.installing',
  starting: 'blank.create.stage.starting',
};

export type BlankCreateFailure = Omit<Extract<BlankCreateStatus, { kind: 'failed' }>, 'kind'>;

export interface BlankCreateFailedDialogProps {
  failure: BlankCreateFailure | null;
  isInline?: boolean;
  onRetry: () => void;
  onClose: () => void;
}

export function BlankCreateFailedDialog({ failure, isInline, onRetry, onClose }: BlankCreateFailedDialogProps): React.JSX.Element {
  const titleId = useId();
  const stageId = useId();
  const gitMissing = failure?.cause === 'git_not_found';
  const explanation = gitMissing ? t('machine.failure.git_not_found') : failure?.explanation;

  return (
    <FailureDialog
      isOpen={failure !== null}
      onDismiss={onClose}
      titleId={titleId}
      descriptionId={stageId}
      {...(isInline === undefined ? {} : { isInline })}
      data-testid="blank-create-modal"
    >
      {failure === null ? null : (
        <FailureDialogBody
          title={t('blank.create.failed.title')}
          body={t('blank.create.failed.stage', { stage: t(STAGE_COPY[failure.stage]) })}
          titleId={titleId}
          descriptionId={stageId}
          data-testid="blank-create-failed"
          data-stage={failure.stage}
          {...(explanation === undefined ? {} : { explanation })}
          explanationTestId="blank-create-explanation"
          {...(gitMissing || failure.detail === undefined ? {} : { detail: failure.detail })}
          actions={
            <>
              {gitMissing ? null : (
                <Button
                  label={t('blank.create.retry')}
                  variant="secondary"
                  data-testid="blank-create-retry"
                  onClick={onRetry}
                />
              )}
              <Button
                label={t('workspace.refused.dismiss')}
                variant="primary"
                data-testid="blank-create-dismiss"
                onClick={onClose}
              />
            </>
          }
        />
      )}
    </FailureDialog>
  );
}

export function BlankCreateModal(): React.JSX.Element {
  const status = useBlankCreateStore((s) => s.status);

  return (
    <BlankCreateFailedDialog
      failure={status.kind === 'failed' ? status : null}
      onRetry={retryBlankCreate}
      onClose={dismissBlankCreate}
    />
  );
}
