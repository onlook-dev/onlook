import { describe, expect, it } from 'bun:test';
import type { SettingsDefaults } from '@studio/events';
import { NO_DEFAULTS, effortLevelsFor, offersTipsReset, selectedDefaults } from './derive.js';
import { MODEL_CATALOGS } from './fixtures.js';

const DEFAULTS: SettingsDefaults = {
  claude: { model: 'opus', effort: 'high', models: [...MODEL_CATALOGS.claude] },
  codex: { model: 'gpt-5.5', models: [...MODEL_CATALOGS.codex] },
  opencode: { models: [] },
  freebuff: { models: [] },
};

describe('selectedDefaults', () => {
  it('the selected agent decides the catalog, the value, and the levels', () => {
    const claude = selectedDefaults(DEFAULTS, 'claude');
    expect(claude.model).toBe('opus');
    expect(claude.options.map((option) => option.value)).toEqual(['opus', 'sonnet', 'claude-haiku-4-5']);
    expect(claude.effort).toBe('high');
    expect(claude.levels).toEqual(['low', 'medium', 'high', 'max']);

    const codex = selectedDefaults(DEFAULTS, 'codex');
    expect(codex.model).toBe('gpt-5.5');
    expect(codex.options.map((option) => option.value)).toEqual(['gpt-5.6', 'gpt-5.5']);
    expect(codex.levels).toEqual(['low', 'medium', 'high', 'xhigh']);
  });

  it('an unset default is the row Default, and its levels follow the catalog first row', () => {
    const codex = selectedDefaults({ ...DEFAULTS, codex: { models: [...MODEL_CATALOGS.codex] } }, 'codex');
    expect(codex.model).toBeNull();
    expect(codex.effort).toBeNull();
    expect(codex.levels).toEqual(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
  });

  it('an empty catalog offers no model and no levels — the rows disable themselves', () => {
    const claude = selectedDefaults(NO_DEFAULTS, 'claude');
    expect(claude.options).toEqual([]);
    expect(claude.levels).toEqual([]);
    expect(claude.model).toBeNull();
  });

  it('a stored model the catalog no longer lists keeps its value and offers no levels', () => {
    const claude = selectedDefaults({ ...DEFAULTS, claude: { model: 'opus-3', models: [...MODEL_CATALOGS.claude] } }, 'claude');
    expect(claude.model).toBe('opus-3');
    expect(claude.levels).toEqual([]);
  });
});

describe('effortLevelsFor', () => {
  it('matches an alias through its resolved id', () => {
    expect(effortLevelsFor(MODEL_CATALOGS.claude, 'claude-sonnet-4-5')).toEqual(['low', 'medium', 'high']);
  });

  it('a model that declared none offers none, never all five', () => {
    expect(effortLevelsFor(MODEL_CATALOGS.claude, 'claude-haiku-4-5')).toEqual([]);
  });
});

describe('offersTipsReset', () => {
  const off = { promptTip: false, inviteTip: false, blankFirstMoment: false };

  it('offers no reset with every tip flag off, as main has no Tips row', () => {
    expect(offersTipsReset(off)).toBe(false);
  });

  it('offers it once any one of the tip flags is on', () => {
    expect(offersTipsReset({ ...off, promptTip: true })).toBe(true);
    expect(offersTipsReset({ ...off, inviteTip: true })).toBe(true);
    expect(offersTipsReset({ ...off, blankFirstMoment: true })).toBe(true);
  });
});
