import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { app, dialog } from 'electron';
import { t } from '@studio/i18n';
import { captureError } from '../errors/index.js';
import { log } from '../log/index.js';
import { isMac } from '../env/platform.js';
import { devSwitches } from '../env/dev-switches.js';

const logger = log('updater');

type ReadOnlyLocation = 'disk-image' | 'translocated' | 'read-only-other';

function runningBundle(): string {
  return resolve(dirname(app.getPath('exe')), '..', '..');
}

/** Squirrel.Mac refuses to update a bundle on a read-only mount; a writable copy outside Applications updates today. */
function onReadOnlyVolume(bundle: string): boolean {
  try {
    accessSync(bundle, constants.W_OK);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EROFS';
  }
}

function locationOf(bundle: string): ReadOnlyLocation {
  if (bundle.startsWith('/Volumes/')) return 'disk-image';
  if (bundle.includes('/AppTranslocation/')) return 'translocated';
  return 'read-only-other';
}

function bundleIdentifier(bundle: string): string | undefined {
  try {
    const id = execFileSync(
      '/usr/bin/plutil',
      ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', join(bundle, 'Contents', 'Info.plist')],
      { encoding: 'utf8', timeout: 2_000 },
    ).trim();
    return id === '' ? undefined : id;
  } catch {
    return undefined;
  }
}

/** An unreadable identifier on both sides is not a match: Electron's default on a conflict trashes the other app. */
export function isSameApp(ours: string | undefined, theirs: string | undefined): boolean {
  return ours !== undefined && ours === theirs;
}

/** True when the app is quitting to relaunch from Applications; the caller boots nothing more (ONL-2641). */
export function offerMoveToApplications(): boolean {
  if (!isMac() || !app.isPackaged) return false;
  if (devSwitches.autoUpdate === '0' || devSwitches.agentHeadless !== undefined) return false;
  if (app.isInApplicationsFolder()) return false;

  const bundle = runningBundle();
  if (!onReadOnlyVolume(bundle)) return false;
  const location = locationOf(bundle);

  const choice = dialog.showMessageBoxSync({
    title: t('app.name'),
    type: 'question',
    message: t('update.move.message'),
    detail: t('update.move.detail'),
    buttons: [t('update.move.move'), t('update.move.notNow')],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice !== 0) {
    logger.info('move to Applications declined', { location });
    return false;
  }

  let refusedConflict = false;
  try {
    const moved = app.moveToApplicationsFolder({
      conflictHandler: () => {
        const destination = join('/Applications', basename(bundle));
        const same = isSameApp(bundleIdentifier(bundle), bundleIdentifier(destination));
        refusedConflict = !same;
        return same;
      },
    });
    if (moved) {
      logger.info('moving to Applications', { location });
      return true;
    }
    logger.info(
      refusedConflict
        ? 'move refused: a different app with this name is in Applications'
        : 'move cancelled at the authorization prompt',
      { location },
    );
  } catch (error) {
    captureError(error, { owner: 'environment', subsystem: 'updater', location });
  }
  return false;
}
