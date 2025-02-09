import { ipcMain } from 'electron';
import { MainChannels } from '@onlook/models/constants';
import { createNextJsPage, scanNextJsPages } from '../pages';

export function listenForPageMessages() {
    ipcMain.handle(MainChannels.SCAN_PAGES, async (_event, projectRoot: string) => {
        const pages = await scanNextJsPages(projectRoot);
        return pages;
    });

    ipcMain.handle(
        MainChannels.CREATE_PAGE,
        async (_event, { projectRoot, pagePath }: { projectRoot: string; pagePath: string }) => {
            try {
                return await createNextJsPage(projectRoot, pagePath);
            } catch (error) {
                throw error instanceof Error ? error : new Error('Failed to create page');
            }
        },
    );
}
