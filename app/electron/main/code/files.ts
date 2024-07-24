import { promises as fs } from 'fs';
import * as path from 'path';

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
