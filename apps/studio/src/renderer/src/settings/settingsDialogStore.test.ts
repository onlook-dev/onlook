import { beforeEach, describe, expect, it } from 'bun:test';
import {
  closeSettings,
  openSettings,
  resetSettingsDialogForTesting,
  setSettingsArea,
  useSettingsDialogStore,
} from './settingsDialogStore.js';

const sent: unknown[] = [];

beforeEach(() => {
  sent.length = 0;
  Object.defineProperty(globalThis, 'window', {
    value: { studio: { telemetryEvent: (payload: unknown) => sent.push(payload) } },
    configurable: true,
    writable: true,
  });
  resetSettingsDialogForTesting();
});

describe('the Settings modal store (ONL-2499)', () => {
  it('opens on Global, and records the door that asked', () => {
    openSettings('menu');
    expect(useSettingsDialogStore.getState()).toMatchObject({ isOpen: true, area: 'global', source: 'menu' });
    expect(sent).toEqual([{ event: 'settings_opened', properties: { source: 'menu' } }]);
  });

  it('leaves an already-open modal on the area being read, and does not re-record the door', () => {
    openSettings('menu');
    setSettingsArea('project');
    openSettings('sidebar');
    expect(useSettingsDialogStore.getState()).toMatchObject({ isOpen: true, area: 'project', source: 'menu' });
    expect(sent).toEqual([{ event: 'settings_opened', properties: { source: 'menu' } }]);
  });

  it('closes, and reopens on the area the person last chose', () => {
    openSettings('sidebar');
    setSettingsArea('project');
    closeSettings();
    expect(useSettingsDialogStore.getState().isOpen).toBe(false);
    openSettings('menu');
    expect(useSettingsDialogStore.getState()).toMatchObject({ isOpen: true, area: 'project', source: 'menu' });
  });
});
