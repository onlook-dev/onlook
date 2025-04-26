import type { CodeDiff, RequestsByPath } from "@onlook/models";
import { getAstFromContent } from "src/parse";
import { generateCode } from "./helpers";
import { transformAst } from "./transform";

function processGroupedRequests(groupedRequests: RequestsByPath): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    for (const [path, request] of groupedRequests) {
        const { oidToCodeDiff, codeBlock } = request;
        const ast = getAstFromContent(codeBlock);

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
