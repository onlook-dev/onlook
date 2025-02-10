import type { ImageContentData } from '@onlook/models/actions';
import { DefaultSettings } from '@onlook/models/constants';
import { promises as fs, readFileSync } from 'fs';
import mime from 'mime-lite';
import path from 'path';

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
                    const mimeType = mime.getType(imagePath);
                    if (!mimeType) {
                        console.error(`Failed to get mime type for ${imagePath}`);
                        continue;
                    }
                    images.push({
                        fileName: entry.name,
                        content: `data:${mimeType};base64,${image}`,
                        mimeType,
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
    projectFolder: string,
    content: string,
    fileName: string,
): Promise<string> {
    try {
        const imageFolder = path.join(projectFolder, DefaultSettings.IMAGE_FOLDER);
        const imagePath = path.join(imageFolder, fileName);

        try {
            await fs.access(imagePath);
            throw new Error(`File ${fileName} already exists`);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                const buffer = Buffer.from(content, 'base64');
                await fs.writeFile(imagePath, buffer);
                return imagePath;
            }
            throw err;
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}
