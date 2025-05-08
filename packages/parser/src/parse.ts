import { type t as T, types as t, generate, parse } from './packages';

export function getAstFromContent(content: string) {
    return parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });
}

export function getAstFromCodeblock(code: string): T.JSXElement | undefined {
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

export async function getContentFromAst(ast: T.File): Promise<string> {
    return generate(ast, { retainLines: true, compact: false }).code;
}
