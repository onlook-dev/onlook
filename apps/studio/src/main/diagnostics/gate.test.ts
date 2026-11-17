import { describe, expect, it } from 'bun:test';
import { DIAGNOSTICS_ARG } from '@studio/events';
import { agentStreamSwitch, cloudBuildOverride, gateArguments, gatePort, machineInstallRequestSkipped, proofSwitchEnabled, tabsOnScreenPin } from './gate.js';

it('only an unpackaged build can be asked to skip the developer-tools install request', () => {
  expect(machineInstallRequestSkipped({ packaged: false, env: { STUDIO_MACHINE_INSTALL_REQUEST: 'skip' } })).toBe(true);
  expect(machineInstallRequestSkipped({ packaged: false, env: { STUDIO_MACHINE_INSTALL_REQUEST: '1' } })).toBe(false);
  expect(machineInstallRequestSkipped({ packaged: false, env: {} })).toBe(false);
  expect(machineInstallRequestSkipped({ packaged: true, env: { STUDIO_MACHINE_INSTALL_REQUEST: 'skip' } })).toBe(false);
});

it('only unpackaged builds accept an explicit cloud build ordinal', () => {
  expect(cloudBuildOverride({ packaged: false, env: {} })).toBeUndefined();
  expect(cloudBuildOverride({ packaged: false, env: { STUDIO_CLOUD_TEST_BUILD: '0' } })).toBe(0);
  expect(cloudBuildOverride({ packaged: false, env: { STUDIO_CLOUD_TEST_BUILD: '100' } })).toBe(100);
  for (const value of ['-1', '1.5', 'NaN', '', '9007199254740992']) {
    expect(() => cloudBuildOverride({ packaged: false, env: { STUDIO_CLOUD_TEST_BUILD: value } })).toThrow();
    expect(cloudBuildOverride({ packaged: true, env: { STUDIO_CLOUD_TEST_BUILD: value } })).toBeUndefined();
  }
});

it('the update recording seam cannot open in a packaged build', () => {
  expect(proofSwitchEnabled('STUDIO_UPDATE_PROOF', { packaged: false, env: { STUDIO_UPDATE_PROOF: '1' } })).toBe(true);
  expect(proofSwitchEnabled('STUDIO_UPDATE_PROOF', { packaged: true, env: { STUDIO_UPDATE_PROOF: '1' } })).toBe(false);
});

it('the notification recording seam is closed in packaged builds', () => {
  expect(proofSwitchEnabled('STUDIO_NOTIFICATION_PROOF', { packaged: false, env: { STUDIO_NOTIFICATION_PROOF: '1' } })).toBe(true);
  expect(proofSwitchEnabled('STUDIO_NOTIFICATION_PROOF', { packaged: true, env: { STUDIO_NOTIFICATION_PROOF: '1' } })).toBe(false);
  expect(proofSwitchEnabled('STUDIO_NOTIFICATION_PROOF', { packaged: false, env: {} })).toBe(false);
});

describe('gatePort', () => {
  it('the local report provider stays unavailable in packaged builds', () => {
    expect(proofSwitchEnabled('STUDIO_REPORT_PROOF', { packaged: false, env: { STUDIO_REPORT_PROOF: '1' } })).toBe(true);
    expect(proofSwitchEnabled('STUDIO_REPORT_PROOF', { packaged: true, env: { STUDIO_REPORT_PROOF: '1' } })).toBe(false);
    expect(proofSwitchEnabled('STUDIO_REPORT_PROOF', { packaged: false, env: {} })).toBe(false);
  });
  it('names the port on an unpackaged build', () => {
    expect(gatePort({ packaged: false, env: { AGENT_CDP_PORT: '9335' } })).toBe('9335');
  });

  it('stays shut on a packaged build however the port is set', () => {
    expect(gatePort({ packaged: true, env: { AGENT_CDP_PORT: '9335' } })).toBeUndefined();
  });

  it('stays shut without the port', () => {
    expect(gatePort({ packaged: false, env: {} })).toBeUndefined();
  });

  it('treats an empty port as unset, so no switch is appended with no value', () => {
    expect(gatePort({ packaged: false, env: { AGENT_CDP_PORT: '' } })).toBeUndefined();
  });
});

describe('gateArguments', () => {
  it('carries the flag to the renderer when the gate is open', () => {
    expect(gateArguments({ packaged: false, env: { AGENT_CDP_PORT: '9335' } })).toEqual([DIAGNOSTICS_ARG]);
  });

  it('carries nothing when the gate is shut', () => {
    expect(gateArguments({ packaged: true, env: { AGENT_CDP_PORT: '9335' } })).toEqual([]);
    expect(gateArguments({ packaged: false, env: {} })).toEqual([]);
  });
});

describe('agentStreamSwitch', () => {
  it('replays or records a session only on an unpackaged build', () => {
    expect(agentStreamSwitch({ packaged: false, env: { STUDIO_AGENT_REPLAY: '/r.jsonl' } })).toEqual({ replay: '/r.jsonl' });
    expect(agentStreamSwitch({ packaged: false, env: { STUDIO_AGENT_RECORD: '/r.jsonl' } })).toEqual({ record: '/r.jsonl' });
    expect(agentStreamSwitch({ packaged: true, env: { STUDIO_AGENT_REPLAY: '/r.jsonl', STUDIO_AGENT_RECORD: '/r.jsonl' } })).toBeUndefined();
  });
});

it('pins every tab on screen only through an open gate on an unpackaged build, and only when asked (ONL-2960)', () => {
  const asked = { AGENT_CDP_PORT: '9333', STUDIO_TABS_ON_SCREEN: '1' };
  expect(tabsOnScreenPin({ packaged: false, env: asked })).toBe(true);
  expect(tabsOnScreenPin({ packaged: true, env: asked })).toBe(false);
  expect(tabsOnScreenPin({ packaged: false, env: { STUDIO_TABS_ON_SCREEN: '1' } })).toBe(false);
  expect(tabsOnScreenPin({ packaged: false, env: { AGENT_CDP_PORT: '9333' } })).toBe(false);
});
