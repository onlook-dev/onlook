import { MAX_PROJECT_TABS, mintTabLink, type WorkspacePlan } from '@studio/events';
import { requestBackgroundTab } from '../tabs/signals.js';
import { planWorkspace } from './index.js';
import { knownProject, newProjectSource } from './store.js';
import type { CreateProjectTabOutcome } from '../agent-host/studio-tools.js';

const REFUSALS: Record<string, string> = {
  'no-base-ref': 'the repository has no commit to branch from yet',
  'name-unavailable': 'a workspace name could not be drawn',
  'nothing-to-copy': 'the folder has no files to copy',
};

/** The source path comes from the registry, never the model, so the agent cannot reach another repo (ONL-2212). */
export async function createProjectTabByAgent(
  cwd: string,
  plan: (sourcePath: string) => Promise<WorkspacePlan> = planWorkspace,
): Promise<CreateProjectTabOutcome> {
  const workspace = knownProject(cwd);
  if (workspace === undefined) {
    return { ok: false, reason: 'this session is not on a workspace Onlook registered' };
  }
  const planned = await plan(newProjectSource(workspace));
  if (planned.kind === 'refused') {
    return { ok: false, reason: REFUSALS[planned.reason] ?? planned.reason };
  }
  const landing = requestBackgroundTab(planned.sourcePath);
  if (landing === undefined) {
    return { ok: false, reason: 'there is no window to open a tab in' };
  }
  if (landing === 'at-limit') {
    return { ok: false, reason: `${String(MAX_PROJECT_TABS)} projects are already open; ask the user to close one first` };
  }
  // The landing, not `planned.workspaceName`: the cut re-draws the name (ONL-2212).
  const landed = await landing;
  if (landed === null) {
    return { ok: false, reason: 'the copy did not finish; the tab shows what stopped it' };
  }
  return {
    ok: true,
    workspaceName: landed.workspaceName,
    link: mintTabLink({ repoIdentity: landed.repoIdentity, workspaceName: landed.workspaceName }),
  };
}
