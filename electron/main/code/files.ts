import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TemplateNode } from '/common/models';

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

export async function readBlock(templateNode: TemplateNode): Promise<string> {
    try {
        const filePath = templateNode.path;
        const startTag = templateNode.startTag;
        const endTag = templateNode.endTag || startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

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

export async function writeBlock(templateNode: TemplateNode, newContent: string): Promise<void> {
    try {
        const filePath = templateNode.path;
        const startTag = templateNode.startTag;
        const endTag = templateNode.endTag || startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        const fileContent = await readFile(filePath);
        const lines = fileContent.split('\n');
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


export function openInVsCode(templateNode: TemplateNode) {
    const filePath = templateNode.path;
    const startTag = templateNode.startTag;
    let command = `code -g "${filePath}"`;

    if (startTag) {
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column - 1; // Adjusting column to be zero-based
        command += `:${startRow}:${startColumn}`;
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error opening file: ${error}`);
            return;
        }
        if (stderr) {
            console.error(`Error output: ${stderr}`);
        }
        console.log('File opened in VSCode', stdout);
    });
}
