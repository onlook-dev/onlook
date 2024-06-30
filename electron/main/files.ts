import { exec } from 'child_process';
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

export async function readBlock(filePath: string, startRow: number, startColumn: number, endRow: number, endColumn: number): Promise<string> {
    try {
        const fileContent = await readFile(filePath);
        const lines = fileContent.split('\n');
        const selectedText = lines.slice(startRow - 1, endRow) // Slice from startRow to endRow
            .map((line, index, array) => {
                if (index === 0 && array.length === 1) { // Only one line
                    return line.substring(startColumn - 1, endColumn);
                } else if (index === 0) { // First line of multiple
                    return line.substring(startColumn - 1);
                } else if (index === array.length - 1) { // Last line
                    return line.substring(0, endColumn);
                }
                return line; // Full lines in between
            })
            .join('\n');
        return selectedText;
    } catch (error: any) {
        console.error('Error reading range from file:', error);
        throw error;
    }
}

export async function writeBlock(filePath: string, startRow: number, startColumn: number, endRow: number, endColumn: number, newContent: string): Promise<void> {
    try {
        const fileContent = await readFile(filePath);
        let lines = fileContent.split('\n');
        const before = lines.slice(0, startRow - 1).join('\n');
        const after = lines.slice(endRow).join('\n');
        const firstLine = lines[startRow - 1].substring(0, startColumn - 1);
        const lastLine = lines[endRow - 1].substring(endColumn);
        const newFileContent = [before, firstLine + newContent + lastLine, after].join('\n');

        await writeFile(filePath, newFileContent);
    } catch (error: any) {
        console.error('Error replacing range in file:', error);
        throw error;
    }
}

export function openInVSCode(filePath: string, options?: { startRow: number, startColumn: number, endRow: number, endColumn: number, newContent: string }) {
    let command = `code "${filePath}"`;

    if (options) {
        command = `code -g "${filePath}:${options.startRow}:${options.startColumn}"`;
        if (options.endRow !== undefined && options.endColumn !== undefined) {
            command += `-${options.endRow}:${options.endColumn}`;
        }
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error opening file: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
        }
        console.log('File opened in VSCode:', stdout);
    });
}
