import { afterEach, expect, test } from 'bun:test';
import { devSwitches, PROOF_SWITCHES, readProofSwitch, readSwitch, rendererDevServerUrl, SWITCH_NAMES, type DevSwitch } from './dev-switches.js';

const touched = ['STUDIO_FLAGS', 'STUDIO_SETUP_PROOF'];
const saved = touched.map((name) => [name, process.env[name]] as const);

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('the variables the harnesses and recording tooling set keep their names', () => {
  expect(SWITCH_NAMES).toMatchObject({
    agentHeadless: 'AGENT_HEADLESS',
    diagnosticsPort: 'AGENT_CDP_PORT',
    stateRoot: 'STUDIO_STATE_ROOT',
    errorHook: 'STUDIO_ERROR_HOOK',
    flags: 'STUDIO_FLAGS',
    showroom: 'STUDIO_SHOWROOM',
    noPty: 'STUDIO_NO_PTY',
    cloudTestBuild: 'STUDIO_CLOUD_TEST_BUILD',
  });
  const variables = [...Object.values(SWITCH_NAMES), ...PROOF_SWITCHES];
  expect(new Set(variables).size).toBe(variables.length);
  expect(variables.every((name) => /^(STUDIO_[A-Z0-9_]+|AGENT_HEADLESS|AGENT_CDP_PORT)$/.test(name))).toBe(true);
  expect(Object.keys(SWITCH_NAMES)).toHaveLength(43);
  expect(PROOF_SWITCHES).toHaveLength(10);
});

test('a switch is read when it is asked for, not when the module loads', () => {
  delete process.env['STUDIO_FLAGS'];
  expect(devSwitches.flags).toBeUndefined();
  process.env['STUDIO_FLAGS'] = 'connectors';
  expect(devSwitches.flags).toBe('connectors');
  process.env['STUDIO_FLAGS'] = '-connectors';
  expect(devSwitches.flags).toBe('-connectors');
  expect(readSwitch('flags')).toBe('-connectors');
});

test('every name answers from the environment under its own variable', () => {
  for (const name of Object.keys(SWITCH_NAMES) as DevSwitch[]) {
    expect(readSwitch(name, { [SWITCH_NAMES[name]]: name })).toBe(name);
    expect(readSwitch(name, {})).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(devSwitches, name)?.get).toBeDefined();
  }
});

test('a given environment is read instead of the app own', () => {
  process.env['STUDIO_FLAGS'] = 'app';
  expect(readSwitch('flags', { STUDIO_FLAGS: 'given' })).toBe('given');
  expect(readSwitch('flags', {})).toBeUndefined();
  process.env['STUDIO_SETUP_PROOF'] = '1';
  expect(readProofSwitch('STUDIO_SETUP_PROOF')).toBe('1');
  expect(readProofSwitch('STUDIO_SETUP_PROOF', {})).toBeUndefined();
});

test("the renderer's dev server is read as it is set, an empty value included", () => {
  expect(rendererDevServerUrl({ ELECTRON_RENDERER_URL: 'http://localhost:5173' })).toBe('http://localhost:5173');
  expect(rendererDevServerUrl({ ELECTRON_RENDERER_URL: '' })).toBe('');
  expect(rendererDevServerUrl({})).toBeUndefined();
});
