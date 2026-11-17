import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import { PANEL_DEFAULTS, PANEL_LIMITS } from '@studio/events';

const { readPanels, writePanels, resetPanelsCache } = await import('./state.js');

const savedStateRoot = process.env['STUDIO_STATE_ROOT'];

afterAll(() => {
  if (savedStateRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedStateRoot;
  cleanupTempFixtures();
});

let stateRoot: string;

beforeEach(() => {
  stateRoot = makeStateRoot({ name: 'panels' });
  process.env['STUDIO_STATE_ROOT'] = stateRoot;
  resetPanelsCache();
});

function plant(data: unknown): void {
  writeFileSync(join(stateRoot, 'panels.json'), `${JSON.stringify({ version: 1, data })}\n`);
}

describe('readPanels', () => {
  it('answers the defaults on a fresh install', () => {
    expect(readPanels()).toEqual(PANEL_DEFAULTS);
  });

  it('drops an out-of-range width to the default and keeps its healthy sibling', () => {
    plant({ sidebar: 5000, end: 400, code: 500 });
    expect(readPanels()).toEqual({ sidebar: PANEL_DEFAULTS.sidebar, end: 400, code: 500 });

    resetPanelsCache();
    plant({ sidebar: 350, end: 1, code: 500 });
    expect(readPanels()).toEqual({ sidebar: 350, end: PANEL_DEFAULTS.end, code: 500 });
  });

  it('drops a stored width that is not a number to the default', () => {
    for (const data of [
      { sidebar: null, end: null, code: null },
      { sidebar: '350', end: '400', code: '500' },
      {},
    ]) {
      resetPanelsCache();
      plant(data);
      expect(readPanels()).toEqual(PANEL_DEFAULTS);
    }
  });

  it('reads a file written before the code view existed, keeping both widths it does hold', () => {
    plant({ sidebar: 320, end: 420 });
    expect(readPanels()).toEqual({ sidebar: 320, end: 420, code: PANEL_DEFAULTS.code });
  });

  it('drops a code width past its own maximum rather than clamping it to the bound', () => {
    plant({ sidebar: 320, end: 420, code: PANEL_LIMITS.code.max + 100 });
    expect(readPanels().code).toBe(PANEL_DEFAULTS.code);
  });

  it('keeps a code width the designs panel could never hold', () => {
    const wide = PANEL_LIMITS.sidebar.max + 100;
    plant({ sidebar: 320, end: 420, code: wide });
    expect(readPanels().code).toBe(wide);
  });
});

describe('writePanels', () => {
  it('round-trips a save through disk', () => {
    writePanels({ sidebar: 220, end: 480, code: 600 });
    resetPanelsCache();
    expect(readPanels()).toEqual({ sidebar: 220, end: 480, code: 600 });
  });

  it('saving one panel leaves every other stored width where it was', () => {
    writePanels({ sidebar: 220, end: 480, code: 600 });
    writePanels({ sidebar: 300 });
    resetPanelsCache();
    expect(readPanels()).toEqual({ sidebar: 300, end: 480, code: 600 });

    writePanels({ code: 700 });
    resetPanelsCache();
    expect(readPanels()).toEqual({ sidebar: 300, end: 480, code: 700 });
  });
});
