import type { CreationEntryPoint } from '@studio/events';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';

/**
 * Asks for a source folder and creates a Project from it in this Tab. Main plans
 * what was picked and refuses it in place, so a refusal reaches the canvas's own
 * dialog rather than a second one here (ONL-3285).
 */
export async function chooseProjectSource(entryPoint: CreationEntryPoint): Promise<boolean> {
  const picked = await studio().pickFolder({
    title: t('project.dialog.title'),
    buttonLabel: t('project.dialog.confirm'),
    creationSource: 'folder',
  });
  if (picked.canceled || picked.folder === undefined) return false;
  studio().tabsCreateProject({ sourcePath: picked.folder.path, entryPoint });
  return true;
}
