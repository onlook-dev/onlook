import { describe, expect, it } from 'bun:test';
import { isElectronsOwnNoise } from './consoleNoise.js';

describe('whose error the console line is', () => {
  it("drops Electron's own preload complaint, which is not the page's error (ONL-2297)", () => {
    expect(isElectronsOwnNoise('node:electron/js2c/sandbox_bundle')).toBe(true);
    expect(isElectronsOwnNoise('electron/js2c/renderer_init')).toBe(true);
  });

  it("keeps the page's own errors, wherever the page serves them from", () => {
    expect(isElectronsOwnNoise('http://localhost:5297/src/Hero.jsx')).toBe(false);
    expect(isElectronsOwnNoise('')).toBe(false);
  });
});
