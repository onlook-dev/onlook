import { generate, parse, type t as T, types as t } from './packages';

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
