import type { TemplateNode } from '@onlook/models';
import {
    addOidsToAst,
    createTemplateNodeMap,
    getAstFromContent,
    getContentFromAst,
} from '@onlook/parser';

export class TemplateNodeMapper {
    private oidToTemplateNodeMap = new Map<string, TemplateNode>();
    private storageKey = 'template-node-map';

    constructor(private localforage: LocalForage) {
        this.restoreFromLocalStorage();
    }

    private async restoreFromLocalStorage() {
        try {
            const storedCache = await this.localforage.getItem<Record<string, TemplateNode>>(
                this.storageKey,
            );
            if (storedCache) {
                Object.entries(storedCache).forEach(([key, value]) => {
                    this.oidToTemplateNodeMap.set(key, value);
                });
            }
        } catch (error) {
            console.error('Error restoring from localForage:', error);
        }
    }

    private async saveToLocalStorage() {
        try {
            const cacheObject = Object.fromEntries(this.oidToTemplateNodeMap.entries());
            await this.localforage.setItem(this.storageKey, cacheObject);
        } catch (error) {
            console.error('Error saving to localForage:', error);
        }
    }

    updateMapping(newMap: Map<string, TemplateNode>) {
        this.oidToTemplateNodeMap = new Map([...this.oidToTemplateNodeMap, ...newMap]);
        this.saveToLocalStorage();
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
