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

export async function deleteImageFromProject(
    projectRoot: string,
    imageName: string,
): Promise<string> {
    try {
        const imageFolder = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
        const imagePath = path.join(imageFolder, imageName);
        await fs.unlink(imagePath);
        return imagePath;
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}

export async function renameImageInProject(
    projectRoot: string,
    imageName: string,
    newName: string,
): Promise<string> {
    try {
        const imageFolder = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
        if (!imageName || !newName) {
            throw new Error('Image name and new name are required');
        }

        const oldImagePath = path.join(imageFolder, imageName);
        const newImagePath = path.join(imageFolder, newName);

        // Check if source file exists
        try {
            await fs.access(oldImagePath);
        } catch {
            throw new Error(`Source image "${imageName}" does not exist`);
        }

        // Check if destination file already exists
        try {
            await fs.access(newImagePath);
            throw new Error(`A file named "${newName}" already exists`);
        } catch (err) {
            // This is the expected path - file should not exist
        }

        await fs.rename(oldImagePath, newImagePath);

        // 2. Find and update all image references in the project
        const prefix = DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '');
        const oldImageUrl = `/${prefix}/${imageName}`;
        const newImageUrl = `/${prefix}/${newName}`;

        // Search through all .tsx and .jsx files in the project
        const sourceFiles = await findSourceFiles(projectRoot);
        for (const file of sourceFiles) {
            let content = await fs.readFile(file, 'utf8');

            // Update image references in src attributes and background URLs
            const hasChanges = content.includes(oldImageUrl);
            if (hasChanges) {
                content = content.replace(
                    new RegExp(oldImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    newImageUrl,
                );
                await fs.writeFile(file, content, 'utf8');
            }
        }

        return newImagePath;
    } catch (error) {
        console.error('Error renaming image:', error);
        throw error;
    }
}

async function findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...(await findSourceFiles(fullPath)));
        } else if (
            entry.isFile() &&
            (entry.name.endsWith('.tsx') ||
                entry.name.endsWith('.jsx') ||
                entry.name.endsWith('.ts'))
        ) {
            files.push(fullPath);
        }
    }

    return files;
}
