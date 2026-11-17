import { describe, expect, it } from 'bun:test';
import { startControlShown } from './toolbarRunControl.js';

const BLANK = { isOn: true, isBlankProject: true, isImportSettingUp: false, hasBeenUp: false };
const IMPORTING = { isOn: true, isBlankProject: false, isImportSettingUp: true, hasBeenUp: false };

describe('whether the toolbar shows Start (ONL-2960)', () => {
  it('always shows it with start-control off, as main does', () => {
    expect(startControlShown({ ...BLANK, isOn: false })).toBe(true);
    expect(startControlShown({ ...IMPORTING, isOn: false })).toBe(true);
  });

  it('hides it while a new draft or an import sets up', () => {
    expect(startControlShown(BLANK)).toBe(false);
    expect(startControlShown(IMPORTING)).toBe(false);
  });

  it('shows it once the app is first up', () => {
    expect(startControlShown({ ...BLANK, hasBeenUp: true })).toBe(true);
    expect(startControlShown({ ...IMPORTING, hasBeenUp: true })).toBe(true);
  });

  it('keeps it after the server stops, since the app was up once', () => {
    expect(startControlShown({ ...BLANK, hasBeenUp: true, isImportSettingUp: true })).toBe(true);
  });

  it('shows it on a project that is not setting up', () => {
    expect(startControlShown({ ...IMPORTING, isImportSettingUp: false })).toBe(true);
  });
});
