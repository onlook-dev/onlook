import { dialog } from 'electron';
import { t } from '@studio/i18n';
import type { CloseLoss } from './close-confirm.js';

const LOSS_KEYS = {
  'unsaved-code': 'tabs.close.confirm.unsavedCode',
  turn: 'tabs.close.confirm.turn',
  approval: 'tabs.close.confirm.approval',
  creation: 'tabs.close.confirm.creation',
} as const;

/** Asks before a close that would lose something; resolves true for the close. */
export async function confirmClose(name: string, losses: readonly CloseLoss[]): Promise<boolean> {
  const detail = [...losses.map((loss) => t(LOSS_KEYS[loss])), t('tabs.close.confirm.servers')].join('\n\n');
  const chosen = await dialog.showMessageBox({
    title: t('app.name'),
    type: 'question',
    message: t('tabs.close.confirm.message', { name }),
    detail,
    buttons: [t('tabs.close.confirm.close'), t('tabs.close.confirm.wait')],
    defaultId: 1,
    cancelId: 1,
  });
  return chosen.response === 0;
}
