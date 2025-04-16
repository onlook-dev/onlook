import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import {
    scanNextJsImages,
    saveImageToProject,
    deleteImageFromProject,
    renameImageInProject,
} from '../assets/images';
import type { ImageContentData } from '@onlook/models/actions';

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
                image,
            }: {
                projectFolder: string;
                image: ImageContentData;
            },
        ) => {
            const imagePath = await saveImageToProject(projectFolder, image);
            return imagePath;
        },
    );

    ipcMain.handle(
        MainChannels.DELETE_IMAGE_FROM_PROJECT,
        async (
            _event,
            {
                projectFolder,
                image,
            }: {
                projectFolder: string;
                image: ImageContentData;
            },
        ) => {
            const imagePath = await deleteImageFromProject(projectFolder, image);
            return imagePath;
        },
    );

    ipcMain.handle(
        MainChannels.RENAME_IMAGE_IN_PROJECT,
        async (
            _event,
            {
                projectFolder,
                image,
                newName,
            }: {
                projectFolder: string;
                image: ImageContentData;
                newName: string;
            },
        ) => {
            const imagePath = await renameImageInProject(projectFolder, image, newName);
            return imagePath;
        },
    );
}
