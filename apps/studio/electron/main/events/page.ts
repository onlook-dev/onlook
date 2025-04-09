import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import {
    createNextJsPage,
    deleteNextJsPage,
    detectRouterType,
    duplicateNextJsPage,
    renameNextJsPage,
    scanNextJsPages,
} from '../pages';
import type { Metadata } from '@onlook/models';
import { updateNextJsPage } from '../pages/update';
import path from 'path';

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

    ipcMain.handle(
        MainChannels.RENAME_PAGE,
        async (
            _event,
            {
                projectRoot,
                oldPath,
                newName,
            }: { projectRoot: string; oldPath: string; newName: string },
        ) => {
            return await renameNextJsPage(projectRoot, oldPath, newName);
        },
    );

    ipcMain.handle(
        MainChannels.DUPLICATE_PAGE,
        async (
            _event,
            {
                projectRoot,
                sourcePath,
                targetPath,
            }: { projectRoot: string; sourcePath: string; targetPath: string },
        ) => {
            return await duplicateNextJsPage(projectRoot, sourcePath, targetPath);
        },
    );

    ipcMain.handle(
        MainChannels.UPDATE_PAGE_METADATA,
        async (
            _event,
            {
                projectRoot,
                pagePath,
                metadata,
                isRoot,
            }: { projectRoot: string; pagePath: string; metadata: Metadata; isRoot: boolean },
        ) => {
            let fullPath = pagePath;
            const routerConfig = await detectRouterType(projectRoot);
            if (routerConfig) {
                if (routerConfig.type === 'app') {
                    if (!isRoot) {
                        fullPath = path.join(fullPath, 'page.tsx');
                    }
                } else {
                    return;
                }
            }

            return await updateNextJsPage(projectRoot, fullPath, metadata);
        },
    );
}
