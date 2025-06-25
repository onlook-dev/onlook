import { sendAnalytics } from "@/utils/analytics";
import type { GitCommit } from "@onlook/git";
import { toast } from "@onlook/ui/sonner";
import { makeAutoObservable } from 'mobx';
import type { ProjectManager } from "./manager";

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

    constructor(
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    initializeRepo = async () => {
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
    } | undefined> => {
        try {
            if (this.isSaving) {
                if (showToast) {
                    toast.error('Backup already in progress');
                }
                return {
                    success: false,
                    errorReason: CreateCommitFailureReason.COMMIT_IN_PROGRESS,
                };
            }

            this.isSaving = true;

            sendAnalytics('versions create commit', {
                message,
            });


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
        return [];
    };

    checkoutCommit = async (commit: GitCommit): Promise<boolean> => {
        // TODO: Implement
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

        toast.success(`Restored to backup!`);
        await this.listCommits();

        sendAnalytics('versions checkout commit success', {
            commit: commit.displayName || commit.message,
        });
        return true;
    };

    renameCommit = async (commit: string, newName: string) => {
        // TODO: Implement
        await this.listCommits();
        sendAnalytics('versions rename commit', {
            commit: commit,
            newName,
        });
    };

    saveCommit = async (commit: GitCommit) => {
        if (this.savedCommits.some((c) => c.oid === commit.oid)) {
            toast.error('Backup already saved');
            return;
        }
        this.savedCommits?.push(commit);
        toast.success('Backup bookmarked!');

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