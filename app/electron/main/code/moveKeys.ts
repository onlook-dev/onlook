import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { generateCode } from './diff';
import { readFile, writeFile } from './files';
import { parseJsx } from './helpers';
import { EditorAttributes } from '/common/constants';

export async function cleanMoveKeys(files: string[]) {
    for (const file of files) {
        const fileContent = await readFile(file);
        const ast = parseJsx(fileContent);
        if (!ast) {
            continue;
        }
        cleanKeyFromAst(ast);
        const newContent = generateCode(ast, { retainLines: true, compact: false }, fileContent);
        writeFile(file, newContent);
    }
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
        },
    });
    return ast;
}
