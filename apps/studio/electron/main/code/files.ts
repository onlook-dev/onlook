import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import prettier from 'prettier';
import * as writeFileAtomic from 'write-file-atomic';
import run from '../run';

export async function readFile(filePath: string): Promise<string | null> {
    try {
        const fullPath = path.resolve(filePath);
        const data = await fs.readFile(fullPath, 'utf8');
        return data;
    } catch (error: any) {
        // Return null if file doesn't exist, otherwise throw the error
        if (error.code === 'ENOENT') {
            return null;
        }
        console.error('Error reading file:', error);
        throw error;
    }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        if (!content || content.trim() === '') {
            throw new Error(`New content is empty: ${filePath}`);
        }
        const fullPath = path.resolve(filePath);
        const isNewFile = !existsSync(fullPath);

        // Ensure parent directory exists
        const parentDir = path.dirname(fullPath);
        await fs.mkdir(parentDir, { recursive: true });

        const tempPath = `${fullPath}.tmp`;
        writeFileAtomic.sync(tempPath, content, 'utf8');
        await fs.rename(tempPath, fullPath);

        if (isNewFile) {
            console.log('New file created:', fullPath);
            run.addFileToWatcher(fullPath);
        }
    } catch (error: any) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        const config = (await prettier.resolveConfig(filePath)) || {};
        const formattedContent = await prettier.format(content, {
            ...config,
            filepath: filePath,
            plugins: [],
        });
        return formattedContent;
    } catch (error: any) {
        console.error('Error formatting file:', error);
        return content;
    }
}
