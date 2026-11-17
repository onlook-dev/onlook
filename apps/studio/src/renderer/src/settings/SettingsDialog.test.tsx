import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { t } from '@studio/i18n';
import { SETTINGS_DIALOG_TESTIDS, SettingsDialogView, type SettingsDialogViewProps } from './SettingsDialog.js';

function render(over: Partial<SettingsDialogViewProps> = {}): string {
  return renderToStaticMarkup(
    <SettingsDialogView isOpen isInline hasProject area="global" onClose={() => {}} onArea={() => {}} {...over} />,
  );
}

/** The nav item the shell marks as the area showing, read back whichever order React emitted its attributes in. */
function currentArea(markup: string): string | undefined {
  const pattern = /<button[^>]*?(?:aria-current="page"[^>]*?data-testid="([^"]+)"|data-testid="([^"]+)"[^>]*?aria-current="page")/;
  const found = pattern.exec(markup);
  return found?.[1] ?? found?.[2];
}

describe('the Settings modal (ONL-2499)', () => {
  it('offers both areas while a project is open, and only Global without one', () => {
    const withProject = render();
    expect(withProject).toContain(t('settings.area.project'));
    expect(withProject).toContain(t('settings.area.global'));

    const withoutProject = render({ hasProject: false });
    expect(withoutProject).not.toContain(t('settings.area.project'));
    expect(withoutProject).toContain(t('settings.area.global'));
  });

  it('shows today’s settings in Global, and marks Global as the area showing', () => {
    const markup = render();
    expect(markup).toContain(t('settings.section.defaults'));
    expect(markup).not.toContain(SETTINGS_DIALOG_TESTIDS.projectArea);
    expect(currentArea(markup)).toBe(SETTINGS_DIALOG_TESTIDS.areaGlobal);
  });

  it('swaps to the project area, and marks Project as the area showing', () => {
    const markup = render({ area: 'project' });
    expect(markup).toContain(SETTINGS_DIALOG_TESTIDS.projectArea);
    expect(markup).not.toContain(t('settings.section.defaults'));
    expect(currentArea(markup)).toBe(SETTINGS_DIALOG_TESTIDS.areaProject);
  });

  it('shows Global when the chosen area has no project behind it', () => {
    const markup = render({ area: 'project', hasProject: false });
    expect(markup).toContain(t('settings.section.defaults'));
    expect(currentArea(markup)).toBe(SETTINGS_DIALOG_TESTIDS.areaGlobal);
  });

  it('carries an accessible name of its own, which no section inside it supplies', () => {
    expect(render()).toContain(`aria-label="${t('settings.title')}"`);
  });

  it('offers a way out that is not the backdrop', () => {
    const markup = render();
    expect(markup).toContain(SETTINGS_DIALOG_TESTIDS.close);
    expect(markup).toContain(t('settings.dialog.close'));
  });
});
