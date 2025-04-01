import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import prettier from 'prettier';

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

export async function writeFile(
    filePath: string,
    content: string,
    encoding: 'utf8' | 'base64' = 'utf8',
): Promise<void> {
    if (!filePath) {
        throw new Error('File path is required');
    }

    try {
        const fullPath = path.resolve(filePath);
        const isNewFile = !existsSync(fullPath);

        let fileContent: string | Buffer = content;
        if (encoding === 'base64') {
            try {
                // Strip data URL prefix if present and validate base64
                const base64Data = content.replace(/^data:[^,]+,/, '');
                if (!isValidBase64(base64Data)) {
                    throw new Error('Invalid base64 content');
                }
                fileContent = Buffer.from(base64Data, 'base64');
            } catch (e: any) {
                throw new Error(`Invalid base64 content: ${e.message}`);
            }
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(fullPath);
        await fs.mkdir(parentDir, { recursive: true });
        await fs.writeFile(fullPath, fileContent, { encoding });

        if (isNewFile) {
            console.log('New file created:', fullPath);
        }
    } catch (error: any) {
        const errorMessage = `Failed to write to ${filePath}: ${error.message}`;
        console.error(errorMessage);
        throw error;
    }
}

// Helper function to validate base64 strings
function isValidBase64(str: string): boolean {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
        return false;
    }
}

export async function formatContent(filePath: string, content: string): Promise<string> {
    try {
        const config = (await prettier.resolveConfig(filePath)) || {};
        const formattedContent = await prettier.format(content, {
            ...config,
            filepath: filePath,
            plugins: [], // This prevents us from using plugins we don't have installed
        });
        return formattedContent;
    } catch (error: any) {
        console.error('Error formatting file:', error);
        return content;
    }
}
