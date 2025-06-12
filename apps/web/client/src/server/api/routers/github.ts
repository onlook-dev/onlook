import { env } from '@/env';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

// Helper function to get user's GitHub access token from Supabase session
const getUserGitHubToken = async (supabase: any) => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No active session found'
        });
    }

    // GitHub OAuth token should be in provider_token, not access_token
    // access_token is Supabase's JWT, provider_token is GitHub's OAuth token
    const githubToken = session.provider_token;
    if (!githubToken) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: `GitHub token not found. Please reconnect your GitHub account.`
        });
    }

    return githubToken;
};

// Create Octokit instance with user's token
const createUserOctokit = async (supabase: any) => {
    const token = await getUserGitHubToken(supabase);
    return new Octokit({ auth: token });
};

export const githubRouter = createTRPCRouter({
    // Add debug endpoint to check GitHub token scopes
    debugTokenScopes: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const octokit = await createUserOctokit(ctx.supabase);
                
                // Get current user to verify token works
                const { data: user } = await octokit.rest.users.getAuthenticated();
                
                // Check token scopes by making a request and examining headers
                const response = await octokit.request('GET /user');
                const scopesHeader = response.headers['x-oauth-scopes'];
                const acceptedScopesHeader = response.headers['x-accepted-oauth-scopes'];
                
                const scopes = typeof scopesHeader === 'string' ? scopesHeader.split(', ') : [];
                const acceptedScopes = typeof acceptedScopesHeader === 'string' ? acceptedScopesHeader.split(', ') : [];
                
                return {
                    user: {
                        login: user.login,
                        id: user.id,
                        type: user.type
                    },
                    scopes,
                    acceptedScopes,
                    hasOrgScope: scopes.includes('read:org') || scopes.includes('admin:org'),
                    hasUserScope: scopes.includes('user') || scopes.includes('read:user'),
                    tokenValid: true
                };
            } catch (error: any) {
                console.error('GitHub token debug error:', error);
                return {
                    user: null,
                    scopes: [],
                    acceptedScopes: [],
                    hasOrgScope: false,
                    hasUserScope: false,
                    tokenValid: false,
                    error: error.message
                };
            }
        }),

    validate: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string()
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const octokit = await createUserOctokit(ctx.supabase);
            const { data } = await octokit.rest.repos.get({ owner: input.owner, repo: input.repo });
            return {
                branch: data.default_branch,
                isPrivateRepo: data.private
            };
        }),
    
    getRepo: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string()
            }),
        )
        .query(async ({ input, ctx }) => {
            const octokit = await createUserOctokit(ctx.supabase);
            const { data } = await octokit.rest.repos.get({ 
                owner: input.owner, 
                repo: input.repo 
            });
            return data;
        }),

    getOrganizations: protectedProcedure
        .input(
            z.object({
                username: z.string().optional()
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            try {
                const octokit = await createUserOctokit(ctx.supabase);
                
                // Check token scopes first
                const scopeResponse = await octokit.request('GET /user');
                const scopesHeader = scopeResponse.headers['x-oauth-scopes'];
                const scopes = typeof scopesHeader === 'string' ? scopesHeader.split(', ') : [];
                const hasOrgScope = scopes.includes('read:org') || scopes.includes('admin:org');
                
                console.log('GitHub token scopes:', scopes);
                console.log('Has org scope:', hasOrgScope);
                
                if (!hasOrgScope) {
                    console.warn('GitHub token missing required organization scopes. Current scopes:', scopes);
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: `GitHub token missing required organization scopes. Current scopes: ${scopes.join(', ')}. Please re-authenticate with organization access.`
                    });
                }
                
                let data;
                if (input?.username) {
                    console.log('Fetching organizations for user:', input.username);
                    const response = await octokit.rest.orgs.listForUser({
                        username: input.username
                    });
                    data = response.data;
                } else {
                    console.log('Fetching organizations for authenticated user');
                    const response = await octokit.rest.orgs.listForAuthenticatedUser();
                    data = response.data;
                }
                
                console.log('Organizations found:', data.length);
                return data;
            } catch (error: any) {
                console.error('Error fetching organizations:', error);
                
                if (error instanceof TRPCError) {
                    throw error;
                }
                
                // Check if it's a scope-related error
                if (error.status === 403) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to access organizations. Please re-authenticate with organization access.'
                    });
                }
                
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to fetch organizations: ${error.message}`
                });
            }
        }),

    getRepositories: protectedProcedure
        .input(
            z.object({
                username: z.string().optional(),
                type: z.enum(['all', 'owner', 'public', 'private', 'member']).default('all'),
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            const octokit = await createUserOctokit(ctx.supabase);
            
            if (input?.username) {
                // listForUser only supports 'all', 'owner', 'member' types
                const validUserType = input.type === 'public' || input.type === 'private' ? 'all' : input.type;
                const { data } = await octokit.rest.repos.listForUser({
                    username: input.username,
                    type: validUserType,
                });
                return data;
            } else {
                const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                    type: input?.type || 'all',
                });
                return data;
            }
        }),

    getRepoFiles: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string().default(''),
                ref: z.string().optional() // branch, tag, or commit SHA
            })
        )
        .query(async ({ input, ctx }) => {
            const octokit = await createUserOctokit(ctx.supabase);
            const { data } = await octokit.rest.repos.getContent({
                owner: input.owner,
                repo: input.repo,
                path: input.path,
                ...(input.ref && { ref: input.ref })
            });
            return data;
        }),

    checkGitHubConnection: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const token = await getUserGitHubToken(ctx.supabase);
                return { connected: !!token };
            } catch (error) {
                return { connected: false };
            }
        }),
});