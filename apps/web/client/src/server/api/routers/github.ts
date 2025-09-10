import {
    createInstallationOctokit,
    generateInstallationUrl,
    getGitHubAppConfig
} from '@onlook/github';
import { TRPCError } from '@trpc/server';
import { Octokit } from 'octokit';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const getUserGitHubToken = async (supabase: any) => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No active session found'
        });
    }

    const githubToken = session.provider_token;
    if (!githubToken) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: `GitHub token not found. Please reconnect your GitHub account.`
        });
    }

    return githubToken;
};

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
        .query(async ({ ctx }) => {
            const { data: user } = await ctx.supabase.auth.getUser();
            if (!user?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                });
            }

            const { data: userData } = await ctx.supabase
                .from('users')
                .select('github_installation_id')
                .eq('id', user.user.id)
                .single();

            if (!userData?.github_installation_id) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'GitHub App installation required',
                });
            }

            const config = getGitHubAppConfig();
            if (!config) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'GitHub App configuration not available',
                });
            }

            try {
                const octokit = createInstallationOctokit(config, userData.github_installation_id);

                // Get installation details to determine account type
                const installation = await octokit.rest.apps.getInstallation({
                    installation_id: parseInt(userData.github_installation_id, 10),
                });

                // If installed on an organization, return that organization
                if (installation.data.account && 'type' in installation.data.account && installation.data.account.type === 'Organization') {
                    return [{
                        id: installation.data.account.id,
                        login: 'login' in installation.data.account ? installation.data.account.login : (installation.data.account as any).name || '',
                        avatar_url: installation.data.account.avatar_url,
                        description: undefined, // Organizations don't have descriptions in this context
                    }];
                }

                // If installed on a user account, return empty (no organizations)
                return [];
            } catch (error) {
                // If installation is invalid, clear it from database
                await ctx.supabase
                    .from('users')
                    .update({ github_installation_id: null })
                    .eq('id', user.user.id);

                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'GitHub App installation is invalid or has been revoked',
                });
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
    // GitHub App Installation Flow
    generateInstallationUrl: protectedProcedure
        .input(
            z.object({
                redirectUrl: z.string().optional(),
            }).optional()
        )
        .mutation(async ({ input, ctx }) => {
            const config = getGitHubAppConfig();
            if (!config) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'GitHub App configuration not found',
                });
            }

            // Get the current user ID to use as state parameter for CSRF protection
            const { data: user } = await ctx.supabase.auth.getUser();
            if (!user?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                });
            }

            const { url, state } = generateInstallationUrl(config, {
                redirectUrl: input?.redirectUrl,
                state: user.user.id, // Use user ID as state for CSRF protection
            });

            return { url, state };
        }),

    handleInstallationCallback: protectedProcedure
        .input(
            z.object({
                installationId: z.string(),
                setupAction: z.string(),
                state: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                // Update user with GitHub installation ID
                const { data: user } = await ctx.supabase.auth.getUser();
                if (!user?.user?.id) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'User not authenticated',
                    });
                }

                // Update user's GitHub installation ID in the database
                const { error } = await ctx.supabase
                    .from('users')
                    .update({ github_installation_id: input.installationId })
                    .eq('id', user.user.id);

                if (error) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to update user with GitHub installation ID',
                        cause: error,
                    });
                }

                return {
                    success: true,
                    installationId: input.installationId,
                };
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to handle GitHub App installation callback',
                    cause: error,
                });
            }
        }),

    checkGitHubAppInstallation: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const { data: user } = await ctx.supabase.auth.getUser();
                if (!user?.user?.id) {
                    return { hasInstallation: false, installationId: null };
                }


                // Get user's GitHub installation ID from database
                const { data: userData, error } = await ctx.supabase
                    .from('users')
                    .select('github_installation_id')
                    .eq('id', user.user.id)
                    .single();

                if (error || !userData?.github_installation_id) {
                    return { hasInstallation: false, installationId: null };
                }

                // Verify the installation is still valid
                const config = getGitHubAppConfig();
                if (!config) {
                    // If no GitHub App config, clear any stored installation ID
                    await ctx.supabase
                        .from('users')
                        .update({ github_installation_id: null })
                        .eq('id', user.user.id);
                    return { hasInstallation: false, installationId: null };
                }

                try {
                    const octokit = createInstallationOctokit(config, userData.github_installation_id);
                    await octokit.rest.apps.getInstallation({
                        installation_id: parseInt(userData.github_installation_id, 10),
                    });

                    return {
                        hasInstallation: true,
                        installationId: userData.github_installation_id
                    };
                } catch (error) {
                    // Installation might be deleted or suspended
                    // Clear the invalid installation ID from database
                    await ctx.supabase
                        .from('users')
                        .update({ github_installation_id: null })
                        .eq('id', user.user.id);
                    return { hasInstallation: false, installationId: null };
                }
            } catch (error) {
                console.error('Error checking GitHub App installation:', error);
                return { hasInstallation: false, installationId: null };
            }
        }),

    // Repository fetching using GitHub App installation (required)
    getRepositoriesWithApp: protectedProcedure
        .input(
            z.object({
                username: z.string().optional(),
            }).optional()
        )
        .query(async ({ ctx }) => {
            const { data: user } = await ctx.supabase.auth.getUser();
            if (!user?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                });
            }

            const { data: userData } = await ctx.supabase
                .from('users')
                .select('github_installation_id')
                .eq('id', user.user.id)
                .single();

            if (!userData?.github_installation_id) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'GitHub App installation required. Please install the GitHub App first.',
                });
            }

            const config = getGitHubAppConfig();
            if (!config) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'GitHub App configuration not available',
                });
            }

            try {
                const octokit = createInstallationOctokit(config, userData.github_installation_id);

                const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
                    installation_id: parseInt(userData.github_installation_id, 10),
                    per_page: 100,
                    page: 1,
                });

                // Transform to match reference implementation pattern
                return data.repositories.map(repo => ({
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
                // If installation is invalid, clear it from database
                await ctx.supabase
                    .from('users')
                    .update({ github_installation_id: null })
                    .eq('id', user.user.id);

                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'GitHub App installation is invalid or has been revoked. Please reinstall the GitHub App.',
                });
            }
        }),

    // Handle GitHub App installation callback
    handleInstallationCallbackUrl: protectedProcedure
        .input(
            z.object({
                installationId: z.string(),
                setupAction: z.string(),
                state: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { data: user } = await ctx.supabase.auth.getUser();
            if (!user?.user?.id) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                });
            }

            // Validate state parameter matches current user ID for CSRF protection
            if (input.state && input.state !== user.user.id) {
                console.error('State mismatch:', { expected: user.user.id, received: input.state });
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid state parameter',
                });
            }

            // Update user's GitHub installation ID
            try {
                const { error } = await ctx.supabase
                    .from('users')
                    .update({ github_installation_id: input.installationId })
                    .eq('id', user.user.id);

                if (error) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to update installation',
                        cause: error,
                    });
                }

                console.log(`Updated installation ID for user: ${user.user.id}`);

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

});