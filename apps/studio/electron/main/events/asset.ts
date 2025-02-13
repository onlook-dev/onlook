import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import {
    scanNextJsImages,
    saveImageToProject,
    deleteImageFromProject,
    renameImageInProject,
} from '../assets';

export function listenForAssetMessages() {
    ipcMain.handle(MainChannels.SCAN_IMAGES_IN_PROJECT, async (_event, projectRoot: string) => {
        const images = await scanNextJsImages(projectRoot);
        return images;
    });

    ipcMain.handle(
        MainChannels.SAVE_IMAGE_TO_PROJECT,
        async (
            _event,
            {
                projectFolder,
                content,
                fileName,
            }: {
                projectFolder: string;
                content: string;
                fileName: string;
            },
        ) => {
            const imagePath = await saveImageToProject(projectFolder, content, fileName);
            return imagePath;
        },
    );

    ipcMain.handle(
        MainChannels.DELETE_IMAGE_FROM_PROJECT,
        async (_event, projectRoot: string, imageName: string) => {
            const imagePath = await deleteImageFromProject(projectRoot, imageName);
            return imagePath;
        },
    );

    ipcMain.handle(
        MainChannels.RENAME_IMAGE_IN_PROJECT,
        async (_event, projectRoot: string, imageName: string, newName: string) => {
            const imagePath = await renameImageInProject(projectRoot, imageName, newName);
            return imagePath;
        },
    );
}
