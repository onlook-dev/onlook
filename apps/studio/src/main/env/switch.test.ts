import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SWITCH_NAMES } from './dev-switches.js';
import { readEnvSwitch, STATE_ROOT_SWITCH } from './switch.js';

const saved = process.env[STATE_ROOT_SWITCH];

afterEach(() => {
  if (saved === undefined) delete process.env[STATE_ROOT_SWITCH];
  else process.env[STATE_ROOT_SWITCH] = saved;
});

test('a switch is read when it is asked for', () => {
  delete process.env[STATE_ROOT_SWITCH];
  expect(readEnvSwitch(STATE_ROOT_SWITCH)).toBeUndefined();
  process.env[STATE_ROOT_SWITCH] = '/tmp/state';
  expect(readEnvSwitch(STATE_ROOT_SWITCH)).toBe('/tmp/state');
  expect(readEnvSwitch(STATE_ROOT_SWITCH, {})).toBeUndefined();
});

test('the table of switches names the state folder override the same way', () => {
  expect(SWITCH_NAMES.stateRoot).toBe(STATE_ROOT_SWITCH);
});

test('what a provider bundles for the state folder does not reach the table of every switch', () => {
  const here = import.meta.dirname;
  for (const file of [join(here, 'switch.ts'), join(here, '..', 'state', 'root.ts')]) {
    expect(readFileSync(file, 'utf8')).not.toContain('dev-switches');
  }
});
