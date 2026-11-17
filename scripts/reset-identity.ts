import { rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

// Mirrors `stateRoot()` in `apps/studio/src/main/state/root.ts` and the userData pin at `apps/studio/src/main/index.ts`.
function stateRoot(): string {
  const override = process.env['STUDIO_STATE_ROOT'];
  if (override) return resolve(override);
  // Not derived from `productName`: the app pins userData to the pre-rename directory (ONL-2132), so deriving would clear nothing.
  const stateDirName = 'Onlook Studio';
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', stateDirName);
  }
  if (process.platform === 'win32') {
    return join(process.env['APPDATA'] ?? join(homedir(), 'AppData', 'Roaming'), stateDirName);
  }
  return join(process.env['XDG_CONFIG_HOME'] ?? join(homedir(), '.config'), stateDirName);
}

const root = stateRoot();
// Both or neither: a record alone strands a token pair for a later sign-in to trip over. Every name either build
// can write, because this script cannot tell which one asked (ONL-2882).
const targets = [
  'account.json',
  'account-development.json',
  'identity.json',
  'identity-development.json',
  'workos-tokens.bin',
  'workos-session.bin',
  'workos-development-session.bin',
  'workos-session.json',
];

let removed = 0;
for (const name of targets) {
  const path = join(root, name);
  if (!existsSync(path)) continue;
  rmSync(path);
  removed += 1;
  console.log(`removed ${path}`);
}

if (removed === 0) {
  console.log(`nothing to remove under ${root} — the gate will already ask at next launch`);
} else {
  console.log('identity forgotten — the login gate asks again at next launch');
}
