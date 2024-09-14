import generate, { GeneratorOptions } from '@babel/generator';
import * as t from '@babel/types';
import { readFile } from '../files';
import { parseJsx, removeSemiColonIfApplicable } from '../helpers';
import { transformAst } from './transform';
import { CodeDiff, CodeDiffRequest } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

interface RequestsByPath {
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>;
    codeBlock: string;
}

export async function getCodeDiffs(
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): Promise<CodeDiff[]> {
    const groupedRequests = await groupRequestsByTemplatePath(templateToCodeDiff);
    return processGroupedRequests(groupedRequests);
}

async function groupRequestsByTemplatePath(
    templateToCodeDiff: Map<TemplateNode, CodeDiffRequest>,
): Promise<Map<string, RequestsByPath>> {
    const groupedRequests: Map<string, RequestsByPath> = new Map();

    for (const [templateNode, request] of templateToCodeDiff) {
        const codeBlock = await readFile(templateNode.path);
        const path = templateNode.path;

        let groupedRequest = groupedRequests.get(path);
        if (!groupedRequest) {
            groupedRequest = { templateToCodeDiff: new Map(), codeBlock };
        }
        groupedRequest.templateToCodeDiff.set(templateNode, request);
        groupedRequests.set(path, groupedRequest);
    }

    return groupedRequests;
}

function processGroupedRequests(groupedRequests: Map<string, RequestsByPath>): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const generateOptions: GeneratorOptions = { retainLines: true, compact: false };

    for (const [path, request] of groupedRequests) {
        const { templateToCodeDiff, codeBlock } = request;
        const ast = parseJsx(codeBlock);
        if (!ast) {
            continue;
        }

        const original = generateCode(ast, generateOptions, codeBlock);
        transformAst(ast, path, templateToCodeDiff);
        const generated = generateCode(ast, generateOptions, codeBlock);
        diffs.push({ original, generated, path });
    }

    return diffs;
}

function generateCode(ast: t.File, options: GeneratorOptions, codeBlock: string): string {
    return removeSemiColonIfApplicable(
        generate(ast, { ...options, retainLines: false }, codeBlock).code,
        codeBlock,
    );
}
