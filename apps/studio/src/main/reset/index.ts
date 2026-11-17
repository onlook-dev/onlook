// Clears onboarding and the discover card's resolution, and nothing else; widening this once cost users every project they had (ONL-2123).

import { app, dialog } from 'electron';
import { clearOnboarded } from '../onboarding/state.js';
import { clearDiscoverCta } from '../settings/state.js';
import { t } from '@studio/i18n';
import { dialogParent } from '../window/host.js';

// Beta is the public channel, and deliberately outside this gate (ONL-2796).
// `bun dev` reads the base version unstamped, so the unpackaged arm is not redundant.
export function isResetAvailable(): boolean {
  return /-alpha\.\d+$/.test(app.getVersion()) || !app.isPackaged;
}

async function show(
  options: Electron.MessageBoxOptions,
): Promise<Electron.MessageBoxReturnValue> {
  const parent = dialogParent();
  return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
}

// Both stores are attempted: stopping at one leaves the other uncleared and a relaunch shows half a reset (ONL-2443).
export function clearResetState(): void {
  let failure: unknown;
  try {
    clearDiscoverCta();
  } catch (err) {
    failure = err;
  }
  try {
    clearOnboarded();
  } catch (err) {
    failure ??= err;
  }
  if (failure !== undefined) throw failure;
}

// `quit()`, not `exit()`: quit runs the teardown.
export async function resetStudio(): Promise<void> {
  const chosen = await show({
    title: t('app.name'),
    type: 'question',
    message: t('reset.confirm.message'),
    detail: t('reset.confirm.detail'),
    buttons: [t('reset.confirm.confirm'), t('reset.confirm.cancel')],
    defaultId: 1,
    cancelId: 1,
  });
  if (chosen.response !== 0) return;

  // A failed clear still relaunches: the seal lands before the delete, and a
  // sealed process never writes onboarding again.
  try {
    clearResetState();
  } catch (err) {
    await show({
      title: t('app.name'),
      type: 'error',
      message: t('reset.failed.message'),
      detail: t('reset.failed.detail', { failure: String(err) }),
      buttons: [t('reset.failed.dismiss')],
      defaultId: 0,
      cancelId: 0,
    });
  }

  app.relaunch();
  app.quit();
}
