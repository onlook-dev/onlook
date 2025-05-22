import { EditorAttributes } from '@onlook/constants';
import { isReactFragment } from './helpers';
import { generate, type NodePath, parse, type t as T, types as t, traverse } from './packages';

export function getAstFromContent(content: string): T.File | null {
    try {
        return parse(content, {
            sourceType: 'module',
            plugins: ['decorators-legacy', 'classProperties', 'typescript', 'jsx'],
        });
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function getAstFromCodeblock(
    code: string,
    stripIds: boolean = false,
): T.JSXElement | undefined {
    const ast = getAstFromContent(code);
    if (!ast) {
        return;
    }
    if (stripIds) {
        removeIdsFromAst(ast);
    }
    const jsxElement = ast.program.body.find(
        (node) => t.isExpressionStatement(node) && t.isJSXElement(node.expression),
    );

    if (
        jsxElement &&
        t.isExpressionStatement(jsxElement) &&
        t.isJSXElement(jsxElement.expression)
    ) {
        return jsxElement.expression;
    }
}

export async function getContentFromAst(ast: T.File): Promise<string> {
    return generate(ast, { retainLines: true, compact: false }).code;
}

export function removeIdsFromAst(ast: T.File) {
    traverse(ast, {
        JSXOpeningElement(path: NodePath<T.JSXOpeningElement>) {
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
        JSXAttribute(path: NodePath<T.JSXAttribute>) {
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
