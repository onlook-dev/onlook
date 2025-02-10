import { MainChannels } from '@onlook/models/constants';
import { ipcMain } from 'electron';
import { saveImageToProject, scanNextJsImages } from '../assets';

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
}
