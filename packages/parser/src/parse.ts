import * as t from '@babel/types';
import { generate, parse } from './packages';

export function getAstFromContent(content: string) {
    return parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
    });
}

export async function getContentFromAst(ast: t.File): Promise<string> {
    return generate(ast, { retainLines: true, compact: false }).code;
}
