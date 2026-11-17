import type { ProjectSetupSnapshot } from '@studio/events';

export function setupSnapshot(state: ProjectSetupSnapshot['state'] = 'idle'): ProjectSetupSnapshot {
  return {
    saved: { revision: 'saved-1', definition: {
      prepare: 'corepack enable',
      install: { script: 'pnpm install --frozen-lockfile', inputs: ['pnpm-lock.yaml'], outputs: ['node_modules'] },
      servers: [{ id: 'web', cwd: 'apps/web', start: 'pnpm dev --port 3000', port: 3000 }],
    } },
    verified: null,
    state,
    failure: state === 'failed' ? {
      revision: 'saved-1', stage: 'install', command: 'pnpm install --frozen-lockfile',
      exitCode: 1, reason: 'Lockfile changed', elapsedMs: 1200, outputTail: 'ERR_PNPM_OUTDATED_LOCKFILE',
    } : null,
  };
}

/** A peer server is what separates "before the failure" from "not reached" in the step sequence (ONL-2499). */
export function twoServerSetup(state: ProjectSetupSnapshot['state'] = 'idle'): ProjectSetupSnapshot {
  const snapshot = setupSnapshot(state);
  snapshot.saved!.definition.servers = [
    { id: 'web', cwd: 'apps/web', start: 'bun dev', port: 3000 },
    { id: 'api', cwd: 'apps/api', start: 'bun start', port: 3001 },
  ];
  return snapshot;
}
