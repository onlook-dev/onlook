import type { TemplateNode } from '@onlook/models/element';
import { FSWatcher, watch } from 'chokidar';
import { writeFile } from '../code/files';
import { removeIdsFromFile } from './cleanup';
import { getValidFiles, IGNORED_DIRECTORIES } from './helpers';
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
        this.mapping.clear();
        await this.addIdsToFilesAndCreateMapping(dirPath);
        await this.listen(dirPath);
        return true;
    }

    async listen(dirPath: string) {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        const ignoredPatterns = IGNORED_DIRECTORIES.map((dir) => `${dirPath}/**/${dir}/**`);
        const dotFilesPattern = /(^|[/\\])\../;

        this.watcher = watch(dirPath, {
            ignored: [dotFilesPattern, ...ignoredPatterns],
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

    async addIdsToFilesAndCreateMapping(dirPath: string) {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.processFileForMapping(filePath);
        }
        console.log(`Setup complete. Mapping contains ${this.mapping.size} entries.`);
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

        for (const [key, value] of Object.entries(newMapping)) {
            this.mapping.set(key, value);
        }

        await writeFile(filePath, content);
    }

    async cleanup(dirPath: string): Promise<boolean> {
        this.watcher?.close();
        await this.removeIdsFromFiles(dirPath);
        this.mapping.clear();
        this.watcher = null;
        return true;
    }

    async removeIdsFromFiles(dirPath: string) {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.removeIdsFromFile(filePath);
        }
    }

    async removeIdsFromFile(filePath: string) {
        const content = await removeIdsFromFile(filePath);
        if (!content) {
            console.error(`Failed to remove ids from file: ${filePath}`);
            return;
        }
        await writeFile(filePath, content);
        console.log(content);
    }
}

export default RunManager.getInstance();
