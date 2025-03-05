import type { GitCommit } from '@onlook/git';
import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import { toast } from '@onlook/ui/use-toast';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { ProjectsManager } from './index';

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
        await invokeMainChannel(GitChannels.INIT_REPO, { repoPath: this.project.folderPath });
        await this.createCommit('Initial commit');
        await this.listCommits();
    };

    get latestCommit() {
        if (!this.commits || this.commits.length === 0) {
            return undefined;
        }
        return this.commits[0];
    }

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
        const commits: GitCommit[] | null = await invokeMainChannel(GitChannels.LIST_COMMITS, {
            repoPath: this.project.folderPath,
        });

        if (!commits) {
            return (this.commits = []);
        }
        this.commits = commits;
    };

    checkoutCommit = async (commit: GitCommit) => {
        await invokeMainChannel(GitChannels.CHECKOUT, {
            repoPath: this.project.folderPath,
            commit: commit.oid,
        });
        toast({
            title: 'Restored to backup!',
            description: `Your project has been restored to version "${commit.displayName || commit.message}"`,
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
