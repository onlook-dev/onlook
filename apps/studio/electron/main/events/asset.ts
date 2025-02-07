import { ipcMain } from 'electron';
import { MainChannels } from '@onlook/models/constants';
import { scanNextJsImages, saveImageToProject } from '../assets';

export function listenForAssetMessages() {
    ipcMain.handle(MainChannels.SCAN_IMAGES_IN_PROJECT, async (_event, projectRoot: string) => {
        const images = await scanNextJsImages(projectRoot);
        return images;
    });

    ipcMain.handle(
        MainChannels.SAVE_IMAGE_TO_PROJECT,
        async (_event, image: string, fileName: string, mimeType: string) => {
            const imagePath = await saveImageToProject(image, fileName, mimeType);
            return imagePath;
        },
    );
}
