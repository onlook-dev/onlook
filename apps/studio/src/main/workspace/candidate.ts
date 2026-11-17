import type { HeldOrigin, ProjectImportRefusalReason, WorkspaceOrigin } from '@studio/events';
import { BLANK_DIR_PREFIX, COPIED_DIR_PREFIX, repoIdentityFromRemoteUrl } from './naming.js';

/** Derived, so the classifier and the channel cannot drift: `fields-incomplete` is the recovery's own, refused after this gate passes. */
type CandidateRefusal = Exclude<ProjectImportRefusalReason, 'fields-incomplete'>;

interface CandidateRepository {
  /** `gitDir` and `gitCommonDir` exactly as `rev-parse` answered: at a toplevel both are `.git` in a checkout and differ in a linked worktree. */
  gitDir: string;
  gitCommonDir: string;
  /** Canonicalised, like `CandidateFacts.path`. */
  topLevel: string;
  /** `dirname` of the common directory: the repository the worktree is linked to. */
  sourceRepoRoot: string;
  /** `defaultRemote` answers undefined for a local-only repository and for one with several non-origin remotes; neither is a refusal (ONL-2522). */
  remote: string | undefined;
  remoteUrl: string | undefined;
}

/** The directory the candidate sits in, named only when the candidate is inside `workspaceRoot()` (ONL-2522). */
export interface CandidateBucket {
  name: string;
  /** Swept-prefixed and carrying the creating marker: the boot sweep removes the bucket whole, registry or not (ONL-2522). */
  beingCleanedUp: boolean;
}

export interface CandidateFacts {
  /** Canonical: `--show-toplevel` answers the physical path, and a scanned path carries whatever spelling the workspace root holds (ONL-2522). */
  path: string;
  /** `worktreePointer`, read before any `rev-parse`: it survives the repository (ONL-2522). */
  pointer: string | undefined;
  /** Undefined when `rev-parse` could not answer for the path at all. */
  repository: CandidateRepository | undefined;
  /** `worktree list` in `sourceRepoRoot` names this path: a crafted `.git` gitfile can claim any repository (ONL-2522). */
  linked: boolean;
  bucket: CandidateBucket | undefined;
}

export interface CandidateInput {
  facts: CandidateFacts;
  /** A lookup that answers for a gone directory, such as `registeredProject`; a `workspaces[normalizePath(path)]` read does not (ONL-2315). */
  registered: (path: string) => boolean;
  creating: (path: string) => boolean;
  removing: (path: string) => boolean;
}

export interface WorktreeCandidate {
  path: string;
  origin: WorkspaceOrigin;
  repoIdentity: string;
  sourceRepoRoot: string;
}

export type CandidateDecision =
  | { ok: true; candidate: WorktreeCandidate }
  | { ok: false; reason: CandidateRefusal };

const HELD_BUCKETS: readonly { prefix: string; origin: HeldOrigin }[] = [
  { prefix: BLANK_DIR_PREFIX, origin: 'blank' },
  { prefix: COPIED_DIR_PREFIX, origin: 'copied' },
];

// The classifier reads no file itself: the marker and the pointer arrive as facts, and the Onlook Agent can write either (ONL-2522).
export function classifyCandidate(input: CandidateInput): CandidateDecision {
  const { facts } = input;
  const repository = facts.repository;
  if (repository === undefined) {
    return { ok: false, reason: facts.pointer === undefined ? 'not-a-repository' : 'repository-gone' };
  }
  if (repository.gitDir === repository.gitCommonDir) return { ok: false, reason: 'is-the-repository' };
  if (repository.topLevel !== facts.path) return { ok: false, reason: 'inside-a-project' };
  if (!facts.linked) return { ok: false, reason: 'not-a-repository' };

  if (input.registered(facts.path)) return { ok: false, reason: 'already-a-project' };
  if (input.creating(facts.path) || input.removing(facts.path)) return { ok: false, reason: 'busy' };
  if (facts.bucket?.beingCleanedUp === true) return { ok: false, reason: 'being-cleaned-up' };

  return {
    ok: true,
    candidate: {
      path: facts.path,
      sourceRepoRoot: repository.sourceRepoRoot,
      ...(heldBy(facts.bucket?.name) ?? importedBy(repository)),
    },
  };
}

// `repoIdentityDirName` inverts for these two and not for a remote identity, whose slashes and dots it flattens.
export function heldBy(
  bucketName: string | undefined,
): { origin: HeldOrigin; repoIdentity: string } | undefined {
  if (bucketName === undefined) return undefined;
  for (const { prefix, origin } of HELD_BUCKETS) {
    if (bucketName.startsWith(prefix)) {
      return { origin, repoIdentity: `${origin}/${bucketName.slice(prefix.length)}` };
    }
  }
  return undefined;
}

// `planWorkspace`'s own identity source, so an imported Project re-registers under the identity it already had (ONL-2522).
function importedBy(
  repository: CandidateRepository,
): { origin: 'imported'; repoIdentity: string } {
  const source =
    repository.remoteUrl ??
    (repository.remote === undefined
      ? repository.sourceRepoRoot
      : `${repository.sourceRepoRoot}#${repository.remote}`);
  return { origin: 'imported', repoIdentity: repoIdentityFromRemoteUrl(source) };
}
