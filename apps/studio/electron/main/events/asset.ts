import { ipcMain } from 'electron';
import { MainChannels } from '@onlook/models/constants';
import { scanNextJsImages, uploadImage } from '../assets';

export function listenForAssetMessages() {
    ipcMain.handle(MainChannels.SCAN_IMAGES, async (_event, projectRoot: string) => {
        const images = await scanNextJsImages(projectRoot);
        return images;
    });

    ipcMain.handle(
        MainChannels.UPLOAD_IMAGES,
        async (_event, image: string, fileName: string, mimeType: string) => {
            const imagePath = await uploadImage(image, fileName, mimeType);
            return imagePath;
        },
    );
}
