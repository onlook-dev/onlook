import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, utilityProcess } from 'electron';
import { userEnv } from '../env/shell-env.js';
import type { StarterControl } from '../server/index.js';
import { stateRoot } from '../state/root.js';
import { isStudioServerFile, starterModulePath } from './adapter.js';
import { writeStaticServer } from './adapters/static.js';
import { createStarterRunner, STARTER_SERVICE_PREFIX, type StarterRunner } from './runner.js';
import { STARTER_SERVER_FILE } from './scaffold.js';
import { log } from '../log/index.js';
import { capture, resolveWorkspaceTelemetryProperties } from '../telemetry/index.js';
import { recordProjectPreviewDiagnostics } from '../workspace/preview-diagnostics.js';

const logger = log('starter');

export type StarterHost = StarterRunner;

function isStudioServerPresent(worktree: string): boolean {
  let content: string;
  try {
    content = readFileSync(join(worktree, STARTER_SERVER_FILE), 'utf8');
  } catch {
    return false;
  }
  if (isStudioServerFile(content)) return true;
  logger.warn(`${STARTER_SERVER_FILE} in the worktree is not Studio's template; not re-spawning it`);
  return false;
}

let host: StarterHost | undefined;

// After `app` is ready. `utilityProcess.fork`, not `ELECTRON_RUN_AS_NODE`: no dependence on the `runAsNode` fuse.
export function registerStarter(): StarterHost {
  const runner = createStarterRunner({
    fork: (modulePath, options) =>
      utilityProcess.fork(modulePath, [], {
        cwd: options.cwd,
        env: options.env,
        stdio: 'pipe',
        serviceName: options.serviceName,
      }),
    env: userEnv,
    diagnostics: recordProjectPreviewDiagnostics,
    serverExited: (cwd) => capture('dev_server_exited', { ...resolveWorkspaceTelemetryProperties(cwd) }, cwd),
    modulePath: (worktree) => starterModulePath(worktree, () => writeStaticServer(join(stateRoot(), 'starter'))),
  });
  app.on('child-process-gone', (_event, details) => {
    if (!details.name?.startsWith(STARTER_SERVICE_PREFIX)) return;
    logger.warn('starter child gone', { reason: details.reason, exit_code: details.exitCode });
  });
  host = {
    ...runner,
    isPresent: isStudioServerPresent,
  } satisfies StarterControl;
  return host;
}

export function starterHost(): StarterHost | undefined {
  return host;
}

export function disposeStarter(): void {
  host?.dispose();
}
