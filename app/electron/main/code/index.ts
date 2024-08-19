import { shell } from 'electron';
import { formatContent, readFile, writeFile } from './files';
import { compareTemplateNodes } from '/common/helpers/template';
import { CodeDiff } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

export async function readCodeBlocks(templateNodes: TemplateNode[]): Promise<string[]> {
    const blocks: string[] = [];
    for (const templateNode of templateNodes) {
        const block = await readCodeBlock(templateNode);
        blocks.push(block);
    }
    return blocks;
}

export async function readCodeBlock(templateNode: TemplateNode): Promise<string> {
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
            .map((line: string, index: number, array: string[]) => {
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

export async function writeCode(codeDiffs: CodeDiff[]): Promise<boolean> {
    try {
        // Write from bottom to prevent line offset
        const sortedCodeDiffs = codeDiffs.sort((a, b) =>
            compareTemplateNodes(a.templateNode, b.templateNode),
        );
        const files = new Map<string, string>();

        for (const result of sortedCodeDiffs) {
            let fileContent = files.get(result.templateNode.path);
            if (!fileContent) {
                fileContent = await readFile(result.templateNode.path);
            }

            const updatedFileContent = await getUpdatedFileContent(
                result.templateNode,
                result.generated,
                fileContent,
            );
            files.set(result.templateNode.path, updatedFileContent);
        }

        for (const [filePath, content] of files) {
            const formattedContent = await formatContent(filePath, content);
            await writeFile(filePath, formattedContent);
        }
    } catch (error: any) {
        console.error('Error writing range to file:', error);
        return false;
    }
    return true;
}

export async function getUpdatedFileContent(
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
