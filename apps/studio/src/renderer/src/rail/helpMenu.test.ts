import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { seedCapabilities } from '../capabilities.js';
import { en } from '@studio/i18n/strings';
import { openReport, resetReportForTesting, useReportStore } from '../report/store.js';
import { openTipsOnKeys, resetTipsForTesting, setTipsView, useTipsStore } from '../tips/store.js';
import { helpMenuItems } from './helpMenu.js';

const sent: unknown[] = [];

beforeEach(() => {
  sent.length = 0;
  Object.defineProperty(globalThis, 'window', {
    value: { studio: { telemetryEvent: (payload: unknown) => sent.push(payload) } },
    configurable: true,
    writable: true,
  });
  resetReportForTesting();
  resetTipsForTesting();
  seedCapabilities({ report: true });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  seedCapabilities();
});

describe('what help offers', () => {
  it('offers the Help center, an issue, a feature request, the keyboard shortcuts and the tour, and nothing else', () => {
    expect(helpMenuItems().map((item) => item.action)).toEqual(['docs', 'reportIssue', 'requestFeature', 'shortcuts', 'tour']);
  });

  it('offers neither report without a provider that takes them', () => {
    seedCapabilities();
    expect(helpMenuItems().map((item) => item.action)).toEqual(['docs', 'shortcuts', 'tour']);
  });

  it('names a catalog key for each, never a sentence of its own', () => {
    for (const item of helpMenuItems()) expect(Object.hasOwn(en, item.label)).toBe(true);
  });
});

describe('choosing the keyboard shortcuts', () => {
  it('opens the guide already on its keys rather than on its prompts', () => {
    openTipsOnKeys('help');
    expect(useTipsStore.getState()).toMatchObject({ isOpen: true, view: 'hotkeys' });
  });

  it('reports help as the door it was opened by, apart from the pill and the chord', () => {
    openTipsOnKeys('help');
    expect(sent).toEqual([{ event: 'tips_opened', properties: { source: 'help' } }]);
  });

  it('turns an open guide to its keys rather than leaving the designer where they were', () => {
    setTipsView('prompts');
    useTipsStore.setState({ isOpen: true });
    openTipsOnKeys('help');
    expect(useTipsStore.getState().view).toBe('hotkeys');
  });
});

describe('sending feedback from the rail', () => {
  it('records the rail as the door, so it can be told apart from a canvas open', () => {
    openReport('rail', 'bug');
    expect(useReportStore.getState()).toMatchObject({ entryPoint: 'rail', lane: 'bug' });
  });

  it('is a different door from the canvas control', () => {
    openReport('canvas', 'bug');
    expect(useReportStore.getState().entryPoint).not.toBe('rail');
  });
});
