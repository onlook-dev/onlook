import { t } from '@studio/i18n';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCanvasStore } from '../canvas/store.js';
import { RailView } from '../rail/Rail.js';
import { ExperimentalPane, SettingsNavigation } from './ExperimentalPane.js';
import { resetSettingsPrimeForTests, useSettingsStore } from './store.js';

beforeEach(resetSettingsPrimeForTests);
afterEach(() => {
  resetSettingsPrimeForTests();
  useCanvasStore.getState().setLeftPanelView('designs');
});

describe('Code panel opt-in', () => {
  it('rejects all direct opens while off and resets a live or restored Code view', () => {
    useCanvasStore.getState().setLeftPanelView('code');
    expect(useCanvasStore.getState().leftPanelView).toBe('designs');
    useSettingsStore.getState().apply({ experimentalCodePanel: true });
    useCanvasStore.getState().setLeftPanelView('code');
    expect(useCanvasStore.getState().leftPanelView).toBe('code');
    useSettingsStore.getState().apply({ experimentalCodePanel: false });
    expect(useCanvasStore.getState().leftPanelView).toBe('designs');
    useCanvasStore.setState({ leftPanelView: 'code' });
    useSettingsStore.getState().apply({});
    expect(useCanvasStore.getState().leftPanelView).toBe('designs');
  });

  it('reflects the flag in the actual rail markup', () => {
    const render = (): string => renderToStaticMarkup(<RailView view="designs" codeEnabled={useSettingsStore.getState().experimentalCodePanel} onView={() => {}} />);
    expect(render()).not.toContain('rail-view-code');
    useSettingsStore.getState().apply({ experimentalCodePanel: true });
    expect(render()).toContain('rail-view-code');
    useSettingsStore.getState().apply({});
    expect(render()).not.toContain('rail-view-code');
  });

  it('lists Experimental last and renders an accessible opt-in control', () => {
    const nav = renderToStaticMarkup(<SettingsNavigation value="experimental" onChange={() => {}} />);
    expect(nav.indexOf('settings-nav-general')).toBeLessThan(nav.indexOf('settings-nav-experimental'));
    const pane = renderToStaticMarkup(<ExperimentalPane value={false} onChange={() => {}} />);
    expect(pane).toContain(t('settings.codePanel.description'));
    expect(pane).toContain('Code panel');
    expect(pane).toContain('settings-code-panel-toggle');
    expect(pane).toContain('role="switch"');
    expect(pane).not.toContain('checked=""');
  });
});
