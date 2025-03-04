import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import { toast } from '@onlook/ui/use-toast';
import type { ReadCommitResult } from 'isomorphic-git';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { ProjectsManager } from './index';

export class VersionsManager {
    commits: ReadCommitResult[] | null = null;
    savedCommits: ReadCommitResult[] = [];

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
    ) {
        makeAutoObservable(this);
    }

    initializeRepo = async () => {
        await invokeMainChannel(GitChannels.INIT_REPO, { repoPath: this.project.folderPath });
        await this.createCommit('Initial commit');
        await this.listCommits();
    };

    createCommit = async (message: string = 'New backup') => {
        await invokeMainChannel(GitChannels.ADD_ALL, { repoPath: this.project.folderPath });
        await invokeMainChannel(GitChannels.COMMIT, { repoPath: this.project.folderPath, message });
        await this.listCommits();
        toast({
            title: 'Backup created!',
            description: 'You can now restore to this version',
        });
    };

    listCommits = async () => {
        const commits: ReadCommitResult[] | null = await invokeMainChannel(
            GitChannels.LIST_COMMITS,
            { repoPath: this.project.folderPath },
        );

        if (!commits) {
            return (this.commits = []);
        }
        this.commits = commits;
    };

    checkoutCommit = async (commit: string) => {
        await invokeMainChannel(GitChannels.CHECKOUT, {
            repoPath: this.project.folderPath,
            commit,
        });
        await this.listCommits();
    };

    renameCommit = async (commit: string, newName: string) => {
        await invokeMainChannel(GitChannels.RENAME_COMMIT, {
            repoPath: this.project.folderPath,
            commit,
            newName,
        });
        await this.listCommits();
    };

    saveCommit = async (commit: ReadCommitResult) => {
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

    removeSavedCommit = async (commit: ReadCommitResult) => {
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
