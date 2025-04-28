import type { CodeDiff, FileToRequests } from '@onlook/models';
import { getAstFromContent, getContentFromAst, transformAst } from "@onlook/parse";

export async function processGroupedRequests(groupedRequests: FileToRequests): Promise<CodeDiff[]> {
    const diffs: CodeDiff[] = [];
    for (const [path, request] of groupedRequests) {
        const { oidToRequest, content } = request;
        const ast = getAstFromContent(content);

        if (!ast) {
            continue;
        }

        const original = await getContentFromAst(ast);
        transformAst(ast, oidToRequest);
        const generated = await getContentFromAst(ast);
        diffs.push({ original, generated, path });
    }
    return diffs;
}
