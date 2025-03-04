import { GitChannels } from '@onlook/models/constants';
import { type Project } from '@onlook/models/projects';
import type { ReadCommitResult } from 'isomorphic-git';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { ProjectsManager } from './index';

export class VersionsManager {
    commits: ReadCommitResult[] | null = null;
    currentCommit: string | null = null;

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
    ) {
        makeAutoObservable(this);
    }

    saveCommit = async () => {
        await invokeMainChannel(GitChannels.ADD_ALL, { repoPath: 'test' });
        await invokeMainChannel(GitChannels.COMMIT, { repoPath: 'test', message: 'New backup' });
        await this.listCommits();
        await this.getCurrentCommit();
    };

    listCommits = async () => {
        const commits: ReadCommitResult[] | null = await invokeMainChannel(
            GitChannels.LIST_COMMITS,
            { repoPath: 'test' },
        );

        if (!commits) {
            return (this.commits = []);
        }
        this.commits = commits;
    };

    getCurrentCommit = async () => {
        const commit: string | null = await invokeMainChannel(GitChannels.GET_CURRENT_COMMIT, {
            repoPath: 'test',
        });
        this.currentCommit = commit;
    };

    checkoutCommit = async (commit: string) => {
        await invokeMainChannel(GitChannels.CHECKOUT, { repoPath: 'test', commit: commit });
        await this.listCommits();
        this.currentCommit = commit;
    };

    renameCommit = async (commit: string, newName: string) => {
        // await invokeMainChannel(GitChannels.RENAME_COMMIT, { repoPath: 'test', commit: commit, newName: newName });
        // await this.listCommits();
    };

    updateProject(project: Project) {
        this.project = project;
    }

    dispose() {}
}
