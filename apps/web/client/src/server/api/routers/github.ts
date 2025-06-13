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
            const octokit = await createUserOctokit(ctx.supabase);
            
            if (input?.username) {
                const { data } = await octokit.rest.orgs.listForUser({
                    username: input.username
                });
                return data;
            } else {
                const { data } = await octokit.rest.orgs.listForAuthenticatedUser();
                return data;
            }
        }),

    getRepositories: protectedProcedure
        .input(
            z.object({
                username: z.string().optional(),
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            const octokit = await createUserOctokit(ctx.supabase);
            
            if (input?.username) {
                // listForUser only supports 'all', 'owner', 'member' types
                const { data } = await octokit.rest.repos.listForUser({
                    username: input.username,
                });
                return data;
            } else {
                const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                    per_page: 100,
                    page: 1,
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

    reconnectGitHub: protectedProcedure
        .mutation(async ({ ctx }) => {
            const origin = ctx.headers.get('origin') || 'http://localhost:3000';
            
            const { data, error } = await ctx.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${origin}/auth/callback`,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to initiate GitHub reconnection',
                    cause: error,
                });
            }

            return { url: data.url };
        }),
});