import { afterEach, describe, expect, it } from 'bun:test';
import electron from 'electron';
import { installLandingProofHook } from '../agent-host/landing-proof.js';
import { installFrameHealthProofHook } from '../server/frame-health-proof.js';
import { installCoolingProof } from '../tabs/cooling-proof.js';
import { installSpareProof } from '../tabs/spare-proof.js';
import { installSetupProofHook } from '../workspace/setup-proof.js';
import { installUpdateProof } from '../updater/proof.js';
import { UpdateMachine } from '../updater/machine.js';
import { registerClaudeHost } from '../claude/index.js';

const SWITCHES = ['STUDIO_LANDING_PROOF', 'STUDIO_SETUP_PROOF', 'STUDIO_COOLING_PROOF', 'STUDIO_FRAME_HEALTH_PROOF', 'STUDIO_UPDATE_PROOF', 'STUDIO_CLAUDE_PROOF'] as const;
const savedSwitches = SWITCHES.map((name) => [name, process.env[name]] as const);

function launch({ packaged }: { packaged: boolean }): void {
  (electron.app as { isPackaged: boolean }).isPackaged = packaged;
  for (const name of SWITCHES) process.env[name] = '1';
}

function installEveryProofHook(): { coolingSeams: object } {
  installLandingProofHook();
  installSetupProofHook();
  installSpareProof(() => 'held');
  installFrameHealthProofHook(() => undefined);
  installUpdateProof(new UpdateMachine({ emit: () => {} }));
  registerClaudeHost({ browsers: () => [] });
  return { coolingSeams: installCoolingProof(1_000) };
}

function installedHooks(): string[] {
  return Object.keys(globalThis)
    .filter((key) => /^__studio\w*Proof$/.test(key))
    .sort();
}

afterEach(() => {
  for (const key of installedHooks()) Reflect.deleteProperty(globalThis, key);
  Reflect.deleteProperty(electron.app, 'isPackaged');
  for (const [name, value] of savedSwitches) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe('proof hooks', () => {
  it('a packaged build installs none, whatever the environment', () => {
    launch({ packaged: true });
    const { coolingSeams } = installEveryProofHook();
    expect(installedHooks()).toEqual([]);
    expect(coolingSeams).toEqual({});
  });

  it('an unpackaged build installs each one its switch names', () => {
    launch({ packaged: false });
    const { coolingSeams } = installEveryProofHook();
    expect(installedHooks()).toEqual([
      '__studioClaudeProof',
      '__studioCoolingProof',
      '__studioFrameHealthProof',
      '__studioLandingProof',
      '__studioSetupProof',
      '__studioTabsProof',
      '__studioUpdateProof',
    ]);
    expect(Object.keys(coolingSeams)).not.toEqual([]);
  });
});
