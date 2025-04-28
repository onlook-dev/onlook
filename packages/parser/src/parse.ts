import * as t from '@babel/types';
import { generate, parse } from './packages';

export function getAstFromContent(content: string) {
    return parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });
}

export function getAstFromCodeblock(code: string): t.JSXElement | undefined {
    const ast = getAstFromContent(code);
    if (!ast) {
        return;
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

export async function getContentFromAst(ast: t.File): Promise<string> {
    return generate(ast, { retainLines: true, compact: false }).code;
}
