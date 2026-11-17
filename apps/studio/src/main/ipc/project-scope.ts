import type { CanvasDocId, ProjectClaim } from '@studio/events';
import { canonicalPath } from '../lib/canonical-path.js';
import { knownCanvasDocId } from '../canvas/registry.js';
import type { ProjectKey } from '../project/key.js';
import { views } from '../tabs/views.js';

/** The Project a view is showing, resolved once per request before its handler runs. */
export interface SenderProject {
  readonly key: ProjectKey;
  /** The worktree, as a path to read and write under. */
  readonly root: string;
  /** Absent until the Project's Canvas has been opened once. */
  readonly canvasDocument: CanvasDocId | undefined;
}

export function senderProject(senderId: number): SenderProject | undefined {
  const root = views.projectOf(senderId);
  return root === undefined ? undefined : { key: root, root, canvasDocument: knownCanvasDocId(root) };
}

/** Whether the Project or Canvas document a request names is the sender's own. */
export function claimsOwnProject(project: SenderProject, claim: ProjectClaim, request: unknown): boolean {
  const named = typeof request === 'object' && request !== null ? (request as Record<string, unknown>)[claim] : undefined;
  if (typeof named !== 'string') return false;
  if (claim === 'docId') return named === project.canvasDocument;
  return !named.includes('\0') && canonicalPath(named) === project.root;
}
