import type { TemplateNode } from '@onlook/models/element';
import chokidar from 'chokidar';
import { writeFile } from '../code/files';
import { removeIdsFromFile } from './cleanup';
import { ALLOWED_EXTENSIONS, getValidFiles, IGNORED_DIRECTORIES } from './helpers';
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

    getTemplateNode(id: string): TemplateNode | undefined {
        return this.mapping.get(id);
    }

    async setup(dirPath: string) {
        this.mapping.clear();
        await this.addIdsToFilesAndCreateMapping(dirPath);
    }

    async listen(dirPath: string) {
        const watchPatterns = ALLOWED_EXTENSIONS.map((ext) => `${dirPath}/**/*${ext}`);

        const ignoredPatterns = IGNORED_DIRECTORIES.map((dir) => `${dirPath}/**/${dir}/**`);

        const watcher = chokidar.watch(watchPatterns, {
            ignored: [
                /(^|[/\\])\../, // ignore dotfiles
                ...ignoredPatterns,
            ],
            persistent: true,
        });

        watcher.on('change', async (filePath) => {
            console.log(`File ${filePath} has been changed`);
            await this.processFileForMapping(filePath);
        });

        watcher.on('error', (error) => {
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

    async cleanup(dirPath: string) {
        await this.removeIdsFromFiles(dirPath);
        this.mapping.clear();
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
