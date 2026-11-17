import { Dialog } from '../overlay/Dialog.js';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { useEffect, useRef } from 'react';
import { t, type StringKey } from '@studio/i18n';
import { CloseIcon, Folder2Icon, SettingsIcon } from '../icons/glyphs.js';
import { PANEL_HREF, PANEL_RULES } from '../panel/panelStyles.js';
import { ProjectSetupSection } from '../project-setup/ProjectSetupSection.js';
import { useWorkspaceStore } from '../workspace/store.js';
import { SettingsSurface } from './SettingsSurface.js';
import { closeSettings, setSettingsArea, useSettingsDialogStore, type SettingsArea } from './settingsDialogStore.js';

export const SETTINGS_DIALOG_TESTIDS = {
  dialog: 'settings-dialog',
  close: 'settings-dialog-close',
  areaProject: 'settings-area-project',
  areaGlobal: 'settings-area-global',
  projectArea: 'settings-project-area',
} as const;

const AREA_LABEL: Record<SettingsArea, StringKey> = {
  project: 'settings.area.project',
  global: 'settings.area.global',
};
const AREA_TITLE: Record<SettingsArea, StringKey> = {
  project: 'settings.areaTitle.project',
  global: 'settings.areaTitle.global',
};
const AREA_GLYPH = { project: Folder2Icon, global: SettingsIcon } as const;
const AREA_TESTID: Record<SettingsArea, string> = {
  project: SETTINGS_DIALOG_TESTIDS.areaProject,
  global: SETTINGS_DIALOG_TESTIDS.areaGlobal,
};

export function SettingsDialog(): React.JSX.Element {
  const isOpen = useSettingsDialogStore((s) => s.isOpen);
  const area = useSettingsDialogStore((s) => s.area);
  const hasProject = useWorkspaceStore((s) => s.workspace !== null);
  return (
    <SettingsDialogView
      isOpen={isOpen}
      area={area}
      hasProject={hasProject}
      onClose={closeSettings}
      onArea={setSettingsArea}
    />
  );
}

export interface SettingsDialogViewProps {
  isOpen: boolean;
  area: SettingsArea;
  /** The Project area goes with the project: without one, the modal stays on Global and keeps the stored area for the return. */
  hasProject: boolean;
  onClose: () => void;
  onArea: (area: SettingsArea) => void;
  /** Showroom and tests only: renders without `showModal()` and its focus trap. */
  isInline?: boolean;
}

export function SettingsDialogView({
  isOpen,
  area,
  hasProject,
  onClose,
  onArea,
  isInline,
}: SettingsDialogViewProps): React.JSX.Element {
  const shellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const shell = shellRef.current;
    if (!isOpen || shell === null) return;
    /* Focus lands on the shell, not the first control: a dialog opened by a key would ring that control. */
    shell.focus({ preventScroll: true });
    /* Native and between the two dialogs: React delegates keydown above both, so no React handler can let the in-place setup sheet take Escape alone (ONL-2499). */
    const stopNested = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      const sheet = event.target instanceof Element ? event.target.closest('dialog') : null;
      if (sheet !== null && shell.contains(sheet)) event.stopPropagation();
    };
    shell.addEventListener('keydown', stopNested);
    return () => {
      shell.removeEventListener('keydown', stopNested);
    };
  }, [isOpen]);

  const areas: readonly SettingsArea[] = hasProject ? ['project', 'global'] : ['global'];
  const shown: SettingsArea = hasProject ? area : 'global';

  return (
    <Dialog
      isOpen={isOpen}
      {...(isInline === undefined ? {} : { isInline })}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // 220 side + 2×24 gutter + `SETTINGS_CONTENT_WIDTH`: the settings column renders at the width it was drawn for.
      width="min(868px, 88vw)"
      maxHeight="86vh"
      padding={0}
      aria-label={t('settings.title')}
      data-testid={SETTINGS_DIALOG_TESTIDS.dialog}
      // Which area is showing, as a fact: every label here is translatable, so none is a stable handle (ONL-2563).
      data-area={shown}
    >
      <style href={PANEL_HREF} precedence="medium">
        {PANEL_RULES}
      </style>
      <div ref={shellRef} className="panel-shell" tabIndex={-1}>
        <aside className="panel-side">
          <div className="panel-brand">{t('settings.title')}</div>
          <nav className="panel-nav">
            {areas.map((item) => {
              const Glyph = AREA_GLYPH[item];
              return (
                <button
                  key={item}
                  type="button"
                  className="panel-nav-item"
                  data-testid={AREA_TESTID[item]}
                  aria-current={item === shown ? 'page' : undefined}
                  onClick={() => {
                    onArea(item);
                  }}
                >
                  <Glyph />
                  {t(AREA_LABEL[item])}
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="panel-main">
          <div className="panel-head">
            <h1 className="panel-title">{t(AREA_TITLE[shown])}</h1>
            <IconButton
              label={t('settings.dialog.close')}
              icon={<Icon icon={CloseIcon} color="inherit" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid={SETTINGS_DIALOG_TESTIDS.close}
            />
          </div>
          <div className="panel-content">
            {shown === 'global' ? <SettingsSurface />
              : <section data-testid={SETTINGS_DIALOG_TESTIDS.projectArea}><ProjectSetupSection /></section>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
