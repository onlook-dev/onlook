import type { TemplateNode } from '@onlook/models/element';
import { getValidFiles } from './helpers';
import { processDir } from './process';
import { createMappingFromContent, getFileWithIds as getFileContentWithIds } from './setup';

class RunManager {
    private static instance: RunManager;
    mapping = new Map<string, TemplateNode>();

    private constructor() {
        this.mapping = new Map();
    }

    static getInstance(): RunManager {
        if (!RunManager.instance) {
            RunManager.instance = new RunManager();
        }
        return RunManager.instance;
    }

    async setup(dirPath: string) {
        this.mapping.clear();
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.processFileForMapping(filePath);
        }
        console.log(`Setup complete. Mapping contains ${this.mapping.size} entries.`);
        console.log(this.mapping);
    }

    async processFileForMapping(filePath: string) {
        const content = await getFileContentWithIds(filePath);
        if (content) {
            const newMapping = createMappingFromContent(content, filePath);
            if (!newMapping) {
                console.error(`Failed to create mapping for file: ${filePath}`);
                return;
            }
            for (const [key, value] of Object.entries(newMapping)) {
                this.mapping.set(key, value);
            }
        }
    }

    cleanup(dirPath: string) {
        processDir(dirPath, 'remove');
        this.mapping.clear();
    }
}

export default RunManager.getInstance();
