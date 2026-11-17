import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stateRoot } from '../state/root.js';

export function installLogPath(): string {
  return join(stateRoot(), 'logs', 'install.log');
}

export function appendInstallLog(line: string): void {
  try {
    const path = installLogPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    // An unwritable log would otherwise break connect.
  }
}
