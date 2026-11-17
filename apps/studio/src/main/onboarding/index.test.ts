import { afterEach, expect, test } from 'bun:test';
import electron from 'electron';
import type { MachineSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { creationDiagnosis, creationMachineDetail } from '../workspace/machine.js';
import { registerOnboardingHandlers } from './index.js';

function registeredChannels(): string[] {
  const channels: string[] = [];
  const target = electron.ipcMain as unknown as { handle: unknown };
  const real = target.handle;
  target.handle = (channel: string): undefined => {
    channels.push(channel);
    return undefined;
  };
  try {
    registerOnboardingHandlers();
  } finally {
    target.handle = real;
  }
  return channels;
}

const inherited = process.env['STUDIO_FLAGS'];
afterEach(() => {
  if (inherited === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = inherited;
});

test('the machine channels are absent until machine-check is on (ONL-3111)', () => {
  const off = registeredChannels();
  expect(off).toEqual(['onboarding:state', 'onboarding:complete']);

  process.env['STUDIO_FLAGS'] = 'machine-check';
  expect(registeredChannels()).toEqual([
    'machine:check', 'machine:installTools', 'machine:openHelp', 'machine:chooseFolder',
    ...off,
  ]);
});

test('a creation failure starts no check with machine-check off (ONL-3111)', async () => {
  let checks = 0;
  const failing = async (): Promise<MachineSnapshot> => {
    checks += 1;
    return { checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }], platform: 'mac', canChooseFolder: false };
  };

  expect(await creationMachineDetail(failing)).toBeUndefined();
  expect(checks).toBe(0);

  process.env['STUDIO_FLAGS'] = 'machine-check';
  expect(await creationMachineDetail(failing)).toBe(t('machine.failure.developer_tools_missing'));
  expect(checks).toBe(1);
});

test('a failed create is handed no diagnosis to run with machine-check off (ONL-3111)', () => {
  expect(creationDiagnosis()).toEqual({});

  process.env['STUDIO_FLAGS'] = 'machine-check';
  expect(typeof creationDiagnosis().diagnoseFailure).toBe('function');
});
