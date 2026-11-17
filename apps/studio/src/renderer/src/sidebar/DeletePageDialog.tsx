import { AlertDialog } from '../overlay/Dialog.js';

import { t } from '@studio/i18n';

export interface DeletePageDialogProps {
  isOpen: boolean;
  name: string;
  /** Asked only above zero; an empty page never reaches this dialog (ONL-2488). */
  nodeCount: number;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  /** Showroom only: renders without `showModal()` and its scroll lock. */
  isInline?: boolean;
}

export function DeletePageDialog({
  isOpen,
  name,
  nodeCount,
  onOpenChange,
  onConfirm,
  isInline,
}: DeletePageDialogProps): React.JSX.Element {
  return (
    <AlertDialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={onOpenChange}
      title={t('sidebar.pages.delete.title', { name })}
      description={
        nodeCount === 1
          ? t('sidebar.pages.delete.bodyOne')
          : t('sidebar.pages.delete.body', { count: nodeCount })
      }
      actionLabel={t('sidebar.pages.delete.confirm')}
      // Explicit: the library default is an uncatalogued string.
      cancelLabel={t('sidebar.pages.delete.cancel')}
      actionVariant="primary"
      data-testid="sidebar-page-delete-confirm"
      onAction={onConfirm}
    />
  );
}
