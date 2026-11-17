import { AlertDialog } from '../../overlay/Dialog.js';

import { t } from '@studio/i18n';

export interface DeleteArtifactDialogProps {
  isOpen: boolean;
  title: string;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  /** Showroom only: renders without `showModal()` and its scroll lock. */
  isInline?: boolean;
}

/** Names what is about to be destroyed, the way `DeletePageDialog` names what a page holds (ONL-2568). */
export function DeleteArtifactDialog({
  isOpen,
  title,
  onOpenChange,
  onConfirm,
  isInline,
}: DeleteArtifactDialogProps): React.JSX.Element {
  return (
    <AlertDialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={onOpenChange}
      title={t('canvas.artifact.delete.confirm.message', { title })}
      description={t('canvas.artifact.delete.confirm.detail')}
      actionLabel={t('canvas.artifact.delete.confirm.confirm')}
      // Explicit: the library default is an uncatalogued string.
      cancelLabel={t('canvas.artifact.delete.confirm.cancel')}
      actionVariant="primary"
      data-testid="canvas-artifact-delete-confirm"
      onAction={onConfirm}
    />
  );
}
