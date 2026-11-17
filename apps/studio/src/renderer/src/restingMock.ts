/** A fabrication for the chat fixture's welcome turn; the design file's values, so a capture stays comparable with the reference. */

import type { WorkspaceCreated } from '@studio/events';

export const RESTING_WORKSPACE: Pick<
  WorkspaceCreated,
  'sourceRepoName' | 'workspaceName' | 'branchName' | 'baseBranch'
> = {
  sourceRepoName: 'react-project-v1',
  workspaceName: 'skylark',
  branchName: 'ldavinci/skylark',
  baseBranch: 'main',
};
