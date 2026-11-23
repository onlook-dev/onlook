import { execFileSync } from 'node:child_process';
import type { AgentConnection } from '@studio/events';
import { log } from '../../log/index.js';
import { devSwitches } from '../../env/dev-switches.js';
import type { AgentBackend } from '../backend.js';
import { StdioRpc } from './rpc.js';
import { AcpSession, type AcpSessionOptions } from './session.js';

const logger = log('agent-host');

/** A real path, not `execSync('opencode --version')`: probing must not start a TUI. */
function which(binary: string): string | undefined {
  try {
    const found = execFileSync('which', [binary], { encoding: 'utf8' }).trim();
    return found === '' ? undefined : found;
  } catch {
    return undefined;
  }
}

export function opencodeBin(): string | undefined {
  return devSwitches.opencodeBin ?? which('opencode');
}

/**
 * The handshake is the health check: an `opencode` that starts but cannot `initialize` is as useless
 * as a missing one, and only this tells them apart.
 */
export async function probeAcpConnection(timeoutMs = 20_000): Promise<AgentConnection> {
  const bin = opencodeBin();
  if (bin === undefined) return { status: 'cli_missing', harness: 'opencode' };

  const peer = new StdioRpc(bin, ['acp'], { deadlineMs: timeoutMs });
  try {
    const result = (await peer.request('initialize', { protocolVersion: 1, clientCapabilities: {} })) as {
      agentInfo?: { version?: string };
    };
    logger.info('opencode acp reachable', { version: result.agentInfo?.version });
    return { status: 'ok', harness: 'opencode' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('opencode acp unavailable', { error: message });
    return {
      status: message.includes('could not start') ? 'cli_missing' : 'error',
      harness: 'opencode',
      detail: message,
    };
  } finally {
    peer.close();
  }
}

export function createAcpSession(options: Omit<AcpSessionOptions, 'bin'>): AgentBackend {
  const bin = opencodeBin();
  return new AcpSession({ ...options, bin: bin ?? 'opencode' });
}
