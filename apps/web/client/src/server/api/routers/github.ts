import { branches, users, type DrizzleDb } from '@onlook/db';
import {
    createInstallationOctokit,
    generateInstallationUrl
} from '@onlook/github';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const getUserGitHubInstallation = async (db: DrizzleDb, userId: string) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { githubInstallationId: true }
    });

    if (!user?.githubInstallationId) {
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'GitHub App installation required',
        });
    }
    return {
        octokit: createInstallationOctokit(user.githubInstallationId),
        installationId: user.githubInstallationId
    };
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
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
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
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const { data } = await octokit.rest.repos.get({
                owner: input.owner,
                repo: input.repo
            });
            return data;
        }),

    getOrganizations: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);

                console.log(`Checking installation ${installationId} for organizations`);

                // Get installation details to determine account type
                const installation = await octokit.rest.apps.getInstallation({
                    installation_id: parseInt(installationId, 10),
                });

                console.log(`Installation account:`, installation.data.account);

                // Check if this is an organization installation by checking if login exists (organizations have login, users have login too)
                // We need to differentiate by looking at the installation target_type or by checking available permissions
                const account = installation.data.account;
                
                // If installed on an organization, return that organization
                // GitHub App installations on orgs vs users can be distinguished by installation.data.target_type
                if (installation.data.target_type === 'Organization' && account) {
                    const orgData = [{
                        id: account.id,
                        login: 'login' in account ? account.login : (account as any).name || '',
                        avatar_url: account.avatar_url,
                        description: undefined, // Organizations don't have descriptions in this context
                    }];
                    console.log(`Returning organization data:`, orgData);
                    return orgData;
                }

                // If installed on a user account, return empty (no organizations)
                console.log('Installation is on user account, no organizations');
                return [];
            } catch (error) {
                console.error('Error fetching organizations:', error);
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'GitHub App installation is invalid or has been revoked',
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
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            const { data } = await octokit.rest.repos.getContent({
                owner: input.owner,
                repo: input.repo,
                path: input.path,
                ...(input.ref && { ref: input.ref })
            });
            return data;
        }),
    generateInstallationUrl: protectedProcedure
        .input(
            z.object({
                redirectUrl: z.string().optional(),
            }).optional()
        )
        .mutation(async ({ input, ctx }) => {
            const { url, state } = generateInstallationUrl({
                redirectUrl: input?.redirectUrl,
                state: ctx.user.id, // Use user ID as state for CSRF protection
            });

            return { url, state };
        }),

    checkGitHubAppInstallation: protectedProcedure
        .query(async ({ ctx }): Promise<string | null> => {
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
                    message: error instanceof Error ? error.message : 'GitHub App installation is invalid or has been revoked',
                    cause: error
                });
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
            try {
                const { octokit, installationId } = await getUserGitHubInstallation(ctx.db, ctx.user.id);

                const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
                    installation_id: parseInt(installationId, 10),
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
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'GitHub App installation is invalid or has been revoked. Please reinstall the GitHub App.',
                    cause: error
                });
            }
        }),
    handleInstallationCallbackUrl: protectedProcedure
        .input(
            z.object({
                installationId: z.string(),
                setupAction: z.string(),
                state: z.string(),
            })
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
                await ctx.db.update(users)
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

    // Repository Creation
    createRepository: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1, 'Repository name is required'),
                description: z.string().optional(),
                private: z.boolean().default(true),
                owner: z.string().optional(), // for organization repos
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            try {
                const createParams: any = {
                    name: input.name,
                    description: input.description,
                    private: input.private,
                    auto_init: true, // Create with initial commit
                };

                let repoData;
                if (input.owner) {
                    // Create in organization
                    console.log(`Creating repository in organization: ${input.owner}`);
                    repoData = await octokit.rest.repos.createInOrg({
                        org: input.owner,
                        ...createParams,
                    });
                } else {
                    // Create in user account
                    console.log('Creating repository in user account');
                    repoData = await octokit.rest.repos.createForAuthenticatedUser(createParams);
                }

                return {
                    id: repoData.data.id,
                    name: repoData.data.name,
                    full_name: repoData.data.full_name,
                    description: repoData.data.description,
                    private: repoData.data.private,
                    default_branch: repoData.data.default_branch,
                    clone_url: repoData.data.clone_url,
                    html_url: repoData.data.html_url,
                    owner: {
                        login: repoData.data.owner.login,
                        avatar_url: repoData.data.owner.avatar_url,
                    },
                };
            } catch (error: any) {
                console.error('Repository creation failed:', error);
                
                if (error.status === 422) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Repository name already exists or is invalid',
                    });
                }
                
                if (error.status === 403) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'Insufficient permissions to create repository. Please reinstall the GitHub App with "All repositories" access or ensure you have admin rights to the organization.',
                    });
                }
                
                if (error.status === 404) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Organization not found or you don\'t have access to it. Please check the organization name or reinstall the GitHub App.',
                    });
                }
                
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to create repository: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // File Operations
    createOrUpdateFile: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string(),
                content: z.string(),
                message: z.string(),
                branch: z.string().default('main'),
                sha: z.string().optional(), // Required for updates
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            try {
                const { data } = await octokit.rest.repos.createOrUpdateFileContents({
                    owner: input.owner,
                    repo: input.repo,
                    path: input.path,
                    message: input.message,
                    content: Buffer.from(input.content, 'utf8').toString('base64'),
                    branch: input.branch,
                    ...(input.sha && { sha: input.sha }),
                });

                return {
                    sha: data.content?.sha,
                    path: data.content?.path,
                    message: data.commit.message,
                    html_url: data.content?.html_url,
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to create/update file: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // Batch file operations for project export
    createOrUpdateFiles: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                files: z.array(
                    z.object({
                        path: z.string(),
                        content: z.string(),
                        sha: z.string().optional(),
                    })
                ),
                message: z.string(),
                branch: z.string().default('main'),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            try {
                // Get the current commit SHA for the branch
                const { data: refData } = await octokit.rest.git.getRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: `heads/${input.branch}`,
                });

                const baseCommitSha = refData.object.sha;

                // Get base tree SHA
                const { data: baseCommit } = await octokit.rest.git.getCommit({
                    owner: input.owner,
                    repo: input.repo,
                    commit_sha: baseCommitSha,
                });

                // Create tree entries for all files
                const treeEntries = input.files.map(file => ({
                    path: file.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    content: file.content,
                }));

                // Create new tree
                const { data: newTree } = await octokit.rest.git.createTree({
                    owner: input.owner,
                    repo: input.repo,
                    base_tree: baseCommit.tree.sha,
                    tree: treeEntries,
                });

                // Create new commit
                const { data: newCommit } = await octokit.rest.git.createCommit({
                    owner: input.owner,
                    repo: input.repo,
                    message: input.message,
                    tree: newTree.sha,
                    parents: [baseCommitSha],
                });

                // Update branch reference
                await octokit.rest.git.updateRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: `heads/${input.branch}`,
                    sha: newCommit.sha,
                });

                return {
                    commit: {
                        sha: newCommit.sha,
                        message: newCommit.message,
                        html_url: `https://github.com/${input.owner}/${input.repo}/commit/${newCommit.sha}`,
                    },
                    filesCount: input.files.length,
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to create/update files: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // Branch Operations
    getBranches: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            const { data } = await octokit.rest.repos.listBranches({
                owner: input.owner,
                repo: input.repo,
                per_page: 100,
            });

            return data.map(branch => ({
                name: branch.name,
                protected: branch.protected,
                commit: {
                    sha: branch.commit.sha,
                    url: branch.commit.url,
                },
            }));
        }),

    createBranch: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                branchName: z.string(),
                fromBranch: z.string().default('main'),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            try {
                // Get the SHA of the source branch
                const { data: refData } = await octokit.rest.git.getRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: `heads/${input.fromBranch}`,
                });

                // Create new branch
                const { data: newRef } = await octokit.rest.git.createRef({
                    owner: input.owner,
                    repo: input.repo,
                    ref: `refs/heads/${input.branchName}`,
                    sha: refData.object.sha,
                });

                return {
                    name: input.branchName,
                    sha: newRef.object.sha,
                    ref: newRef.ref,
                };
            } catch (error: any) {
                if (error.status === 422) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Branch already exists or invalid branch name',
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to create branch: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // Get file content with SHA for updates
    getFileContent: protectedProcedure
        .input(
            z.object({
                owner: z.string(),
                repo: z.string(),
                path: z.string(),
                ref: z.string().optional(),
            })
        )
        .query(async ({ input, ctx }) => {
            const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);
            
            try {
                const { data } = await octokit.rest.repos.getContent({
                    owner: input.owner,
                    repo: input.repo,
                    path: input.path,
                    ...(input.ref && { ref: input.ref }),
                });

                if (Array.isArray(data) || data.type !== 'file') {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'Path does not point to a file',
                    });
                }

                return {
                    content: Buffer.from(data.content, 'base64').toString('utf8'),
                    sha: data.sha,
                    path: data.path,
                    size: data.size,
                };
            } catch (error: any) {
                if (error.status === 404) {
                    return null; // File doesn't exist
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to get file content: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // Check if project is connected to GitHub repository
    getProjectRepositoryConnection: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ input, ctx }) => {
            // Check if the default branch has GitHub repository connection
            const defaultBranch = await ctx.db.query.branches.findFirst({
                where: and(
                    eq(branches.projectId, input.projectId),
                    eq(branches.isDefault, true)
                ),
            });

            if (!defaultBranch || !defaultBranch.gitRepoUrl) {
                return null; // Not connected
            }

            // Parse GitHub URL to extract owner and repo
            const gitUrlMatch = defaultBranch.gitRepoUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
            if (!gitUrlMatch) {
                return null; // Invalid GitHub URL
            }

            const owner = gitUrlMatch[1];
            const repo = gitUrlMatch[2];
            if (!owner || !repo) {
                return null;
            }

            return {
                isConnected: true,
                repositoryOwner: owner,
                repositoryName: repo,
                repositoryUrl: defaultBranch.gitRepoUrl,
                repositoryId: null, // Not stored in branches table
                fullName: `${owner}/${repo}`,
                connectedAt: defaultBranch.updatedAt,
                branch: defaultBranch.gitBranch || 'main',
            };
        }),

    // Project-Repository Connection Management
    connectProjectToRepository: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                repositoryOwner: z.string(),
                repositoryName: z.string(),
                repositoryId: z.number(),
                branch: z.string().default('main'),
                githubUrl: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                const now = new Date();
                
                // Update the default branch with the git information
                const defaultBranch = await ctx.db.query.branches.findFirst({
                    where: and(
                        eq(branches.projectId, input.projectId),
                        eq(branches.isDefault, true)
                    ),
                });

                if (!defaultBranch) {
                    throw new TRPCError({
                        code: 'PRECONDITION_FAILED',
                        message: 'No default branch found for project',
                    });
                }

                await ctx.db.update(branches)
                    .set({
                        gitBranch: input.branch,
                        gitRepoUrl: input.githubUrl,
                        updatedAt: now,
                    })
                    .where(eq(branches.id, defaultBranch.id));

                console.log(`Connected project ${input.projectId} to GitHub repo ${input.repositoryOwner}/${input.repositoryName}`);

                return {
                    success: true,
                    connection: {
                        projectId: input.projectId,
                        repositoryOwner: input.repositoryOwner,
                        repositoryName: input.repositoryName,
                        repositoryId: input.repositoryId,
                        branch: input.branch,
                        githubUrl: input.githubUrl,
                        connectedAt: now.toISOString(),
                    },
                };
            } catch (error: any) {
                console.error('Failed to connect project to repository:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to connect project to repository: ${error.message}`,
                    cause: error,
                });
            }
        }),

    // Sync project changes to connected repository
    syncProjectChanges: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                commitMessage: z.string().default('Update from Onlook'),
                files: z.array(
                    z.object({
                        path: z.string(),
                        content: z.string(),
                        sha: z.string().optional(),
                    })
                ).optional(), // If not provided, will export current project state
            })
        )
        .mutation(async ({ input, ctx }) => {
            // Get the repository connection from default branch
            const defaultBranch = await ctx.db.query.branches.findFirst({
                where: and(
                    eq(branches.projectId, input.projectId),
                    eq(branches.isDefault, true)
                ),
            });

            if (!defaultBranch || !defaultBranch.gitRepoUrl) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Project is not connected to a GitHub repository. Please export to GitHub first.',
                });
            }

            // Parse GitHub URL to extract owner and repo
            const gitUrlMatch = defaultBranch.gitRepoUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
            if (!gitUrlMatch) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Invalid GitHub repository URL format.',
                });
            }

            const owner = gitUrlMatch[1];
            const repo = gitUrlMatch[2];
            if (!owner || !repo) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Could not parse repository owner and name from URL.',
                });
            }
            
            const branch = defaultBranch.gitBranch || 'main';

            try {
                const { octokit } = await getUserGitHubInstallation(ctx.db, ctx.user.id);

                // Generate current project files if not provided
                let filesToSync = input.files;
                if (!filesToSync || filesToSync.length === 0) {
                    // Import the ProjectExporter dynamically to avoid circular dependencies
                    const { ProjectExporter } = await import('../../../app/project/[id]/_components/top-bar/github-export/utils/project-exporter');
                    filesToSync = await ProjectExporter.exportProjectFiles(input.projectId, {
                        projectName: repo,
                        description: 'Synced changes from Onlook',
                        includeAssets: true,
                        includeMetadata: true,
                    });
                }

                // Use createOrUpdateFiles to sync changes
                const result = await octokit.rest.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: 'onlook-sync.json',
                    message: input.commitMessage,
                    content: Buffer.from(JSON.stringify({
                        syncedAt: new Date().toISOString(),
                        filesCount: filesToSync.length,
                        projectId: input.projectId,
                    })).toString('base64'),
                    branch,
                });

                // Update the commit SHA in our database
                await ctx.db.update(branches)
                    .set({
                        gitCommitSha: result.data.commit.sha,
                        updatedAt: new Date(),
                    })
                    .where(eq(branches.id, defaultBranch.id));

                return {
                    success: true,
                    repositoryOwner: owner,
                    repositoryName: repo,
                    branch,
                    commitSha: result.data.commit.sha,
                    commitUrl: result.data.commit.html_url,
                    filesCount: filesToSync.length,
                };
            } catch (error: any) {
                console.error('Failed to sync project changes:', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to sync changes: ${error.message}`,
                    cause: error,
                });
            }
        }),

});