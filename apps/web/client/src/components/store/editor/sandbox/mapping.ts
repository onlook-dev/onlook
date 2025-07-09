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
        file: string,
        readFile: (path: string) => Promise<string | null>,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ) {
        const content = await readFile(file);
        if (!content) {
            console.error(`Failed to read file ${file}`);
            return;
        }

        const ast = getAstFromContent(content);
        if (!ast) {
            console.error(`Failed to get ast for file ${file}`);
            return;
        }

        if (isTargetFile(file, LAYOUT_FILE_CONDITIONS)) {
            injectPreloadScript(ast);
        }

        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const templateNodeMap = createTemplateNodeMap(astWithIds, file);
        this.updateMapping(templateNodeMap);

        // Write the file if it has changed
        if (modified) {
            const contentWithIds = await getContentFromAst(astWithIds);
            await writeFile(file, contentWithIds);
        }
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
