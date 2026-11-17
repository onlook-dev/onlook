import { canvasCensus } from '../canvas/census.js';
import { capture, workspaceTelemetryProperties } from '../telemetry/index.js';
import { knownProject, workspaceOrigin } from '../workspace/store.js';
import { projectKey } from '../project/key.js';
import { projectSet } from '../project/state.js';

// A set, not the last path: two tabs interleaving over-counted opens (ONL-2249). Let go of when the Project's last Tab closes.
const captured = projectSet('agent.project-opened', { closes: true });

export function recordProjectOpened(workspacePath: string): void {
  const key = projectKey(workspacePath);
  if (captured.has(key)) return;
  // `startSession` refuses an unknown path; its open never happens.
  const workspace = knownProject(workspacePath);
  if (workspace === undefined) return;
  captured.add(key);
  const source = workspaceOrigin(workspace);
  capture('project_opened', {
    ...workspaceTelemetryProperties(workspace.repoIdentity),
    // A blank project's URL is the starter's (ONL-2152); an imported one has none stored.
    dev_server_source: source === 'blank' ? 'remembered' : 'entered',
    source,
    ...canvasCensus(workspacePath),
  });
}

export function forgetProjectOpened(workspacePath: string): void {
  captured.delete(projectKey(workspacePath));
}

export function resetProjectOpenedForTesting(): void {
  captured.clear();
}
