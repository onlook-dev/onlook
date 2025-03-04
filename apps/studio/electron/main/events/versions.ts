import { add, addAll, checkout, commit, getCurrentCommit, init, log, status } from '@onlook/git';
import { GitChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';

export function listenForVersionsMessages() {
    ipcMain.handle(GitChannels.INIT_REPO, async (event, { repoPath }: { repoPath: string }) => {
        return init(repoPath);
    });

    ipcMain.handle(
        GitChannels.ADD,
        async (event, { repoPath, filepath }: { repoPath: string; filepath: string }) => {
            return add(repoPath, filepath);
        },
    );

    ipcMain.handle(GitChannels.ADD_ALL, async (event, { repoPath }: { repoPath: string }) => {
        return addAll(repoPath);
    });

    ipcMain.handle(
        GitChannels.COMMIT,
        async (event, { repoPath, message }: { repoPath: string; message: string }) => {
            return commit(repoPath, message);
        },
    );

    ipcMain.handle(GitChannels.LIST_COMMITS, async (event, { repoPath }: { repoPath: string }) => {
        return log(repoPath);
    });

    ipcMain.handle(GitChannels.STATUS, async (event, { repoPath }: { repoPath: string }) => {
        return status(repoPath);
    });

    ipcMain.handle(
        GitChannels.CHECKOUT,
        async (event, { repoPath, commit }: { repoPath: string; commit: string }) => {
            return checkout(repoPath, commit);
        },
    );

    ipcMain.handle(
        GitChannels.GET_CURRENT_COMMIT,
        async (event, { repoPath }: { repoPath: string }) => {
            return getCurrentCommit(repoPath);
        },
    );
}
