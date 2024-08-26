import generate from '@babel/generator';
import { parseJsx, removeSemiColonIfApplicable } from '../helpers';
import { addClassToAst } from './class';
import { insertElementToAst } from './insert';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';

export function getCodeDiffs(requests: CodeDiffRequest[]): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const generateOptions = { retainLines: true, compact: false };

    for (const request of requests) {
        const codeBlock = request.codeBlock;
        const ast = parseJsx(codeBlock);
        if (!ast) {
            continue;
        }
        const original = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );

        if (request.attributes.className) {
            addClassToAst(ast, request.attributes.className);
        }

        for (const element of request.elements) {
            insertElementToAst(ast, element);
        }

        const generated = removeSemiColonIfApplicable(
            generate(ast, generateOptions, codeBlock).code,
            codeBlock,
        );
        diffs.push({ original, generated, templateNode: request.templateNode });
    }

    return diffs;
}
