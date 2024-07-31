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
        await fs.writeFile(fullPath, content, 'utf8');
    } catch (error: any) {
        console.error('Error writing to file:', error);
        throw error;
    }
}

export async function formatFile(filePath: string): Promise<void> {
    try {
        const config = await prettier.resolveConfig(".prettierrc");
        const data = await fs.readFile(filePath, 'utf8');
        const formattedData = await prettier.format(data, { ...config, filepath: filePath });
        await fs.writeFile(filePath, formattedData, "utf-8");
    } catch (error: any) {
        console.error('Error formatting file:', error);
        throw error;
    }
}
