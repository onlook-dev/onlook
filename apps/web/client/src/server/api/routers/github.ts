import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { createUserGitHubService, getGitHubUserFromSession, createGitHubOctokit } from '../lib/github-auth';

const getGitHubServiceForUser = async (supabase: any) => {
    try {
        return await createUserGitHubService(supabase);
    } catch (error) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub authentication failed. Please sign in with GitHub.'
        });
    }
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
            const { octokit } = await getGitHubServiceForUser(ctx.supabase);
            const { data } = await octokit.rest.repos.get({ owner: input.owner, repo: input.repo });
            
            return {
                branch: data.default_branch,
                isPrivateRepo: data.private,
                authType: 'oauth'
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
            const { octokit } = await getGitHubServiceForUser(ctx.supabase);
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
                const { octokit } = await getGitHubServiceForUser(ctx.supabase);
                const { data } = await octokit.rest.orgs.listForAuthenticatedUser();
                return data;
            } catch (error: any) {
                console.log('Failed to get organizations:', error);
                return [];
            }
        }),

    getRepositories: protectedProcedure
        .input(
            z.object({
                owner: z.string().optional(),
            }).optional()
        )
        .query(async ({ input, ctx }) => {
            const { octokit, userInfo } = await getGitHubServiceForUser(ctx.supabase);

            try {
                if (input?.owner) {
                    // Get repositories for specific owner (user or org)
                    const { data } = await octokit.rest.repos.listForOrg({
                        org: input.owner,
                        type: 'all'
                    });
                    return data;
                } else {
                    // Get all repositories for the authenticated user
                    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
                        sort: 'updated',
                        direction: 'desc'
                    });
                    return data;
                }
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get repositories',
                    cause: error
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
            const { octokit } = await getGitHubServiceForUser(ctx.supabase);
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
                const { userInfo } = await getGitHubServiceForUser(ctx.supabase);
                
                return { 
                    connected: true,
                    user: {
                        login: userInfo.githubUsername,
                        id: userInfo.githubId
                    }
                };
            } catch (error) {
                return { 
                    connected: false
                };
            }
        }),

    createRepository: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                private: z.boolean().default(false),
                owner: z.string().optional(),
                isOrg: z.boolean().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit, userInfo } = await getGitHubServiceForUser(ctx.supabase);

            try {
                const targetOwner = input.owner || userInfo.githubUsername;
                
                const isUserRepository = targetOwner.toLowerCase() === userInfo.githubUsername.toLowerCase();

                const response = isUserRepository 
                    ? await octokit.rest.repos.createForAuthenticatedUser({
                        name: input.name,
                        description: input.description,
                        private: input.private,
                        auto_init: true,
                    })
                    : await octokit.rest.repos.createInOrg({
                        org: targetOwner,
                        name: input.name,
                        description: input.description,
                        private: input.private,
                        auto_init: true,
                    });

                const { data } = response;

                return {
                    success: true,
                    repository: {
                        id: data.id,
                        name: data.name,
                        fullName: data.full_name,
                        htmlUrl: data.html_url,
                        cloneUrl: data.clone_url,
                        sshUrl: data.ssh_url,
                        private: data.private,
                        defaultBranch: data.default_branch,
                    }
                };
            } catch (error: any) {
                if (error?.status === 422) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: 'Repository name already exists',
                    });
                }
                
                if (error?.status === 401) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'GitHub authentication failed. Please re-authenticate with GitHub.',
                    });
                }
                
                if (error?.status === 403) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'GitHub token missing repository permissions. Please update OAuth scopes and re-authenticate.',
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error?.message || 'Failed to create repository',
                });
            }
        }),

    uploadProjectFiles: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                files: z.array(
                    z.object({
                        path: z.string(),
                        content: z.string(),
                        encoding: z.enum(['utf-8', 'base64']).default('utf-8'),
                    })
                ),
                commitMessage: z.string().default('Initial project setup'),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getGitHubServiceForUser(ctx.supabase);

            try {
                // Get the current commit SHA from the default branch
                const { data: refData } = await octokit.rest.git.getRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: `heads/main`,
                });

                const latestCommitSha = refData.object.sha;

                // Get the tree SHA from the latest commit
                const { data: commitData } = await octokit.rest.git.getCommit({
                    owner: input.owner,
                    repo: input.repo,
                    commit_sha: latestCommitSha,
                });

                // Create tree entries for all files
                const treeEntries = input.files.map(file => ({
                    path: file.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    content: file.content,
                }));

                // Create a new tree with all files
                const { data: treeData } = await octokit.rest.git.createTree({
                    owner: input.owner,
                    repo: input.repo,
                    tree: treeEntries,
                    base_tree: commitData.tree.sha,
                });

                // Create a new commit
                const { data: newCommit } = await octokit.rest.git.createCommit({
                    owner: input.owner,
                    repo: input.repo,
                    message: input.commitMessage,
                    tree: treeData.sha,
                    parents: [latestCommitSha],
                });

                // Update the reference to point to the new commit
                await octokit.rest.git.updateRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: 'heads/main',
                    sha: newCommit.sha,
                });

                return {
                    success: true,
                    commit: {
                        sha: newCommit.sha,
                        htmlUrl: `https://github.com/${input.owner}/${input.repo}/commit/${newCommit.sha}`,
                    }
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error?.message || 'Failed to upload project files',
                });
            }
        }),

    getUserInfo: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const userInfo = await getGitHubUserFromSession(ctx.supabase);
                const octokit = createGitHubOctokit(userInfo.accessToken);
                
                let permissions = {
                    hasRepoScope: false,
                    scopes: [] as string[]
                };
                
                try {
                    const userResponse = await octokit.rest.users.getAuthenticated();
                    const scopes = userResponse.headers['x-oauth-scopes'] || '';
                    permissions = {
                        hasRepoScope: scopes.includes('repo'),
                        scopes: scopes.split(',').map((s: string) => s.trim()).filter(Boolean)
                    };
                } catch {
                    // Silent fail - permissions not critical for basic user info
                }
                
                return {
                    login: userInfo.githubUsername,
                    name: userInfo.githubUsername,
                    avatarUrl: `https://avatars.githubusercontent.com/u/${userInfo.githubId}?v=4`,
                    id: userInfo.githubId,
                    email: userInfo.email,
                    permissions,
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Please sign in with GitHub to continue.',
                });
            }
        }),
});