import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import { generateCode } from '../code/diff/helpers';
import { formatContent, readFile, writeFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';
import { generateCodeOptions, getValidFiles, isReactFragment } from './helpers';

export async function removeIdsFromDirectory(dirPath: string) {
    const filePaths = await getValidFiles(dirPath);
    for (const filePath of filePaths) {
        await removeIdsFromFile(filePath);
    }
}

export async function removeIdsFromFile(filePath: string) {
    const content = await getFileContentWithoutIds(filePath);
    if (!content || content === '') {
        console.error(`Failed to remove ids from file: ${filePath}`);
        return;
    }
    await writeFile(filePath, content);
}

export async function getFileContentWithoutIds(filePath: string) {
    const content = await readFile(filePath);
    const ast = parseJsxFile(content);
    if (!ast) {
        console.error(`Failed to parse file: ${filePath}`);
        return null;
    }
    removeIdsFromAst(ast);
    const generated = generateCode(ast, generateCodeOptions, content);
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
