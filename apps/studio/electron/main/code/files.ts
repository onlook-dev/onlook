import { promises as fs } from 'fs';
import * as path from 'path';
import prettier from 'prettier';

export async function readFile(filePath: string): Promise<string> {
    try {
        const fullPath = path.resolve(filePath);
        const data = await fs.readFile(fullPath, 'utf8');
        return data;
    } catch (error: any) {
        console.error('Error reading file:', error);
        throw error;
    }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        if (!content || content.trim() === '') {
            throw new Error(`Content is empty: ${filePath}`);
        }
        const fullPath = path.resolve(filePath);
        try {
            await fs.access(fullPath);
        } catch {
            throw new Error(`File does not exist: ${fullPath}`);
        }
        const tempPath = `${fullPath}.tmp`;
        await fs.writeFile(tempPath, content, 'utf8');
        await fs.rename(tempPath, fullPath);
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
