import { execFileSync } from 'node:child_process';
import type { AgentConnection } from '@studio/events';
import { devSwitches } from '../../env/dev-switches.js';
import type { AgentBackend } from '../backend.js';
import { FreebuffSession, type FreebuffSessionOptions } from './session.js';

function which(binary: string): string | undefined {
  try {
    const found = execFileSync('which', [binary], { encoding: 'utf8' }).trim();
    return found === '' ? undefined : found;
  } catch {
    return undefined;
  }
}

export function freebuffBin(): string | undefined {
  return devSwitches.freebuffBin ?? which('freebuff');
}

/** No handshake exists to prove a TUI works without drawing it, so this is presence alone. */
export function probeFreebuffConnection(): AgentConnection {
  return freebuffBin() === undefined
    ? { status: 'cli_missing', harness: 'freebuff' }
    : { status: 'ok', harness: 'freebuff' };
}

export function createFreebuffSession(options: Omit<FreebuffSessionOptions, 'bin'>): AgentBackend {
  const bin = freebuffBin();
  return new FreebuffSession({ ...options, bin: bin ?? 'freebuff' });
}
