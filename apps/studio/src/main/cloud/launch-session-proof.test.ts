import { afterAll, expect, test } from 'bun:test';
import electron from 'electron';

const app = electron.app as { isPackaged: boolean };
const { launchSessionProofProvider } = await import('./launch-session-proof.js');
const keys = ['STUDIO_LAUNCH_SESSION_PROOF', 'STUDIO_LAUNCH_SESSION_PROOF_OUTCOME', 'STUDIO_LAUNCH_SESSION_PROOF_READY'] as const;
const saved = keys.map((key) => process.env[key]);
afterAll(() => {
  Reflect.deleteProperty(app, 'isPackaged');
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
});

test('launch-session proof is inert unless explicitly requested, and never available when packaged', () => {
  delete process.env['STUDIO_LAUNCH_SESSION_PROOF'];
  expect(launchSessionProofProvider()).toBeUndefined();
  process.env['STUDIO_LAUNCH_SESSION_PROOF'] = '1';
  app.isPackaged = true;
  expect(launchSessionProofProvider()).toBeUndefined();
  app.isPackaged = false;
});

test('the proof provider reports outcomes without deleting its session itself', async () => {
  process.env['STUDIO_LAUNCH_SESSION_PROOF'] = '1';
  process.env['STUDIO_LAUNCH_SESSION_PROOF_READY'] = '1';
  for (const outcome of ['ended', 'unavailable'] as const) {
    process.env['STUDIO_LAUNCH_SESSION_PROOF_OUTCOME'] = outcome;
    const provider = launchSessionProofProvider()!;
    const result = await provider.identity.checkLaunchSession!(new AbortController().signal);
    expect(result.status).toBe(outcome);
    expect(provider.identity.hasSession()).toBe(true);
    provider.identity.clearSession();
    expect(provider.identity.hasSession()).toBe(false);
  }
});
