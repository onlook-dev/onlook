import { sanitizeCommitMessage } from '@/utils/git';
import { type GitCommit } from '@onlook/git';
import { toast } from '@onlook/ui/sonner';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { GitManager } from './git';

export enum CreateCommitFailureReason {
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    FAILED_TO_SAVE = 'FAILED_TO_SAVE',
    COMMIT_IN_PROGRESS = 'COMMIT_IN_PROGRESS',
}

export class VersionsManager {
    commits: GitCommit[] | null = null;
    savedCommits: GitCommit[] = [];
    isSaving = false;
    isLoadingCommits = false;
    private gitManager: GitManager;
    private listCommitsPromise: Promise<GitCommit[]> | null = null;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        this.gitManager = new GitManager(editorEngine);
    }

    initializeRepo = async () => {
        const isInitialized = await this.gitManager.isRepoInitialized();

        if (!isInitialized) {
            await this.gitManager.initRepo();
            await this.createCommit('Initial commit');
        }

        await this.listCommits();
    };

    get latestCommit() {
        if (!this.commits || this.commits.length === 0) {
            return undefined;
        }
        return this.commits[0];
    }

    createCommit = async (
        message: string = 'New Onlook backup',
        showToast = true,
    ): Promise<{
        success: boolean;
        commit: GitCommit | null;
        errorReason?: CreateCommitFailureReason;
    }> => {
        try {
            if (this.isSaving) {
                if (showToast) {
                    toast.error('Backup already in progress');
                }
                return {
                    success: false,
                    commit: null,
                    errorReason: CreateCommitFailureReason.COMMIT_IN_PROGRESS,
                };
            }

            const isInitialized = await this.gitManager.isRepoInitialized();
            if (!isInitialized) {
                await this.gitManager.initRepo();
            }

            const status = await this.gitManager.getStatus();

            if (!status) {
                if (showToast) {
                    toast.error('Could not create backup, please initialize a git repository');
                }

                return {
                    success: false,
                    commit: null,
                    errorReason: CreateCommitFailureReason.NOT_INITIALIZED,
                };
            }

            // Stage all files
            const addResult = await this.gitManager.stageAll();
            if (!addResult.success) {
                if (showToast) {
                    toast.error('Failed to stage files for commit');
                }
                return {
                    success: false,
                    commit: null,
                    errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
                };
            }

            //Check config is set
            await this.gitManager.ensureGitConfig();

            // Create the commit with sanitized message
            const sanitizedMessage = sanitizeCommitMessage(message);
            const commitResult = await this.gitManager.commit(sanitizedMessage);
            if (!commitResult.success) {
                if (showToast) {
                    toast.error('Failed to create backup');
                }
                return {
                    success: false,
                    commit: null,
                    errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
                };
            }

            // Refresh the commits list after creating commit
            const commits = await this.listCommits();

            if (showToast) {
                toast.success('Backup created successfully!', {
                    description: `Created backup: "${sanitizedMessage}"`,
                });
            }
            this.isSaving = true;

            this.editorEngine.posthog.capture('versions_create_commit_success', {
                message: sanitizedMessage,
            });

            const latestCommit = commits.length > 0 ? commits[0] ?? null : null;
            return {
                success: true,
                commit: latestCommit,
            };
        } catch (error) {
            if (showToast) {
                toast.error('Failed to create backup');
            }
            this.editorEngine.posthog.capture('versions_create_commit_failed', {
                message,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                success: false,
                commit: null,
                errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
            };
        } finally {
            this.isSaving = false;
        }
    };

    listCommits = async (): Promise<GitCommit[]> => {
        // Return existing promise if already in progress
        if (this.listCommitsPromise) {
            return this.listCommitsPromise;
        }

        // Create and store the promise
        this.listCommitsPromise = this.performListCommits();

        try {
            const result = await this.listCommitsPromise;
            return result;
        } finally {
            // Clear the promise when complete
            this.listCommitsPromise = null;
        }
    };

    private performListCommits = async (): Promise<GitCommit[]> => {
        try {
            this.isLoadingCommits = true;
            this.commits = await this.gitManager.listCommits();

            // Enhance commits with display names from notes
            if (this.commits.length > 0) {
                const enhancedCommits = await Promise.all(
                    this.commits.map(async (commit) => {
                        const displayName = await this.gitManager.getCommitNote(commit.oid);
                        return {
                            ...commit,
                            displayName: displayName || commit.message,
                        };
                    }),
                );
                this.commits = enhancedCommits;
            }
            return this.commits;
        } catch (error) {
            this.commits = [];
            return [];
        } finally {
            this.isLoadingCommits = false;
        }
    };

    getCommitByOid = async (oid: string): Promise<GitCommit | null> => {
        if (!this.commits) {
            this.commits = await this.gitManager.listCommits();
        }
        const commit = this.commits.find((commit) => commit.oid === oid);
        if (!commit) {
            return null;
        }
        return commit;
    };

    checkoutCommit = async (commit: GitCommit): Promise<boolean> => {
        this.editorEngine.posthog.capture('versions_checkout_commit', {
            commit: commit.displayName || commit.message,
        });
        const res = await this.createCommit('Save before restoring backup', false);

        // If failed to create commit, warn the user but continue
        if (!res?.success) {
            toast.warning('Failed to save before restoring backup');
        }

        const restoreResult = await this.gitManager.restoreToCommit(commit.oid);
        if (!restoreResult.success) {
            toast.error('Failed to restore backup');
            this.editorEngine.posthog.capture('versions_checkout_commit_failed', {
                commit: commit.displayName || commit.message,
                error: restoreResult.error,
            });
            return false;
        }

        toast.success(`Restored to backup!`, {
            description: `Your project has been restored to version "${commit.displayName || commit.message}"`,
        });

        await this.listCommits();

        this.editorEngine.posthog.capture('versions_checkout_commit_success', {
            commit: commit.displayName || commit.message,
        });
        return true;
    };

    renameCommit = async (commitOid: string, newName: string): Promise<boolean> => {
        try {
            this.editorEngine.posthog.capture('versions_rename_commit', {
                commit: commitOid,
                newName,
            });

            const result = await this.gitManager.addCommitNote(commitOid, newName);
            if (!result.success) {
                toast.error('Failed to rename backup');
                return false;
            }

            if (this.commits) {
                const commitIndex = this.commits.findIndex((commit) => commit.oid === commitOid);
                if (commitIndex !== -1) {
                    this.commits[commitIndex]!.displayName = newName;
                }
            }

            const savedCommitIndex = this.savedCommits.findIndex(
                (commit) => commit.oid === commitOid,
            );
            if (savedCommitIndex !== -1) {
                this.savedCommits[savedCommitIndex]!.displayName = newName;
            }

            toast.success('Backup renamed successfully!', {
                description: `Renamed to: "${newName}"`,
            });

            this.editorEngine.posthog.capture('versions_rename_commit_success', {
                commit: commitOid,
                newName,
            });

            return true;
        } catch (error) {
            toast.error('Failed to rename backup');
            this.editorEngine.posthog.capture('versions_rename_commit_failed', {
                commit: commitOid,
                newName,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    };

    saveCommit = async (commit: GitCommit) => {
        if (this.savedCommits.some((c) => c.oid === commit.oid)) {
            toast.error('Backup already saved');
            return;
        }
        this.savedCommits?.push(commit);
        toast.success('Backup bookmarked!');

        this.editorEngine.posthog.capture('versions_save_commit', {
            commit: commit.displayName || commit.message,
        });
    };

    removeSavedCommit = async (commit: GitCommit) => {
        this.savedCommits = this.savedCommits.filter((c) => c.oid !== commit.oid);

        this.editorEngine.posthog.capture('versions_remove_saved_commit', {
            commit: commit.displayName || commit.message,
        });
    };

    saveLatestCommit = async (): Promise<void> => {
        if (!this.commits || this.commits.length === 0) {
            toast.error('No backups found');
            return;
        }
        const latestCommit = this.commits[0];

        if (!latestCommit) {
            toast.error('No backups found');
            return;
        }

        await this.saveCommit(latestCommit);
        toast.success('Latest backup bookmarked!');
    };

    dispose() { }
}
