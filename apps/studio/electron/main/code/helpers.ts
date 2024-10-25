import { parse } from '@babel/parser';
import t from '@babel/types';

export function removeSemiColonIfApplicable(code: string, original: string) {
    if (!original.endsWith(';') && code.endsWith(';')) {
        return code.slice(0, -1);
    }
    return code;
}

export function parseJsxFile(code: string): t.File | undefined {
    try {
        return parse(code, {
            plugins: ['typescript', 'jsx'],
            sourceType: 'module',
            allowImportExportEverywhere: true,
        });
    } catch (e) {
        console.error('Error parsing code', e);
        return;
    }
}

export function parseJsxCodeBlock(code: string): t.JSXElement | undefined {
    const ast = parseJsxFile(code);
    if (!ast) {
        return undefined;
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
    return undefined;
}
