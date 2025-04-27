import type { CodeDiff, CodeDiffRequest, RequestsByPath } from '@onlook/models';
import { getAstFromContent, getContentFromAst, transformAst } from "@onlook/parse";

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
            groupedRequest = {
                oidToCodeDiff: new Map(), c
                odeBlock
            };
        }
        groupedRequest.oidToCodeDiff.set(request.oid, request);
        groupedRequests.set(path, groupedRequest);
    }
    return groupedRequests;
}

async function processGroupedRequests(groupedRequests: RequestsByPath): Promise<CodeDiff[]> {
    const diffs: CodeDiff[] = [];
    for (const [path, request] of groupedRequests) {
        const { oidToCodeDiff, codeBlock } = request;
        const ast = getAstFromContent(codeBlock);

        if (!ast) {
            continue;
        }

        const original = await getContentFromAst(ast);
        transformAst(ast, oidToCodeDiff);
        const generated = await getContentFromAst(ast);
        diffs.push({ original, generated, path });
    }
    return diffs;
}
