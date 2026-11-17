// Default import: outside Electron the package is CJS exporting a binary path, and `{ app }` fails Bun's ESM link.
import electron from 'electron';
import { resolve } from 'node:path';
import { readEnvSwitch, STATE_ROOT_SWITCH } from '../env/switch.js';

export function stateRoot(): string {
  const override = readEnvSwitch(STATE_ROOT_SWITCH);
  if (override) return resolve(override);
  // One `userData` for `bun dev`, e2e and the packaged app: a suite without the override writes the developer's real state.
  return electron.app.getPath('userData');
}

/** False means a write lands in the user's own profile, which a forced first run must leave alone (ONL-2443). */
export function stateRootOverridden(): boolean {
  const override = readEnvSwitch(STATE_ROOT_SWITCH);
  return override !== undefined && override !== '';
}
