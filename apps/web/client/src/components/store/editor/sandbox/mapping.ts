import { LAYOUT_FILE_CONDITIONS } from '@onlook/constants';
import type { TemplateNode } from '@onlook/models';
import {
    addOidsToAst,
    createTemplateNodeMap,
    getAstFromContent,
    getContentFromAst,
    injectPreloadScript,
} from '@onlook/parser';
import { isTargetFile } from '@onlook/utility/src/path';

export class TemplateNodeMapper {
    private oidToTemplateNodeMap = new Map<string, TemplateNode>();

    updateMapping(newMap: Map<string, TemplateNode>) {
        this.oidToTemplateNodeMap = new Map([...this.oidToTemplateNodeMap, ...newMap]);
    }

    async processFileForMapping(
        filePath: string,
        content: string,
    ): Promise<{
        modified: boolean;
        newContent: string;
    }> {
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error(`Failed to get ast for file ${filePath}`);
        }

        if (isTargetFile(filePath, LAYOUT_FILE_CONDITIONS)) {
            injectPreloadScript(ast);
        }

        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const templateNodeMap = createTemplateNodeMap(astWithIds, filePath);
        this.updateMapping(templateNodeMap);
        const newContent = await getContentFromAst(astWithIds);
        return {
            modified,
            newContent,
        };
    }

    getTemplateNode(oid: string): TemplateNode | null {
        return this.oidToTemplateNodeMap.get(oid) || null;
    }

    getTemplateNodeMap(): Map<string, TemplateNode> {
        return this.oidToTemplateNodeMap;
    }

    clear() {
        this.oidToTemplateNodeMap.clear();
    }
}
