import type { TemplateNode } from '@onlook/models/element';
import { type FSWatcher, watch } from 'chokidar';
import { writeFile } from '../code/files';
import { removeIdsFromDirectory } from './cleanup';
import { getValidFiles } from './helpers';
import { createMappingFromContent, getFileWithIds as getFileContentWithIds } from './setup';

class RunManager {
    private static instance: RunManager;
    mapping = new Map<string, TemplateNode>();
    watcher: FSWatcher | null = null;

    private constructor() {
        this.mapping = new Map();
    }

    static getInstance(): RunManager {
        if (!RunManager.instance) {
            RunManager.instance = new RunManager();
        }
        return RunManager.instance;
    }

    getTemplateNode(id: string): TemplateNode | undefined {
        return this.mapping.get(id);
    }

    async setup(dirPath: string): Promise<boolean> {
        try {
            this.mapping.clear();
            const filePaths = await this.addIdsToDirectoryAndCreateMapping(dirPath);
            await this.listen(filePaths);
            return true;
        } catch (error) {
            console.error(`Failed to setup: ${error}`);
            return false;
        }
    }

    async cleanup(dirPath: string): Promise<boolean> {
        try {
            this.mapping.clear();
            await this.watcher?.close();
            this.watcher = null;
            await removeIdsFromDirectory(dirPath);
            return true;
        } catch (error) {
            console.error(`Failed to cleanup: ${error}`);
            return false;
        }
    }

    async listen(filePaths: string[]) {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        this.watcher = watch(filePaths, {
            persistent: true,
        });

        this.watcher
            .on('change', (filePath) => {
                this.processFileForMapping(filePath);
            })
            .on('error', (error) => {
                console.error(`Watcher error: ${error}`);
            });
    }

    async addIdsToDirectoryAndCreateMapping(dirPath: string): Promise<string[]> {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.processFileForMapping(filePath);
        }
        console.log(`Setup complete. Mapping contains ${this.mapping.size} entries.`);
        return filePaths;
    }

    async processFileForMapping(filePath: string) {
        const content = await getFileContentWithIds(filePath);
        if (!content) {
            console.error(`Failed to get content for file: ${filePath}`);
            return;
        }

        const newMapping = createMappingFromContent(content, filePath);
        if (!newMapping) {
            console.error(`Failed to create mapping for file: ${filePath}`);
            return;
        }

        await writeFile(filePath, content);
        for (const [key, value] of Object.entries(newMapping)) {
            this.mapping.set(key, value);
        }
        return newMapping;
    }
}

export default RunManager.getInstance();
