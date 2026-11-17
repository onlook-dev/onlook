import type { AgentConnection, AgentConnectionStatus, CodexSetupStatus } from '@studio/events';
import { checkHealth, resolveCodex } from './appserver/resolve.js';

/** `idle` is the common case: the setup machine is in-memory, so every launch after onboarding asks disk. */
export function connectionStatusFromSetup(
  status: CodexSetupStatus,
): AgentConnectionStatus | undefined {
  switch (status) {
    case 'ready':
      return 'ok';
    case 'signed-out':
      return 'unauthenticated';
    case 'failed':
    case 'broken':
    case 'outdated':
    case 'unsupported':
      return 'cli_missing';
    case 'checking':
    case 'downloading':
    case 'validating':
    case 'signing-in':
      return 'unknown';
    case 'idle':
      return undefined;
  }
}

/** A codex missing its `codex-code-mode-host` sibling spawns and handshakes, then answers wrongly. */
export function probeCodexInstall(root: string | undefined): AgentConnection {
  if (root === undefined) {
    return { status: 'cli_missing', detail: 'no codex install could be located', harness: 'codex' };
  }
  const health = checkHealth(resolveCodex(root), root);
  return health.ok
    ? { status: 'ok', harness: 'codex' }
    : { status: 'cli_missing', detail: health.problems.join('; '), harness: 'codex' };
}

export function probeCodexConnection(
  setup: CodexSetupStatus | undefined,
  root: string | undefined,
): AgentConnection {
  const fromSetup = setup === undefined ? undefined : connectionStatusFromSetup(setup);
  if (fromSetup === undefined) return probeCodexInstall(root);
  return { status: fromSetup, harness: 'codex' };
}
