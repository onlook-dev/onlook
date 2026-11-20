import type { CreationEntryPoint } from '@studio/events';
import { t } from '@studio/i18n';
import { studio } from '../bridge.js';

/** Main plans what was picked and refuses it in place, so a refusal reaches the canvas's own dialog (ONL-3285). */
export async function chooseProjectSource(entryPoint: CreationEntryPoint): Promise<void> {
  const picked = await studio().pickFolder({
    title: t('project.dialog.title'),
    buttonLabel: t('project.dialog.confirm'),
    creationSource: 'folder',
  });
  if (picked.canceled || picked.folder === undefined) return;
  studio().tabsCreateProject({ sourcePath: picked.folder.path, entryPoint });
}
