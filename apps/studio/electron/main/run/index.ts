import type { TemplateNode } from '@onlook/models/element';
import { removeIdsFromFile } from './cleanup';
import { getValidFiles } from './helpers';
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
        await this.addIdsToFilesAndCreateMapping(dirPath);
        console.log(`Setup complete. Mapping contains ${this.mapping.size} entries.`);
        console.log(this.mapping);
    }

    async addIdsToFilesAndCreateMapping(dirPath: string) {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.processFileForMapping(filePath);
        }
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

    async cleanup(dirPath: string) {
        this.removeIdsFromFiles(dirPath);
        this.mapping.clear();
    }

    async removeIdsFromFiles(dirPath: string) {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await removeIdsFromFile(filePath);
        }
    }
}

export default RunManager.getInstance();
