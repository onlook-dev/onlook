import type { CodeDiff, CodeDiffRequest } from '@onlook/models/code';
import { getAstFromContent } from '@onlook/parser';
import { generateCode } from './helpers';
import { transformAst } from './transform';

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