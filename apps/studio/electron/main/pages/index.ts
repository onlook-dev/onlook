import { ipcMain } from 'electron';
import { scanNextJsPages } from './helper';
import { MainChannels } from '@onlook/models/constants';
import log from 'electron-log';

export function setupPagesHandler() {
    ipcMain.handle(MainChannels.SCAN_PAGES, async (_event, projectRoot: string) => {
        try {
            log.info('started Scanning pages from:', projectRoot);
            const pages = await scanNextJsPages(projectRoot);
            log.info('Pages found:', pages.length);
            return pages;
        } catch (error) {
            log.info('Error scanning pages:', error);
            throw error;
        }
    });
}
