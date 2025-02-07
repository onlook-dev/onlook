import { promises as fs, readFileSync } from 'fs';
import * as path from 'path';
import { writeFile } from '../code/files';
import { DefaultSettings } from '@onlook/models/constants';
import type { ImageContentData } from '@onlook/models/actions';

async function scanImagesDirectory(projectRoot: string): Promise<ImageContentData[]> {
    const imagesPath = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
    const images: ImageContentData[] = [];

    try {
        const entries = await fs.readdir(imagesPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isFile()) {
                const extension = path.extname(entry.name).toLowerCase();
                // Common image extensions
                if (
                    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'].includes(extension)
                ) {
                    const imagePath = path.join(imagesPath, entry.name);
                    const image = readFileSync(imagePath, { encoding: 'base64' });

                    const mimeTypes: { [key: string]: string } = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.png': 'image/png',
                        '.gif': 'image/gif',
                        '.webp': 'image/webp',
                        '.svg': 'image/svg+xml',
                        '.ico': 'image/x-icon',
                    };

                    images.push({
                        fileName: entry.name,
                        content: `data:${mimeTypes[extension]};base64,${image}`,
                        mimeType: mimeTypes[extension],
                    });
                }
            }
        }

        return images;
    } catch (error) {
        console.error('Error scanning images directory:', error);
        return [];
    }
}

export async function scanNextJsImages(projectRoot: string): Promise<ImageContentData[]> {
    try {
        return await scanImagesDirectory(projectRoot);
    } catch (error) {
        console.error('Error scanning images:', error);
        throw error;
    }
}

export async function saveImageToProject(
    projectRoot: string,
    image: string,
    fileName: string,
): Promise<string> {
    try {
        const imageFolder = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
        const imagePath = path.join(imageFolder, fileName);
        await writeFile(imagePath, image, 'base64');
        return imagePath;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}
