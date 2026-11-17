import { describe, expect, it } from 'bun:test';
import { INSTALL_APPEAR_MS, INSTALL_LIMIT_MS, INSTALL_POLL_MS, installDeveloperTools, type InstallToolsDeps } from './machine-install.js';

interface Script {
  /** Tools become usable this many milliseconds in; never, when absent. */
  readyAt?: number;
  /** Apple's installer is on screen between these two marks. */
  installer?: [number, number];
  /** macOS refuses the request itself. */
  refuses?: boolean;
}

function deps(script: Script): InstallToolsDeps & { requests: () => number; elapsed: () => number } {
  let now = 0;
  let requests = 0;
  return {
    requests: () => requests,
    elapsed: () => now,
    present: async () => script.readyAt !== undefined && now >= script.readyAt,
    installerRunning: async () => script.installer !== undefined && now >= script.installer[0] && now < script.installer[1],
    request: async () => { requests += 1; return script.refuses !== true; },
    wait: async (ms) => { now += ms; },
    now: () => now,
  };
}

describe('tracking Apple developer tools to done or failed', () => {
  it('answers at once when the tools are already there, without asking macOS', async () => {
    const machine = deps({ readyAt: 0 });
    expect(await installDeveloperTools(machine)).toBe('installed');
    expect(machine.requests()).toBe(0);
  });

  it('waits for the tools themselves, not for the request to be accepted', async () => {
    const machine = deps({ readyAt: INSTALL_POLL_MS * 4, installer: [0, INSTALL_POLL_MS * 4] });
    expect(await installDeveloperTools(machine)).toBe('installed');
    expect(machine.requests()).toBe(1);
    expect(machine.elapsed()).toBe(INSTALL_POLL_MS * 4);
  });

  it('reports failure when Apple’s dialog is dismissed, long before the limit', async () => {
    const machine = deps({ installer: [0, INSTALL_POLL_MS * 3] });
    expect(await installDeveloperTools(machine)).toBe('failed');
    expect(machine.elapsed()).toBeLessThan(INSTALL_LIMIT_MS);
  });

  it('lets the tools land in the poll after the installer closes', async () => {
    const machine = deps({ readyAt: INSTALL_POLL_MS * 4, installer: [0, INSTALL_POLL_MS * 3] });
    expect(await installDeveloperTools(machine)).toBe('installed');
    expect(machine.elapsed()).toBe(INSTALL_POLL_MS * 4);
  });

  it('gives the dialog time to appear before its absence means anything', async () => {
    const machine = deps({ readyAt: INSTALL_APPEAR_MS, installer: [INSTALL_APPEAR_MS - INSTALL_POLL_MS, INSTALL_APPEAR_MS] });
    expect(await installDeveloperTools(machine)).toBe('installed');
  });

  it('stops waiting when the dialog never opens at all', async () => {
    const machine = deps({});
    expect(await installDeveloperTools(machine)).toBe('failed');
    expect(machine.elapsed()).toBe(INSTALL_APPEAR_MS);
  });

  it('does not wait for a dialog macOS refused to open', async () => {
    const machine = deps({ refuses: true });
    expect(await installDeveloperTools(machine)).toBe('failed');
    expect(machine.elapsed()).toBe(0);
  });

  it('keeps watching when the refusal is a dialog that is already open', async () => {
    const machine = deps({ refuses: true, readyAt: INSTALL_POLL_MS * 2, installer: [0, INSTALL_POLL_MS * 2] });
    expect(await installDeveloperTools(machine)).toBe('installed');
  });

  it('gives up on an install that runs past the limit', async () => {
    const machine = deps({ installer: [0, Number.MAX_SAFE_INTEGER] });
    expect(await installDeveloperTools(machine)).toBe('failed');
    expect(machine.elapsed()).toBeGreaterThanOrEqual(INSTALL_LIMIT_MS);
  });
});
