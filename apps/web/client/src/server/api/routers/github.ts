import { CodeProvider, createCodeProviderClient, type Provider } from '@onlook/code-provider';
import { branches, users, userProjects, type DrizzleDb } from '@onlook/db';
import { createInstallationOctokit, generateInstallationUrl } from '@onlook/github';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
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

const parseGitHubRepoUrl = (repoUrl: string): { owner: string; repo: string } => {
    const normalizedUrl = repoUrl.trim();

    const httpsMatch = normalizedUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(\.git)?$/i);
    if (httpsMatch?.[1] && httpsMatch[2]) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    const sshMatch = normalizedUrl.match(/^git@github\.com:([^/]+)\/([^/.]+)(\.git)?$/i);
    if (sshMatch?.[1] && sshMatch[2]) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid GitHub repository URL',
    });
};

const getProviderForBranch = async (sandboxId: string): Promise<Provider> => {
    return createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {
                sandboxId,
                initClient: true,
            },
        },
    });
};

const normalizeSandboxPath = (filePath: string): string => {
    if (filePath.startsWith('/')) {
        return filePath;
    }
    return `/${filePath}`;
};

const normalizeRepoPath = (filePath: string): string => {
    return filePath.replace(/^\/+/, '');
};

const getFileContentAsBase64 = async (provider: Provider, sandboxPath: string): Promise<string> => {
    const file = await provider.readFile({ args: { path: sandboxPath } });

    if (file.file.type === 'text') {
        return Buffer.from(file.file.toString(), 'utf-8').toString('base64');
    }

    if (!file.file.content) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Unable to read binary content for ${sandboxPath}`,
        });
    }

    return Buffer.from(file.file.content).toString('base64');
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
            const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);

            const installation = await octokit.rest.apps.getInstallation({
                installation_id: parseInt(installationId, 10),
            });

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
                        description: undefined,
                    },
                ];
            }

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
                ref: z.string().optional(),
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
                state: ctx.user.id,
            });

            return { url, state };
        }),

    checkGitHubAppInstallation: protectedProcedure.query(async ({ ctx }): Promise<string | null> => {
        try {
            const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            await octokit.rest.apps.getInstallation({
                installation_id: parseInt(installationId, 10),
            });
            return installationId;
        } catch (error) {
            console.error('Error checking GitHub App installation:', error);
            throw new TRPCError({
                code: 'FORBIDDEN',
                message:
                    error instanceof Error
                        ? error.message
                        : 'GitHub App installation is invalid or has been revoked',
                cause: error,
            });
        }
    }),

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
                const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);

                const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
                    installation_id: parseInt(installationId, 10),
                    per_page: 100,
                    page: 1,
                });

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
            if (input.state && input.state !== ctx.user.id) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Invalid state parameter',
                });
            }

            try {
                await ctx.db
                    .update(users)
                    .set({ githubInstallationId: input.installationId })
                    .where(eq(users.id, ctx.user.id));

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

    getBranchGitState: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const branch = await ctx.db.query.branches.findFirst({
                where: eq(branches.id, input.branchId),
                with: {
                    project: {
                        with: {
                            userProjects: {
                                where: eq(userProjects.userId, ctx.user.id),
                                columns: {
                                    userId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!branch?.project || branch.project.userProjects.length === 0) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this branch',
                });
            }

            if (!branch.gitRepoUrl || !branch.gitBranch) {
                return {
                    canCreatePullRequest: false,
                    reason: 'This branch is not connected to a GitHub repository',
                };
            }

            const repo = parseGitHubRepoUrl(branch.gitRepoUrl);
            return {
                canCreatePullRequest: true,
                repo,
                baseBranch: branch.gitBranch,
                repoUrl: branch.gitRepoUrl,
            };
        }),

    createPullRequestFromBranch: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                title: z.string().min(1).max(255),
                body: z.string().optional(),
                baseBranch: z.string().optional(),
                headBranchName: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const dbBranch = await ctx.db.query.branches.findFirst({
                where: eq(branches.id, input.branchId),
                with: {
                    project: {
                        with: {
                            userProjects: {
                                where: eq(userProjects.userId, ctx.user.id),
                                columns: {
                                    userId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!dbBranch?.project || dbBranch.project.userProjects.length === 0) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have access to this branch',
                });
            }

            if (!dbBranch.gitRepoUrl || !dbBranch.gitBranch) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'This branch is not connected to a GitHub repository',
                });
            }

            const { owner, repo } = parseGitHubRepoUrl(dbBranch.gitRepoUrl);
            const baseBranch = input.baseBranch ?? dbBranch.gitBranch;
            const safeBranchName = dbBranch.name
                .toLowerCase()
                .replace(/[^a-z0-9/_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
            const headBranchName =
                input.headBranchName ?? `pixelraft/${safeBranchName || 'changes'}-${Date.now()}`;

            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const provider = await getProviderForBranch(dbBranch.sandboxId);

            try {
                const status = await provider.gitStatus({});
                const changedFiles = status.changedFiles.filter((file) => !!file.trim());

                if (changedFiles.length === 0) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No changed files found in this branch',
                    });
                }

                const baseRef = await octokit.rest.git.getRef({
                    owner,
                    repo,
                    ref: `heads/${baseBranch}`,
                });

                try {
                    await octokit.rest.git.createRef({
                        owner,
                        repo,
                        ref: `refs/heads/${headBranchName}`,
                        sha: baseRef.data.object.sha,
                    });
                } catch (error) {
                    if (!(error instanceof Error && error.message.includes('Reference already exists'))) {
                        throw error;
                    }
                }

                let processedFiles = 0;

                for (const changedFile of changedFiles) {
                    const sandboxPath = normalizeSandboxPath(changedFile);
                    const repoPath = normalizeRepoPath(changedFile);

                    if (!repoPath) {
                        continue;
                    }

                    let existsInSandbox = true;
                    try {
                        await provider.statFile({ args: { path: sandboxPath } });
                    } catch {
                        existsInSandbox = false;
                    }

                    if (existsInSandbox) {
                        const content = await getFileContentAsBase64(provider, sandboxPath);

                        let existingSha: string | undefined;
                        try {
                            const existing = await octokit.rest.repos.getContent({
                                owner,
                                repo,
                                path: repoPath,
                                ref: headBranchName,
                            });
                            if (!Array.isArray(existing.data)) {
                                existingSha = existing.data.sha;
                            }
                        } catch {
                        }

                        await octokit.rest.repos.createOrUpdateFileContents({
                            owner,
                            repo,
                            path: repoPath,
                            message: `pixelraft: update ${repoPath}`,
                            content,
                            branch: headBranchName,
                            ...(existingSha ? { sha: existingSha } : {}),
                        });
                        processedFiles += 1;
                        continue;
                    }

                    try {
                        const existing = await octokit.rest.repos.getContent({
                            owner,
                            repo,
                            path: repoPath,
                            ref: headBranchName,
                        });

                        if (!Array.isArray(existing.data)) {
                            await octokit.rest.repos.deleteFile({
                                owner,
                                repo,
                                path: repoPath,
                                message: `pixelraft: delete ${repoPath}`,
                                sha: existing.data.sha,
                                branch: headBranchName,
                            });
                            processedFiles += 1;
                        }
                    } catch {
                    }
                }

                if (processedFiles === 0) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No applicable file changes were synced to GitHub',
                    });
                }

                try {
                    const pullRequest = await octokit.rest.pulls.create({
                        owner,
                        repo,
                        title: input.title,
                        head: headBranchName,
                        base: baseBranch,
                        body: input.body,
                    });

                    return {
                        pullRequestNumber: pullRequest.data.number,
                        pullRequestUrl: pullRequest.data.html_url,
                        headBranchName,
                        baseBranch,
                        changedFiles: processedFiles,
                    };
                } catch (error) {
                    const existingPullRequests = await octokit.rest.pulls.list({
                        owner,
                        repo,
                        head: `${owner}:${headBranchName}`,
                        base: baseBranch,
                        state: 'open',
                    });

                    const existingPullRequest = existingPullRequests.data[0];
                    if (existingPullRequest) {
                        return {
                            pullRequestNumber: existingPullRequest.number,
                            pullRequestUrl: existingPullRequest.html_url,
                            headBranchName,
                            baseBranch,
                            changedFiles: processedFiles,
                        };
                    }

                    throw error;
                }
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to create pull request',
                    cause: error,
                });
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),
});
