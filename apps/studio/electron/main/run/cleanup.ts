import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { EditorAttributes } from '@onlook/models/constants';
import { generateCode } from '../code/diff/helpers';
import { formatContent, readFile } from '../code/files';
import { parseJsxFile } from '../code/helpers';
import { generateCodeOptions, isReactFragment } from './helpers';

export async function removeIdsFromFile(filePath: string) {
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

function removeIdsFromAst(ast: t.File) {
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
    });
}
