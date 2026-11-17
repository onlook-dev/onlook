export interface OnlookMe {
  user: { id: string; subject: string; email: string; createdAt: number } | null;
  orgId: string | null;
  role: string | null;
}

export type OnlookSignInMethod = 'google' | 'github' | 'email';

export type OnlookActionResult = { ok: true } | {
  ok: false;
  code: AuthProviderErrorCode | 'denied' | 'team_only' | 'last_admin' | 'failed' | 'busy' | 'not_configured' | 'superseded';
};

/** What main knows about the person from their own sign-in, before any server answers. */
export interface OnlookProfile {
  name: string | null;
  email: string | null;
  /** A `data:` URL: the renderer's CSP admits no remote image, and it never fetches one. */
  picture: string | null;
}

export interface OnlookState {
  sessionEnded?: boolean;
  signInStep?: AuthSignInStep | null;
  revision: number;
  sessionEpoch?: number;
  session: 'local' | 'signed-out' | 'signed-in';
  connection: 'idle' | 'connecting' | 'connected' | 'offline';
  me: OnlookMe | null;
  profile: OnlookProfile | null;
  updateRequired?: { clientBuild: number; minimumSupportedBuild: number; message: string };
  teams?: OnlookTeams;
  teamsEnabled?: boolean;
}

export type TeamRole = 'admin' | 'member';
export type TeamError = 'unavailable' | 'offline' | 'last-admin' | 'busy' | 'reconciliation' | 'sign-in-required' | 'switch-required' | 'invalid-request' | 'failed';
export interface TeamWorkspace { id: string; name: string; role: string }
export interface TeamMember { id: string; userId: string; role: string; status: string }
export interface TeamInvitation { id: string; email: string; state: string; expiresAt: string }
export interface OnlookTeams {
  workspaces: TeamWorkspace[];
  members: TeamMember[];
  invitations: TeamInvitation[];
  activeId: string | null;
  loading: boolean;
  error: TeamError | null;
}
export type TeamCommand =
  | { type: 'refresh' }
  | { type: 'switch'; workspaceId: string }
  | { type: 'create'; name: string; requestId: string }
  | { type: 'invite'; email: string; role: TeamRole; workspaceId: string }
  | { type: 'join'; invitationId: string }
  | { type: 'revoke'; invitationId: string; workspaceId: string }
  | { type: 'set-role'; membershipId: string; role: TeamRole; workspaceId: string }
  | { type: 'remove'; membershipId: string; workspaceId: string }
  | { type: 'leave'; workspaceId: string };
export type TeamResult = { ok: true } | { ok: false; error: TeamError };
import type { AuthProviderErrorCode, AuthSignInStep } from './identity.js';
