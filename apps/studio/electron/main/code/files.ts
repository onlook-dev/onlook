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
        const fullPath = path.resolve(filePath);
        try {
            await fs.access(fullPath);
        } catch {
            throw new Error(`File does not exist: ${fullPath}`);
        }
        await fs.writeFile(fullPath, content, 'utf8');
    } catch (error: any) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        const config = (await prettier.resolveConfig(filePath)) || {};
        // Remove plugins because they may not be installed
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
