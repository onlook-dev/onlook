import { Octokit } from '@octokit/rest';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import type { DrizzleDb } from '@onlook/db';
import { users } from '@onlook/db';
import { createInstallationOctokit, generateInstallationUrl } from '@onlook/github';

import { createClient } from '@/utils/supabase/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const getUserGitHubInstallation = async (db: DrizzleDb, userId: string) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { githubInstallationId: true },
    });

    if (!user?.githubInstallationId) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'GitHub App installation required',
        });
    }
    return {
        octokit: createInstallationOctokit(user.githubInstallationId),
        installationId: user.githubInstallationId,
    };
};

const getUserGitHubOAuth = async () => {
    const supabase = await createClient();
    const {
        data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;

    if (!providerToken) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'GitHub OAuth access required',
        });
    }

    return {
        octokit: new Octokit({ auth: providerToken }),
        token: providerToken,
    };
};

export const githubRouter = createTRPCRouter({
    validate: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const { data } = await octokit.rest.repos.get({ owner: input.owner, repo: input.repo });
            return {
                branch: data.default_branch,
                isPrivateRepo: data.private,
            };
        }),
    getRepo: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
            }),
        )
        .query(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const { data } = await octokit.rest.repos.get({
                owner: input.owner,
                repo: input.repo,
            });
            return data;
        }),

    getOrganizations: protectedProcedure.query(async ({ ctx }) => {
        try {
            const { octokit, installationId } = await getUserGitHubInstallation(
                ctx.db,
                ctx.user.id,
            );

            // Get installation details to determine account type
            const installation = await octokit.rest.apps.getInstallation({
                installation_id: parseInt(installationId, 10),
            });

            // If installed on an organization, return that organization
            if (
                installation.data.account &&
                'type' in installation.data.account &&
                installation.data.account.type === 'Organization'
            ) {
                return [
                    {
                        id: installation.data.account.id,
                        login:
                            'login' in installation.data.account
                                ? installation.data.account.login
                                : (installation.data.account as any).name || '',
                        avatar_url: installation.data.account.avatar_url,
                        description: undefined, // Organizations don't have descriptions in this context
                    },
                ];
            }

            // If installed on a user account, return empty (no organizations)
            return [];
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'GitHub App installation is invalid or has been revoked',
                cause: error,
            });
        }
    }),
    getRepoFiles: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string().default(''),
                ref: z.string().optional(), // branch, tag, or commit SHA
            }),
        )
        .query(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const { data } = await octokit.rest.repos.getContent({
                owner: input.owner,
                repo: input.repo,
                path: input.path,
                ...(input.ref && { ref: input.ref }),
            });
            return data;
        }),
    generateInstallationUrl: protectedProcedure
        .input(
            z
                .object({
                    redirectUrl: z.string().optional(),
                })
                .optional(),
        )
        .mutation(async ({ input, ctx }) => {
            const { url, state } = generateInstallationUrl({
                redirectUrl: input?.redirectUrl,
                state: ctx.user.id, // Use user ID as state for CSRF protection
            });

            return { url, state };
        }),

    checkGitHubAppInstallation: protectedProcedure.query(
        async ({ ctx }): Promise<string | null> => {
            try {
                const { octokit, installationId } = await getUserGitHubInstallation(
                    ctx.db,
                    ctx.user.id,
                );
                await octokit.rest.apps.getInstallation({
                    installation_id: parseInt(installationId, 10),
                });
                return installationId;
            } catch (error) {
                // If user doesn't have an installation, return null (not an error)
                if (error instanceof TRPCError && error.code === 'PRECONDITION_FAILED') {
                    return null;
                }
                // For other errors (invalid installation, revoked, etc.), return null as well
                // This is a "check" endpoint, so it should gracefully return null instead of throwing
                console.warn(
                    'GitHub App installation check failed:',
                    error instanceof Error ? error.message : error,
                );
                return null;
            }
        },
    ),

    getRepositoriesWithApp: protectedProcedure
        .input(
            z
                .object({
                    username: z.string().optional(),
                })
                .optional(),
        )
        .query(async ({ ctx }) => {
            try {
                const { octokit, installationId } = await getUserGitHubInstallation(
                    ctx.db,
                    ctx.user.id,
                );

                const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
                    installation_id: parseInt(installationId, 10),
                    per_page: 100,
                    page: 1,
                });

                // Transform to match reference implementation pattern
                return data.repositories.map((repo) => ({
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    description: repo.description,
                    private: repo.private,
                    default_branch: repo.default_branch,
                    clone_url: repo.clone_url,
                    html_url: repo.html_url,
                    updated_at: repo.updated_at,
                    owner: {
                        login: repo.owner.login,
                        avatar_url: repo.owner.avatar_url,
                    },
                }));
            } catch (error) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'GitHub App installation is invalid or has been revoked. Please reinstall the GitHub App.',
                    cause: error,
                });
            }
        }),
    handleInstallationCallbackUrl: protectedProcedure
        .input(
            z.object({
                installationId: z.string(),
                setupAction: z.string(),
                state: z.string(),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            // Validate state parameter matches current user ID for CSRF protection
            if (input.state && input.state !== ctx.user.id) {
                console.error('State mismatch:', { expected: ctx.user.id, received: input.state });
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid state parameter',
                });
            }

            // Update user's GitHub installation ID
            try {
                await ctx.db
                    .update(users)
                    .set({ githubInstallationId: input.installationId })
                    .where(eq(users.id, ctx.user.id));

                console.log(`Updated installation ID for user: ${ctx.user.id}`);

                return {
                    success: true,
                    message: 'GitHub App installation completed successfully',
                    installationId: input.installationId,
                };
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update GitHub installation',
                    cause: error,
                });
            }
        }),

    getRepositoriesWithOAuth: protectedProcedure
        .input(
            z
                .object({
                    page: z.number().default(1),
                    perPage: z.number().default(100),
                })
                .optional(),
        )
        .query(async ({ input }) => {
            try {
                const { octokit } = await getUserGitHubOAuth();

                const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                    per_page: input?.perPage ?? 100,
                    page: input?.page ?? 1,
                    sort: 'updated',
                    affiliation: 'owner,collaborator,organization_member',
                });

                return data;
            } catch (error) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message:
                        'GitHub OAuth access is invalid or has been revoked. Please reconnect your GitHub account.',
                    cause: error,
                });
            }
        }),

    getOrganizationsWithOAuth: protectedProcedure.query(async () => {
        try {
            const { octokit } = await getUserGitHubOAuth();

            const { data } = await octokit.rest.orgs.listForAuthenticatedUser({
                per_page: 100,
            });

            return data;
        } catch (error) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                    'GitHub OAuth access is invalid or has been revoked. Please reconnect your GitHub account.',
                cause: error,
            });
        }
    }),
});
