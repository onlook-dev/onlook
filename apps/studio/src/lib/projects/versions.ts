import type { GitCommit } from '@onlook/git';
import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import { toast } from '@onlook/ui/use-toast';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel, sendAnalytics } from '../utils';

export enum CreateCommitFailureReason {
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    COMMIT_EMPTY = 'COMMIT_EMPTY',
    FAILED_TO_SAVE = 'FAILED_TO_SAVE',
    COMMIT_IN_PROGRESS = 'COMMIT_IN_PROGRESS',
}

export class VersionsManager {
    commits: GitCommit[] | null = null;
    savedCommits: GitCommit[] = [];
    isSaving = false;

    constructor(private project: Project) {
        makeAutoObservable(this);
    }

    initializeRepo = async () => {
        const isInitialized = await invokeMainChannel(GitChannels.IS_REPO_INITIALIZED, {
            repoPath: this.project.folderPath,
        });
        if (!isInitialized) {
            await invokeMainChannel(GitChannels.INIT_REPO, { repoPath: this.project.folderPath });
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
        errorReason?: CreateCommitFailureReason;
    }> => {
        try {
            if (this.isSaving) {
                toast({
                    title: 'Backup already in progress',
                });
                return {
                    success: false,
                    errorReason: CreateCommitFailureReason.COMMIT_IN_PROGRESS,
                };
            }

            this.isSaving = true;

            sendAnalytics('versions create commit', {
                message,
            });
            const isInitialized = await invokeMainChannel(GitChannels.IS_REPO_INITIALIZED, {
                repoPath: this.project.folderPath,
            });

            if (!isInitialized) {
                await invokeMainChannel(GitChannels.INIT_REPO, {
                    repoPath: this.project.folderPath,
                });
            }

            const isEmpty = await invokeMainChannel(GitChannels.IS_EMPTY_COMMIT, {
                repoPath: this.project.folderPath,
            });

            if (!isEmpty) {
                await invokeMainChannel(GitChannels.ADD_ALL, { repoPath: this.project.folderPath });
                const commitResult = await invokeMainChannel(GitChannels.COMMIT, {
                    repoPath: this.project.folderPath,
                    message,
                });
                this.isSaving = false;
                if (!commitResult) {
                    sendAnalytics('versions create commit failed', {
                        message,
                        errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
                    });
                    return {
                        success: false,
                        errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
                    };
                }
                if (showToast) {
                    toast({
                        title: 'Backup created!',
                        description: 'You can now restore to this version',
                    });
                }
                await this.listCommits();

                sendAnalytics('versions create commit success', {
                    message,
                });
                return {
                    success: true,
                };
            } else {
                this.isSaving = false;
                if (showToast) {
                    toast({
                        title: 'No changes to commit',
                    });
                }
                sendAnalytics('versions create commit failed', {
                    message,
                    errorReason: CreateCommitFailureReason.COMMIT_EMPTY,
                });
                return {
                    success: false,
                    errorReason: CreateCommitFailureReason.COMMIT_EMPTY,
                };
            }
        } catch (error) {
            this.isSaving = false;
            console.error('Failed to create commit', error);
            return {
                success: false,
                errorReason: CreateCommitFailureReason.FAILED_TO_SAVE,
            };
        } finally {
            this.isSaving = false;
        }
    };
    listCommits = async () => {
        const commits: GitCommit[] | null = await invokeMainChannel(GitChannels.LIST_COMMITS, {
            repoPath: this.project.folderPath,
        });

        if (!commits) {
            return (this.commits = []);
        }
        this.commits = commits;
    };

    checkoutCommit = async (commit: GitCommit): Promise<boolean> => {
        sendAnalytics('versions checkout commit', {
            commit: commit.displayName || commit.message,
        });
        const res = await this.createCommit('Save before restoring backup', false);

        // If failed to create commit, don't continue backing up
        // If the commit was empty, this is ok
        if (!res?.success && res?.errorReason !== CreateCommitFailureReason.COMMIT_EMPTY) {
            sendAnalytics('versions checkout commit failed', {
                commit: commit.displayName || commit.message,
                errorReason: res?.errorReason,
            });
            return false;
        }

        await invokeMainChannel(GitChannels.CHECKOUT, {
            repoPath: this.project.folderPath,
            commit: commit.oid,
        });
        toast({
            title: 'Restored to backup!',
            description: `Your project has been restored to version "${commit.displayName || commit.message}"`,
        });
        await this.listCommits();

        sendAnalytics('versions checkout commit success', {
            commit: commit.displayName || commit.message,
        });
        return true;
    };

    renameCommit = async (commit: string, newName: string) => {
        await invokeMainChannel(GitChannels.RENAME_COMMIT, {
            repoPath: this.project.folderPath,
            commit,
            newName,
        });
        await this.listCommits();
        sendAnalytics('versions rename commit', {
            commit: commit,
            newName,
        });
    };

    saveCommit = async (commit: GitCommit) => {
        if (this.savedCommits.some((c) => c.oid === commit.oid)) {
            toast({
                title: 'Backup already saved',
            });
            return;
        }
        this.savedCommits?.push(commit);
        toast({
            title: 'Backup bookmarked!',
            description: 'You can now quickly restore to this version',
        });

        sendAnalytics('versions save commit', {
            commit: commit.displayName || commit.message,
        });
    };

    removeSavedCommit = async (commit: GitCommit) => {
        this.savedCommits = this.savedCommits.filter((c) => c.oid !== commit.oid);

        sendAnalytics('versions remove saved commit', {
            commit: commit.displayName || commit.message,
        });
    };

    saveLatestCommit = async (): Promise<void> => {
        if (!this.commits || this.commits.length === 0) {
            toast({
                title: 'No backups found',
                description: 'Please create a backup first',
            });
            return;
        }
        const latestCommit = this.commits[0];

        await this.saveCommit(latestCommit);
        toast({
            title: 'Latest backup bookmarked!',
            description: 'You can now quickly restore to this version',
        });
    };

    updateProject(project: Project) {
        this.project = project;
    }

    dispose() {}
}
