import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { scanProjectFiles, getProjectFiles } from '../code/files-scan';

export function listenForFileMessages() {
    // Scan all project files and return a tree structure
    ipcMain.handle(MainChannels.SCAN_FILES, async (_event, projectRoot: string) => {
        const files = await scanProjectFiles(projectRoot);
        return files;
    });

    // Get a flat list of all files with the given extensions
    ipcMain.handle(
        MainChannels.GET_PROJECT_FILES,
        async (
            _event,
            { projectRoot, extensions }: { projectRoot: string; extensions?: string[] },
        ) => {
            return await getProjectFiles(projectRoot, extensions);
        },
    );
}
