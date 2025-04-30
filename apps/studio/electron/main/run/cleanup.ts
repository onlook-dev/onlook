import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import { generateCode } from '../code/diff/helpers';
import { createHash, formatContent, readFile, writeFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';
import { GENERATE_CODE_OPTIONS, getValidFiles, isReactFragment } from './helpers';
import path from 'path';
import type { HashesJson } from '@onlook/models';

export async function removeIdsFromDirectory(dirPath: string) {
    const filePaths = await getValidFiles(dirPath);
    for (const filePath of filePaths) {
        const isFileChanged = await checkIfFileChanged(dirPath, filePath);
        if (isFileChanged) {
            await removeIdsFromFile(filePath);
        }
    }
}

export async function removeIdsFromFile(filePath: string) {
    const content = await getFileContentWithoutIds(filePath);
    if (!content || content.trim() === '') {
        console.error(`Failed to remove ids from file: ${filePath}`);
        return;
    }
    await writeFile(filePath, content);
}

export async function getFileContentWithoutIds(filePath: string): Promise<string | null> {
    const content = await readFile(filePath);
    if (content == null) {
        console.error(`Failed to read file: ${filePath}`);
        return null;
    }
    const ast = parseJsxFile(content);
    if (!ast) {
        console.error(`Failed to parse file: ${filePath}`);
        return content;
    }
    removeIdsFromAst(ast);
    const generated = generateCode(ast, GENERATE_CODE_OPTIONS, content);
    const formatted = await formatContent(filePath, generated);
    return formatted;
}

export function removeIdsFromAst(ast: t.File) {
    traverse(ast, {
        JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
            if (isReactFragment(path.node)) {
                return;
            }
            const attributes = path.node.attributes;
            const existingAttrIndex = attributes.findIndex(
                (attr: any) => attr.name?.name === EditorAttributes.DATA_ONLOOK_ID,
            );

            if (existingAttrIndex !== -1) {
                attributes.splice(existingAttrIndex, 1);
            }
        },
        JSXAttribute(path: NodePath<t.JSXAttribute>) {
            if (path.node.name.name === 'key') {
                const value = path.node.value;
                if (
                    t.isStringLiteral(value) &&
                    value.value.startsWith(EditorAttributes.ONLOOK_MOVE_KEY_PREFIX)
                ) {
                    return path.remove();
                }
            }
        },
    });
}

export async function checkIfFileChanged(projectDir: string, filePath: string): Promise<boolean> {
    if (!filePath) {
        console.error('No file path provided.');
        return false;
    }

    const cacheDir = path.join(projectDir, '.onlook', 'cache');
    const hashesFilePath = path.join(cacheDir, 'hashes.json');

    let hashesJson: HashesJson = {};

    try {
        const existing = await readFile(hashesFilePath);
        if (existing?.trim()) {
            hashesJson = JSON.parse(existing);
        }
    } catch (error) {
        console.error('Failed to read hashes.json. Proceeding without cache.');
        return true;
    }

    const storedEntry = hashesJson[filePath];
    if (!storedEntry) {
        console.warn(`No stored hash for file: ${filePath}`);
        return true;
    }

    const fileContentWithIds = await readFile(filePath);
    if (!fileContentWithIds || fileContentWithIds.trim() === '') {
        console.error(`Failed to get content for file: ${filePath}`);
        return false;
    }

    const calculatedHash = createHash(fileContentWithIds);

    if (calculatedHash === storedEntry.hash) {
        try {
            const cacheFileContent = await readFile(storedEntry.cache_path);
            if (cacheFileContent?.trim()) {
                await writeFile(filePath, cacheFileContent);
                return false;
            }
        } catch (err) {
            console.error(`Failed to read cached file at ${storedEntry.cache_path}:`, err);
        }
    }

    return true;
}
