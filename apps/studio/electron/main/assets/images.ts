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
    if (!imageName || !newName) {
        throw new Error('Image name and new name are required');
    }

    const imageFolder = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
    const oldImagePath = path.join(imageFolder, imageName);
    const newImagePath = path.join(imageFolder, newName);

    try {
        await validateRename(oldImagePath, newImagePath);
        await fs.rename(oldImagePath, newImagePath);

        await updateImageReferences(projectRoot, imageName, newName);
        return newImagePath;
    } catch (error) {
        console.error('Error renaming image:', error);
        throw error;
    }
}

const MAX_FILENAME_LENGTH = 255;
const VALID_FILENAME_REGEX = /^[a-zA-Z0-9-_. ]+$/;

async function validateRename(oldImagePath: string, newImagePath: string): Promise<void> {
    try {
        await fs.access(oldImagePath);
    } catch (err) {
        throw new Error(`Source image does not exist`);
    }

    const newFileName = path.basename(newImagePath);

    if (newFileName.length > MAX_FILENAME_LENGTH) {
        throw new Error(`File name is too long (max ${MAX_FILENAME_LENGTH} characters)`);
    }

    if (!VALID_FILENAME_REGEX.test(newFileName)) {
        throw new Error(
            'File name can only contain letters, numbers, spaces, hyphens, underscores, and periods',
        );
    }

    try {
        await fs.access(newImagePath);
        throw new Error(`A file with this name already exists`);
    } catch (err: any) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

async function updateImageReferences(
    projectRoot: string,
    oldName: string,
    newName: string,
): Promise<void> {
    const prefix = DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '');
    const oldImageUrl = `/${prefix}/${oldName}`;
    const newImageUrl = `/${prefix}/${newName}`;
    const pattern = new RegExp(oldImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

    const sourceFiles = await findSourceFiles(projectRoot);
    await Promise.all(
        sourceFiles.map(async (file) => {
            const content = await fs.readFile(file, 'utf8');
            if (!content.includes(oldImageUrl)) {
                return;
            }
            const updatedContent = content.replace(pattern, newImageUrl);
            await fs.writeFile(file, updatedContent, 'utf8');
        }),
    );
}

async function findSourceFiles(
    dirPath: string,
    maxDepth: number = 10,
    currentDepth: number = 0,
): Promise<string[]> {
    if (currentDepth >= maxDepth) {
        console.warn(`Max directory depth (${maxDepth}) reached at: ${dirPath}`);
        return [];
    }

    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...(await findSourceFiles(fullPath, maxDepth, currentDepth + 1)));
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
