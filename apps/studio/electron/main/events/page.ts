import { ipcMain } from 'electron';
import { MainChannels } from '@onlook/models/constants';
import { scanNextJsPages } from '../pages';

export function listenForPageMessages() {
    ipcMain.handle(MainChannels.SCAN_PAGES, async (_event, projectRoot: string) => {
        const pages = await scanNextJsPages(projectRoot);
        return pages;
    });
}
