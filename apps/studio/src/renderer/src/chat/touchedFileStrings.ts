import type { TouchedFilesProps } from '@studio/chat-ui';
import { t } from '@studio/i18n';

export function touchedFileStrings(): TouchedFilesProps['strings'] {
  return {
    title: t('chat.files.title'),
    editedOne: t('chat.files.editedOne'),
    editedMany: t('chat.files.editedMany'),
    showOneMore: t('chat.files.showOneMore'),
    showMore: t('chat.files.showMore'),
    showLess: t('chat.files.showLess'),
    open: t('chat.files.open'),
    statuses: {
      editing: t('chat.files.editing'),
      edited: t('chat.files.edited'),
      created: t('chat.files.created'),
      deleted: t('chat.files.deleted'),
      stopped: t('chat.files.stopped'),
      failed: t('chat.files.failed'),
      denied: t('chat.files.denied'),
    },
  };
}
