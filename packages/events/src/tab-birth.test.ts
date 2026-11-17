import { describe, expect, it } from 'bun:test';
import { NO_CAPABILITIES } from './capabilities.js';
import { PANEL_DEFAULTS, PANEL_LIMITS } from './panels.js';
import { birthSearch, parseBirth } from './tab-birth.js';

const PANELS = { sidebar: 280, end: 360, code: 520 };

describe('birth facts on the load (ONL-2318)', () => {
  it('serializes the same record both branches load', () => {
    const facts = { tabId: 'tab-7', purpose: 'parked', panels: PANELS, requiresSession: true, capabilities: { ...NO_CAPABILITIES, account: true, report: true } } as const;
    expect(parseBirth(birthSearch(facts))).toEqual(facts);
  });

  it('round-trips through a leading question mark, the way a renderer reads it', () => {
    const facts = { tabId: 'tab-3', purpose: 'projects', panels: PANELS, requiresSession: false, capabilities: NO_CAPABILITIES } as const;
    expect(parseBirth(`?${birthSearch(facts)}`)).toEqual(facts);
  });
});

describe('parsing a birth that is missing or wrong', () => {
  it('reads a birth with no capabilities as a provider that has none', () => {
    expect(parseBirth('?tab=tab-1&login=true').capabilities).toEqual(NO_CAPABILITIES);
    expect(parseBirth('?caps=github,bogus').capabilities).toEqual({ ...NO_CAPABILITIES, github: true });
  });

  it('falls back to the panel defaults rather than NaN', () => {
    expect(parseBirth('?tab=tab-1&purpose=parked').panels).toEqual(PANEL_DEFAULTS);
  });

  it('drops a width outside the limits instead of clamping it', () => {
    const over = String(PANEL_LIMITS.sidebar.max + 50);
    expect(parseBirth(`?sidebar=${over}`).panels.sidebar).toBe(PANEL_DEFAULTS.sidebar);
  });

  it('carries a code width the designs panel could never hold', () => {
    const wide = PANEL_LIMITS.sidebar.max + 100;
    expect(parseBirth(`?code=${String(wide)}`).panels.code).toBe(wide);
  });

  it('treats an unknown purpose as projects, never parked', () => {
    expect(parseBirth('?tab=tab-1&purpose=editor').purpose).toBe('projects');
  });

  it('answers an empty search with no tab id and the defaults, for the showroom and the lab', () => {
    expect(parseBirth('')).toEqual({ tabId: '', purpose: 'projects', panels: PANEL_DEFAULTS, requiresSession: false, capabilities: NO_CAPABILITIES });
  });

  it('requires a session only on the word itself, so no other spelling raises the gate', () => {
    expect(parseBirth('?login=true').requiresSession).toBe(true);
    for (const search of ['?login=false', '?login=1', '?login=TRUE', '?login=', '?tab=tab-1']) {
      expect(parseBirth(search).requiresSession).toBe(false);
    }
  });
});
