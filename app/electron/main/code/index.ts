import { dialog, shell } from 'electron';
import { PersistenStorage } from '../storage';
import { formatContent, readFile, writeFile } from './files';
import { IDE, IdeType } from '/common/ide';
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
    let success = true;
    for (const diff of codeDiffs) {
        try {
            const formattedContent = await formatContent(diff.path, diff.generated);
            await writeFile(diff.path, formattedContent);
        } catch (error: any) {
            console.error('Error writing content to file:', error);
            success = false;
        }
    }
    return success;
}

function getIdeFromUserSettings(): IDE {
    const userSettings = PersistenStorage.USER_SETTINGS.read();
    return IDE.fromType(userSettings.ideType || IdeType.VS_CODE);
}

export function openInIde(templateNode: TemplateNode) {
    const ide = getIdeFromUserSettings();
    const filePath = templateNode.path;
    const startTag = templateNode.startTag;
    const endTag = templateNode.endTag || startTag;
    let command = `${ide.command}://file/${filePath}`;

    if (startTag && endTag) {
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column - 1;
        command += `:${startRow}:${startColumn}:${endRow}:${endColumn}`;
    }
    shell.openExternal(command);
}

export function pickDirectory() {
    return dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
}
