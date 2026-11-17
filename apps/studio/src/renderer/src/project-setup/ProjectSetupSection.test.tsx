import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { SETTINGS_DIALOG_TESTIDS, SettingsDialogView } from '../settings/SettingsDialog.js';

function settings(hasProject: boolean): string {
  return renderToStaticMarkup(
    <SettingsDialogView isOpen isInline hasProject={hasProject} area="project" onClose={() => undefined} onArea={() => undefined} />,
  );
}

describe('the setup script as Project settings’ one section (ONL-2499)', () => {
  it('fills the Project area, and offers no way out of its own', () => {
    const markup = settings(true);
    expect(markup).toContain(SETTINGS_DIALOG_TESTIDS.projectArea);
    expect(markup).toContain('data-testid="project-setup-panel"');
    expect(markup).toContain(t('projectSetup.loading'));
    expect(markup).not.toContain('project-setup-close');
    expect(markup).toContain(SETTINGS_DIALOG_TESTIDS.close);
  });

  it('leaves the modal the only accessible name, which no heading of the section supplies', () => {
    const markup = settings(true);
    expect(markup).toContain(`aria-label="${t('settings.title')}"`);
    expect(markup).not.toMatch(/<h\d[^>]*\bid=/);
  });

  it('is absent with no project on the Tab', () => {
    const markup = settings(false);
    expect(markup).not.toContain(SETTINGS_DIALOG_TESTIDS.projectArea);
    expect(markup).not.toContain('data-testid="project-setup-panel"');
  });
});
