import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { createNextJsPage, deleteNextJsPage, scanNextJsPages } from '../pages';

export function listenForPageMessages() {
    ipcMain.handle(MainChannels.SCAN_PAGES, async (_event, projectRoot: string) => {
        const pages = await scanNextJsPages(projectRoot);
        return pages;
    });

    ipcMain.handle(
        MainChannels.CREATE_PAGE,
        async (_event, { projectRoot, pagePath }: { projectRoot: string; pagePath: string }) => {
            return await createNextJsPage(projectRoot, pagePath);
        },
    );

    ipcMain.handle(
        MainChannels.DELETE_PAGE,
        async (
            _event,
            {
                projectRoot,
                pagePath,
                isDir,
            }: { projectRoot: string; pagePath: string; isDir: boolean },
        ) => {
            return await deleteNextJsPage(projectRoot, pagePath, isDir);
        },
    );
}
