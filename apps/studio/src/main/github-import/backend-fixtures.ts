import type { GithubBackend, GithubIdentity, GithubPermission, GithubPullRequests, GithubReadFailure, GithubRepositoryAccess } from './backend.js';

export const GITHUB_READ_FAILURES: readonly GithubReadFailure[] = [
  { status: 'disconnected' },
  { status: 'reconnect', reason: 'revoked' },
  { status: 'reconnect', reason: 'expired' },
  { status: 'reconnect', reason: 'missing_scopes' },
  ...(['not_configured', 'provider_unavailable', 'rate_limited', 'token_lifetime', 'git_unavailable'] as const)
    .map((reason) => ({ status: 'unavailable' as const, reason })),
  { status: 'forbidden' }, { status: 'not_found' }, { status: 'invalid_request' },
  { status: 'sso_required' }, { status: 'approval_required' },
];

export type GithubStatusScenario = 'connected' | 'disconnected' | 'no-access' | 'pull-request-open' | 'unavailable';

export function githubBackendFixture(scenario: GithubStatusScenario = 'connected', overrides: {
  identity?: GithubIdentity; repositoryAccess?: GithubRepositoryAccess; pullRequests?: GithubPullRequests;
} = {}): GithubBackend {
  const permission: GithubPermission = scenario === 'no-access' ? 'READ' : 'WRITE';
  const failure = scenario === 'disconnected' ? { status: 'disconnected' as const }
    : scenario === 'unavailable' ? { status: 'unavailable' as const, reason: 'provider_unavailable' as const } : undefined;
  return {
    start: async () => ({ status: 'connecting', url: 'https://github.com/login/oauth/authorize' }),
    status: async () => failure ?? { status: 'connected', scopes: [], expiresAt: null },
    repositories: async () => ({ status: 'connected', repositories: [], nextPage: null }),
    credential: async () => ({ status: 'disconnected' }),
    identity: async () => structuredClone(overrides.identity ?? failure ?? { status: 'connected', account: 'designer' }),
    repositoryAccess: async () => structuredClone(overrides.repositoryAccess ?? failure ?? {
      status: 'connected', repository: { fullName: 'example/design', permission, parent: null },
    }),
    pullRequests: async () => structuredClone(overrides.pullRequests ?? failure ?? {
      status: 'connected', pullRequests: scenario === 'pull-request-open' ? [{
        number: 42, url: 'https://github.com/example/design/pull/42', state: 'OPEN', isDraft: false,
        mergeStateStatus: 'CLEAN', checks: 'passing', baseRefName: 'main', updatedAt: '2026-01-01T00:00:00Z',
      }] : [],
    }),
  };
}
