import type { ImageContentData } from '@onlook/models/actions';
import { DefaultSettings } from '@onlook/models/constants';
import { promises as fs } from 'fs';
import mime from 'mime-lite';
import path from 'path';
import { detectRouterType } from '../pages';

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
const MAX_FILENAME_LENGTH = 255;
const VALID_FILENAME_REGEX = /^[a-zA-Z0-9-_. ]+$/;

async function getImageFolderPath(projectRoot: string, folder?: string): Promise<string> {
    if (folder) {
        return path.join(projectRoot, folder);
    }

    const routerType = await detectRouterType(projectRoot);
    return routerType?.basePath
        ? routerType.basePath
        : path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
}

// Helper function to validate and process image file
async function processImageFile(filePath: string, folder: string): Promise<ImageContentData> {
    const image = await fs.readFile(filePath, { encoding: 'base64' });
    const mimeType = mime.getType(filePath) || 'application/octet-stream';

    return {
        fileName: path.basename(filePath),
        content: `data:${mimeType};base64,${image}`,
        mimeType,
        folder,
    };
}

async function scanImagesDirectory(projectRoot: string): Promise<ImageContentData[]> {
    const images: ImageContentData[] = [];

    const publicImagesPath = path.join(projectRoot, DefaultSettings.IMAGE_FOLDER);
    try {
        const publicEntries = await fs.readdir(publicImagesPath, { withFileTypes: true });
        for (const entry of publicEntries) {
            if (
                entry.isFile() &&
                SUPPORTED_IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
            ) {
                const imagePath = path.join(publicImagesPath, entry.name);
                images.push(await processImageFile(imagePath, DefaultSettings.IMAGE_FOLDER));
            }
        }
    } catch (error) {
        console.error('Error scanning public images directory:', error);
    }

    // Scan app directory images
    const appDir = path.join(projectRoot, 'app');
    try {
        const appImages = await findImagesInDirectory(appDir);
        for (const imagePath of appImages) {
            images.push(await processImageFile(imagePath, 'app'));
        }
    } catch (error) {
        console.error('Error scanning app directory images:', error);
    }

    return images;
}

async function findImagesInDirectory(dirPath: string): Promise<string[]> {
    const imageFiles: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            imageFiles.push(...(await findImagesInDirectory(fullPath)));
        } else if (
            entry.isFile() &&
            SUPPORTED_IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
        ) {
            imageFiles.push(fullPath);
        }
    }

    return imageFiles;
}

export async function scanNextJsImages(projectRoot: string): Promise<ImageContentData[]> {
    try {
        return await scanImagesDirectory(projectRoot);
    } catch (error) {
        console.error('Error scanning images:', error);
        throw error;
    }
}

async function getUniqueFileName(imageFolder: string, fileName: string): Promise<string> {
    let imagePath = path.join(imageFolder, fileName);
    let counter = 1;

    const fileExt = path.extname(fileName);
    const baseName = path.basename(fileName, fileExt);

    // Keep trying until we find a unique name
    while (true) {
        try {
            await fs.access(imagePath);
            // If file exists, try with a new suffix
            const newFileName = `${baseName} (${counter})${fileExt}`;
            imagePath = path.join(imageFolder, newFileName);
            counter++;
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                // File doesn't exist, we can use this path
                return path.basename(imagePath);
            }
            throw err;
        }
    }
}

export async function saveImageToProject(
    projectRoot: string,
    image: ImageContentData,
): Promise<string> {
    try {
        const imageFolder = await getImageFolderPath(projectRoot, image.folder);
        const uniqueFileName = await getUniqueFileName(imageFolder, image.fileName);
        const imagePath = path.join(imageFolder, uniqueFileName);

        if (!image.content) {
            throw new Error('Can not save image with empty content');
        }

        const buffer = Buffer.from(image.content.replace(/^data:[^,]+,/, ''), 'base64');
        await fs.writeFile(imagePath, buffer);
        return imagePath;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

export async function deleteImageFromProject(
    projectRoot: string,
    image: ImageContentData,
): Promise<string> {
    try {
        const imageFolder = await getImageFolderPath(projectRoot, image.folder);
        const imagePath = path.join(imageFolder, image.fileName);
        await fs.unlink(imagePath);
        return imagePath;
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}

export async function renameImageInProject(
    projectRoot: string,
    image: ImageContentData,
    newName: string,
): Promise<string> {
    if (!image.fileName || !newName) {
        throw new Error('Image name and new name are required');
    }

    const imageFolder = await getImageFolderPath(projectRoot, image.folder);
    const oldImagePath = path.join(imageFolder, image.fileName);
    const newImagePath = path.join(imageFolder, newName);

    try {
        await validateRename(oldImagePath, newImagePath);
        await fs.rename(oldImagePath, newImagePath);
        await updateImageReferences(projectRoot, image.fileName, newName);
        return newImagePath;
    } catch (error) {
        console.error('Error renaming image:', error);
        throw error;
    }
}

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
