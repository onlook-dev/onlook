import {
    add,
    addAll,
    checkout,
    commit,
    getCommits,
    getCurrentCommit,
    init,
    isEmptyCommit,
    isRepoInitialized,
    status,
    updateCommitDisplayName,
} from '@onlook/git';
import { GitChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';

export function listenForVersionsMessages() {
    ipcMain.handle(GitChannels.IS_REPO_INITIALIZED, (_, { repoPath }: { repoPath: string }) => {
        return isRepoInitialized(repoPath);
    });

    ipcMain.handle(GitChannels.INIT_REPO, (_, { repoPath }: { repoPath: string }) => {
        return init(repoPath);
    });

    ipcMain.handle(GitChannels.IS_EMPTY_COMMIT, (_, { repoPath }: { repoPath: string }) => {
        return isEmptyCommit(repoPath);
    });

    ipcMain.handle(
        GitChannels.ADD,
        (_, { repoPath, filepath }: { repoPath: string; filepath: string }) => {
            return add(repoPath, filepath);
        },
    );

    ipcMain.handle(GitChannels.ADD_ALL, (_, { repoPath }: { repoPath: string }) => {
        return addAll(repoPath);
    });

    ipcMain.handle(
        GitChannels.COMMIT,
        (_, { repoPath, message }: { repoPath: string; message: string }) => {
            return commit(repoPath, message);
        },
    );

    ipcMain.handle(GitChannels.LIST_COMMITS, (_, { repoPath }: { repoPath: string }) => {
        return getCommits(repoPath);
    });

    ipcMain.handle(GitChannels.STATUS, (_, { repoPath }: { repoPath: string }) => {
        return status(repoPath);
    });

    ipcMain.handle(
        GitChannels.CHECKOUT,
        async (_, { repoPath, commit }: { repoPath: string; commit: string }) => {
            return checkout(repoPath, commit);
        },
    );

    ipcMain.handle(GitChannels.GET_CURRENT_COMMIT, (_, { repoPath }: { repoPath: string }) => {
        return getCurrentCommit(repoPath);
    });

    ipcMain.handle(
        GitChannels.RENAME_COMMIT,
        (
            _,
            { repoPath, commit, newName }: { repoPath: string; commit: string; newName: string },
        ) => {
            return updateCommitDisplayName(repoPath, commit, newName);
        },
    );
}
