import type { GitCommit } from '@onlook/git';
import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import { toast } from '@onlook/ui/use-toast';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { ProjectsManager } from './index';

export enum CreateCommitFailureReason {
    NOT_INITIALIZED = 'NOT_INITIALIZED',
    COMMIT_EMPTY = 'COMMIT_EMPTY',
    FAILED_TO_SAVE = 'FAILED_TO_SAVE',
}

export class VersionsManager {
    commits: GitCommit[] | null = null;
    savedCommits: GitCommit[] = [];

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
    ) {
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
        const isInitialized = await invokeMainChannel(GitChannels.IS_REPO_INITIALIZED, {
            repoPath: this.project.folderPath,
        });

        if (!isInitialized) {
            await invokeMainChannel(GitChannels.INIT_REPO, { repoPath: this.project.folderPath });
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
            if (!commitResult) {
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
            return {
                success: true,
            };
        } else {
            if (showToast) {
                toast({
                    title: 'No changes to commit',
                });
            }
            return {
                success: false,
                errorReason: CreateCommitFailureReason.COMMIT_EMPTY,
            };
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
        const res = await this.createCommit('Save before restoring backup', false);

        // If failed to create commit, don't continue backing up
        // If the commit was empty, this is ok
        if (!res?.success && res?.errorReason !== CreateCommitFailureReason.COMMIT_EMPTY) {
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
        return true;
    };

    renameCommit = async (commit: string, newName: string) => {
        await invokeMainChannel(GitChannels.RENAME_COMMIT, {
            repoPath: this.project.folderPath,
            commit,
            newName,
        });
        await this.listCommits();
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
    };

    removeSavedCommit = async (commit: GitCommit) => {
        this.savedCommits = this.savedCommits.filter((c) => c.oid !== commit.oid);
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
