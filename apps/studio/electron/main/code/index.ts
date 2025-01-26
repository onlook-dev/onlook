import type { CodeDiff } from '@onlook/models/code';
import type { TemplateNode } from '@onlook/models/element';
import { IdeType } from '@onlook/models/ide';
import { dialog, shell } from 'electron';
import { GENERATE_CODE_OPTIONS } from '../run/helpers';
import { PersistentStorage } from '../storage';
import { generateCode } from './diff/helpers';
import { formatContent, readFile, writeFile } from './files';
import { parseJsxCodeBlock } from './helpers';
import { IDE } from '/common/ide';

export async function readCodeBlock(
    templateNode: TemplateNode,
    stripIds: boolean = false,
): Promise<string | null> {
    try {
        const filePath = templateNode.path;

        const startTag = templateNode.startTag;
        const startRow = startTag.start.line;
        const startColumn = startTag.start.column;

        const endTag = templateNode.endTag || startTag;
        const endRow = endTag.end.line;
        const endColumn = endTag.end.column;

        const fileContent = await readFile(filePath);
        if (fileContent == null) {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
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

        if (stripIds) {
            const ast = parseJsxCodeBlock(selectedText, true);
            if (ast) {
                return generateCode(ast, GENERATE_CODE_OPTIONS, selectedText);
            }
        }

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
    const userSettings = PersistentStorage.USER_SETTINGS.read() || {};
    return IDE.fromType(userSettings.ideType || IdeType.VS_CODE);
}

export function openInIde(templateNode: TemplateNode) {
    const ide = getIdeFromUserSettings();
    const command = ide.getCodeCommand(templateNode);
    shell.openExternal(command);
}

export function openFileInIde(filePath: string) {
    const ide = getIdeFromUserSettings();
    const command = ide.getCodeFileCommand(filePath);
    shell.openExternal(command);
}

export function pickDirectory() {
    return dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
    });
}
