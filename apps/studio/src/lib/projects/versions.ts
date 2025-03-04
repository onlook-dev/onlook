import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import type { ReadCommitResult } from 'isomorphic-git';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { ProjectsManager } from './index';

export class VersionsManager {
    commits: ReadCommitResult[] | null = null;
    savedCommits: ReadCommitResult[] | null = null;

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
    ) {
        makeAutoObservable(this);
    }

    initializeRepo = async () => {
        await invokeMainChannel(GitChannels.INIT_REPO, { repoPath: this.project.folderPath });
        await this.saveCommit('Initial commit');
        await this.listCommits();
    };

    saveCommit = async (message: string = 'New backup') => {
        await invokeMainChannel(GitChannels.ADD_ALL, { repoPath: this.project.folderPath });
        await invokeMainChannel(GitChannels.COMMIT, { repoPath: this.project.folderPath, message });
        await this.listCommits();
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

    updateProject(project: Project) {
        this.project = project;
    }

    dispose() {}
}
