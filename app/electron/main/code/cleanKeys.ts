import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { generateCode } from './diff';
import { formatContent, readFile, writeFile } from './files';
import { parseJsxFile } from './helpers';
import { EditorAttributes } from '/common/constants';

export async function cleanKeysFromFiles(files: string[]) {
    try {
        for (const file of files) {
            const fileContent = await readFile(file);
            const ast = parseJsxFile(fileContent);
            if (!ast) {
                continue;
            }
            cleanKeyFromAst(ast);
            const newContent = generateCode(
                ast,
                { retainLines: true, compact: false },
                fileContent,
            );
            const formattedContent = await formatContent(file, newContent);
            writeFile(file, formattedContent);
        }
    } catch (error: any) {
        console.error('Error cleaning move keys:', error);
        return false;
    }
    return true;
}

export function cleanKeyFromAst(ast: t.File) {
    traverse(ast, {
        JSXAttribute(path: NodePath<t.JSXAttribute>) {
            if (path.node.name.name === 'key') {
                const value = path.node.value;
                if (
                    t.isStringLiteral(value) &&
                    value.value.startsWith(EditorAttributes.ONLOOK_MOVE_KEY_PREFIX) &&
                    !isNaN(
                        Number(value.value.slice(EditorAttributes.ONLOOK_MOVE_KEY_PREFIX.length)),
                    )
                ) {
                    return path.remove();
                }
            }

            if (
                path.node.name.name === EditorAttributes.DATA_ONLOOK_TEMP_ID &&
                t.isStringLiteral(path.node.value)
            ) {
                return path.remove();
            }
        },
    });
    return ast;
}
