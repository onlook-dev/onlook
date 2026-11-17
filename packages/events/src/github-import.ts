export type GithubFailure =
  | { status: 'disconnected' }
  | { status: 'reconnect'; reason: 'revoked' | 'expired' | 'missing_scopes' }
  | { status: 'unavailable'; reason: 'not_configured' | 'provider_unavailable' | 'rate_limited' | 'token_lifetime' | 'git_unavailable' }
  | { status: 'forbidden' | 'not_found' | 'invalid_request' };

export type GithubConnection = GithubFailure | { status: 'connected'; scopes: string[]; expiresAt: number | null };
export type GithubStart = GithubFailure | { status: 'connecting'; url: string };
export interface GithubRepository {
  id: number;
  fullName: string;
  private: boolean;
  defaultBranch: string | null;
  archived: boolean;
  canPull: boolean;
  canPush: boolean;
  onThisComputer?: boolean;
  /** @parked ONL-3182 — the cloud's repository contract carries no organization-policy state, so only the Showroom sets this. */
  access?: 'sso' | 'approval';
}
export type GithubRepositoryPage = GithubFailure | { status: 'connected'; repositories: GithubRepository[]; nextPage: number | null };
export type GithubCloneFailure = 'network' | 'access' | 'disk' | 'empty' | 'cancelled' | 'destination' | 'existing' | 'cleanup' | 'unknown';
export type GithubEntryPoint = 'onboarding' | 'projects' | 'settings';
export type GithubImportCommand =
  | { kind: 'begin'; entryPoint: GithubEntryPoint }
  | { kind: 'status' }
  | { kind: 'start'; entryPoint: GithubEntryPoint }
  | { kind: 'repositories' }
  | { kind: 'access' }
  | { kind: 'select'; repositoryId: number }
  | { kind: 'open'; repositoryId: number }
  /** Back out of a dead end to the repository list, with what the dead end taught about the row (ONL-3182). */
  | { kind: 'list' }
  /** @parked ONL-3182 — main keeps remote branch listing while the picker shows no branch control. */
  | { kind: 'branches'; repositoryId: number }
  /** @parked ONL-3182 — main keeps the destination choice while the picker shows no Save-to control. */
  | { kind: 'destination'; destination: 'onlook' | 'documents' | 'choose' }
  | { kind: 'clone'; repositoryId: number; branch: string; entryPoint: GithubEntryPoint }
  | { kind: 'cancel' }
  | { kind: 'leave'; next: 'folder' | 'retry' | 'dismiss' | 'waiting' };

export interface GithubImportState {
  enabled: boolean;
  connection: GithubConnection | { status: 'connecting' };
  repositories: GithubRepository[];
  repositoryId?: number;
  branches: string[];
  /** @parked ONL-3182 — where the clone is saved is no longer shown or chosen; main still resolves it. */
  destination?: string;
  /** @parked ONL-3182 — no control sets this while the Save-to chooser is out of the picker. */
  destinationChoice?: 'onlook' | 'documents' | 'choose';
  waitingForApproval?: boolean;
  connectionAttempted?: boolean;
  existingPath?: string;
  phase: 'idle' | 'loading' | 'cloning' | 'done' | 'failed';
  /** How long the running clone has been going, so the view explains a slow one without keeping its own clock. */
  cloneStage?: 'cloning' | 'slow';
  progress: number;
  failure?: GithubCloneFailure;
  sourcePath?: string;
}
