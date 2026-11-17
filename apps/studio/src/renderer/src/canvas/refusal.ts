import type { WorkspaceRefusalReason } from '@studio/events';

export interface Refusal {
  reason: WorkspaceRefusalReason;
  /** Diagnostic, never the headline. */
  detail?: string;
  /** The existing project, named in `already-copied`'s headline. */
  projectName?: string;
  /** The picked folder, named in `nothing-to-copy`'s body. */
  folderName?: string;
}

export function refusalFrom(
  refused: {
    reason: WorkspaceRefusalReason;
    detail?: string;
    projectName?: string;
  },
  sourcePath?: string,
): Refusal {
  const folderName = sourcePath?.split('/').filter(Boolean).at(-1);
  return {
    reason: refused.reason,
    ...(refused.detail === undefined ? {} : { detail: refused.detail }),
    ...(refused.projectName === undefined ? {} : { projectName: refused.projectName }),
    ...(folderName === undefined ? {} : { folderName }),
  };
}
