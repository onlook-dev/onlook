/**
 * The one module a separately built provider may import from Studio main. Re-exports only; see
 * the README beside it. Anything added here widens what a provider build pulls in, and
 * `provider-api.test.ts` pins both the names and the files.
 */

/** Raised on a change a provider has to follow: a name removed or renamed, or a signature it calls changed. */
export const PROVIDER_API_VERSION = 1;

// The contract a provider implements: the client main owns, the options main passes, the identity lifecycle.
export type { CloudIdentity, OnlookClient, OnlookClientOptions } from './client.js';

// What a provider's optional `capabilities` export may name; without the export, main derives the answers from the build.
export type { ProviderCapabilities } from './client.js';

// Holds the provider's `OnlookState` and tells subscribers when it changes.
export { statePublisher } from './client.js';

// Thrown from `submitReport` so main can tell a refused report from an uncertain delivery.
export { ReportSubmissionError } from './client.js';

// The shapes a provider publishes and answers with: team state, team commands and their results.
export type { OnlookTeams, TeamCommand, TeamError, TeamResult } from '@studio/events';

// The method a sign-in used, and the bounded codes a failed one may carry.
export type { AuthSignInErrorCode, OnlookSignInMethod } from '@studio/events';

// What a provider may hand over as identity and account state: the neutral names, or the ones a provider built before them still sends.
export type { ProviderIdentity as StudioIdentity, ProviderMe as OnlookMe, ProviderState as OnlookState } from '../identity/provider-shape.js';

// The neutral forms alone, which Studio stores and a provider moves to: `source: 'provider'`, `subject`, `previousSubject`.
export type { StudioIdentity as AccountIdentity, OnlookMe as AccountMe, OnlookState as AccountState } from '@studio/events';

// What `submitReport` answers with once a report is filed.
export type { ReportFiled } from '@studio/events';
export type { GithubBackend, GithubReads, GithubReadFailure, GithubIdentity, GithubPermission, GithubRepositoryAccess, GithubPullRequests } from '../github-import/backend.js';
export { AUTH_SIGN_IN_ERROR_CODES } from '../../../../../packages/events/src/identity.js';

// Persists identity metadata where main reads it on the next launch.
export { writeIdentity } from '../identity/store.js';

// Where this build keeps its state, and whether a switch moved it, so provider files sit beside Studio's own.
export { stateRoot, stateRootOverridden } from '../state/root.js';

// Reads a versioned state file, for a session record an earlier build left behind.
export { readStateFile } from '../state/file.js';

// Writes and removes the provider's own files without leaving a torn one behind.
export { removeAtomicFile, writeAtomicFile } from '../fs-atomic.js';
