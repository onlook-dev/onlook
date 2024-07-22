import { shell } from 'electron';
import { promises as fs } from 'fs';
import * as path from 'path';
import { compareTemplateNodes } from '/common/helpers/template';
import { CodeResult, TemplateNode } from '/common/models';

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
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;

        const endTag = templateNode.endTag || startTag;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        const fileContent = await readFile(filePath);
        const lines = fileContent.split('\n');

        const selectedText = lines
            .slice(startRow - 1, endRow)
            .map((line, index, array) => {
                if (index === 0 && array.length === 1) {
                    // Only one line
                    return line.substring(startColumn - 1, endColumn);
                } else if (index === 0) {
                    // First line of multiple
                    return line.substring(startColumn - 1);
                } else if (index === array.length - 1) {
                    // Last line
                    return line.substring(0, endColumn);
                }
                // Full lines in between
                return line;
            })
            .join('\n');

        return selectedText;
    } catch (error: any) {
        console.error('Error reading range from file:', error);
        throw error;
    }
}

export async function writeCodeResults(codeResults: CodeResult[]): Promise<void> {
    // Write from bottom to prevent line offset
    const sortedCodeResults = codeResults
        .sort((a, b) => compareTemplateNodes(a.param.templateNode, b.param.templateNode))
        .toReversed();
    const files = new Map<string, string>();

    for (const result of sortedCodeResults) {
        let fileContent = files.get(result.param.templateNode.path);
        if (!fileContent) {
            fileContent = await readFile(result.param.templateNode.path);
        }

        const newFileContent = await writeBlock(
            result.param.templateNode,
            result.generated,
            fileContent,
        );
        files.set(result.param.templateNode.path, newFileContent);
    }

    for (const [filePath, content] of files) {
        await writeFile(filePath, content);
    }
}

export async function writeBlock(
    templateNode: TemplateNode,
    newBlock: string,
    fileContent: string,
): Promise<string> {
    try {
        const startTag = templateNode.startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;

        const endTag = templateNode.endTag || startTag;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        const lines = fileContent.split('\n');
        const before = lines.slice(0, startRow - 1).join('\n');
        const after = lines.slice(endRow).join('\n');

        const firstLine = lines[startRow - 1].substring(0, startColumn - 1);
        const lastLine = lines[endRow - 1].substring(endColumn);

        const newFileContent = [before, firstLine + newBlock + lastLine, after].join('\n');
        return newFileContent;
    } catch (error: any) {
        console.error('Error replacing range in file:', error);
        throw error;
    }
}

export function openInVsCode(templateNode: TemplateNode) {
    const filePath = templateNode.path;
    const startTag = templateNode.startTag;
    const endTag = templateNode.endTag || startTag;
    let command = `vscode://file/${filePath}`;

    if (startTag && endTag) {
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column - 1;
        command += `:${startRow}:${startColumn}:${endRow}:${endColumn}`;
    }
    shell.openExternal(command);
}
