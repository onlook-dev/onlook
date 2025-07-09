import { LAYOUT_FILE_CONDITIONS } from '@onlook/constants';
import type { SandboxFile, TemplateNode } from '@onlook/models';
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
        readFile: (path: string) => Promise<SandboxFile | null>,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ) {
        const file = await readFile(filePath);
        if (!file) {
            console.error(`Failed to read file ${filePath}`);
            return;
        }

        if (file.type === 'binary') {
            console.error(`Binary files are not supported for mapping`);
            return;
        }

        const ast = getAstFromContent(file.content);
        if (!ast) {
            console.error(`Failed to get ast for file ${filePath}`);
            return;
        }

        if (isTargetFile(filePath, LAYOUT_FILE_CONDITIONS)) {
            injectPreloadScript(ast);
        }

        const { ast: astWithIds, modified } = addOidsToAst(ast);
        const templateNodeMap = createTemplateNodeMap(astWithIds, filePath);
        this.updateMapping(templateNodeMap);

        // Write the file if it has changed
        if (modified) {
            const contentWithIds = await getContentFromAst(astWithIds);
            await writeFile(filePath, contentWithIds);
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
