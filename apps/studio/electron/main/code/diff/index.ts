import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import runManager from '../../run';
import { GENERATE_CODE_OPTIONS } from '../../run/helpers';
import { readFile } from '../files';
import { parseJsxFile } from '../helpers';
import { generateCode } from './helpers';
import { transformAst } from './transform';

type RequestsByPath = Map<string, RequestsByOid>;
interface RequestsByOid {
    oidToCodeDiff: Map<string, CodeDiffRequest>;
    codeBlock: string;
}

export async function getCodeDiffs(requests: CodeDiffRequest[]): Promise<CodeDiff[]> {
    const groupedRequests = await groupRequestsByOid(requests);
    return processGroupedRequests(groupedRequests);
}

async function groupRequestsByOid(requests: CodeDiffRequest[]): Promise<RequestsByPath> {
    const groupedRequests: RequestsByPath = new Map();

    for (const request of requests) {
        const templateNode = await runManager.getTemplateNode(request.oid);
        if (!templateNode) {
            console.error(`Template node not found for oid: ${request.oid}`);
            continue;
        }
        const codeBlock = await readFile(templateNode.path);
        if (!codeBlock) {
            console.error(`Failed to read file: ${templateNode.path}`);
            continue;
        }
        const path = templateNode.path;

        let groupedRequest = groupedRequests.get(path);
        if (!groupedRequest) {
            groupedRequest = { oidToCodeDiff: new Map(), codeBlock };
        }
        groupedRequest.oidToCodeDiff.set(request.oid, request);
        groupedRequests.set(path, groupedRequest);
    }
    return groupedRequests;
}

function processGroupedRequests(groupedRequests: RequestsByPath): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    for (const [path, request] of groupedRequests) {
        const { oidToCodeDiff, codeBlock } = request;
        const ast = parseJsxFile(codeBlock);

        if (!ast) {
            continue;
        }
        const original = generateCode(ast, GENERATE_CODE_OPTIONS, codeBlock);
        transformAst(ast, oidToCodeDiff);
        const generated = generateCode(ast, GENERATE_CODE_OPTIONS, codeBlock);
        diffs.push({ original, generated, path });
    }
    return diffs;
}
