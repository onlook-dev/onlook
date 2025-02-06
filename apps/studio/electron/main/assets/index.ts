import { existsSync, promises as fs, unlinkSync } from 'fs';
import * as path from 'path';
import { writeFile } from '../code/files';
import { DefaultSettings } from '@onlook/models/constants';
async function scanImagesDirectory(projectRoot: string): Promise<string[]> {
    const imagesPath = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
    const images: string[] = [];

    try {
        const entries = await fs.readdir(imagesPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const extension = path.extname(entry.name).toLowerCase();
                // Common image extensions
                if (
                    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(extension)
                ) {
                    images.push(
                        `${DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '')}/${entry.name}`,
                    );
                }
            }
        }

        return images;
    } catch (error) {
        console.error('Error scanning images directory:', error);
        return [];
    }
}

export async function scanNextJsImages(projectRoot: string): Promise<string[]> {
    try {
        return await scanImagesDirectory(projectRoot);
    } catch (error) {
        console.error('Error scanning images:', error);
        throw error;
    }
}

export async function uploadImage(projectRoot: string, image: string, fileName: string) {
    try {
        const imageFolder = `${projectRoot}/${DefaultSettings.IMAGE_FOLDER}`;
        const imagePath = path.join(imageFolder, fileName);
        await writeFile(imagePath, image, 'base64');
        return imagePath;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

export async function deleteImage(image: string) {
    try {
        if (existsSync(image)) {
            unlinkSync(image);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}
