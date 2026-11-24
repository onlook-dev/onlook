import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsRow } from './rows.js';
import { SettingsSections } from './SettingsPane.js';
import { t } from '@studio/i18n';
import { DEFAULT_NOTIFICATIONS } from '@studio/events';

test('analytics uses the settings switch, shows consent and preserves failure and saving states', () => {
  const render = (value: boolean, isSaving = false, saveFailed = false) => renderToStaticMarkup(
    <AnalyticsRow value={value} isSaving={isSaving} saveFailed={saveFailed} onChange={() => {}} />,
  );
  expect(render(true)).toContain('checked=""');
  expect(render(false)).not.toContain('checked=""');
  expect(render(true)).toContain('role="switch"');
  expect(render(true)).toContain(t('settings.analytics.label'));
  expect(render(true)).toContain(t('settings.analytics.description'));
  const source = renderToStaticMarkup(<AnalyticsRow value consent="accepted" onChange={() => {}} />);
  expect(source).toContain(t('telemetry.settings.label'));
  expect(source).toContain(t('telemetry.settings.description'));
  expect(source).not.toContain(t('settings.analytics.description'));
  expect(render(true, true)).toContain('disabled=""');
  expect(render(false, false, true)).toContain(t('settings.analytics.saveFailed'));
  expect(render(false, false, true)).toContain('role="alert"');
});

test('analytics follows notifications in General Settings', () => {
  const pane = renderToStaticMarkup(<SettingsSections
    agent="codex"
    readiness={{ claude: 'ready', codex: 'ready', opencode: 'ready', freebuff: 'ready' }}
    onAgentChange={() => {}}
    onSetUp={() => {}}
    analytics={{ value: true, onChange: () => {} }}
    notifications={{ preference: DEFAULT_NOTIFICATIONS, onAction: () => {} }}
  />);
  expect(pane.indexOf('settings-section-defaults')).toBeLessThan(pane.indexOf('settings-section-analytics'));
  expect(pane.indexOf('settings-section-notifications')).toBeLessThan(pane.indexOf('settings-section-analytics'));
  expect(pane).toContain('settings-analytics-toggle');
});
