import { revertLegacyOnlook } from '@onlook/foundation';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { RunState } from '@onlook/models/run';
import { type FSWatcher, watch } from 'chokidar';
import { mainWindow } from '..';
import { sendAnalytics } from '../analytics';
import { writeFile } from '../code/files';
import { removeIdsFromDirectory } from './cleanup';
import { getValidFiles } from './helpers';
import { createMappingFromContent, getFileWithIds as getFileContentWithIds } from './setup';
import terminal from './terminal';

class RunManager {
    private static instance: RunManager;
    private idToTemplateNode = new Map<string, TemplateNode>();
    private fileToIds = new Map<string, Set<string>>();
    private fileWatcher: FSWatcher | null = null;
    private folderWatcher: FSWatcher | null = null;
    state: RunState = RunState.STOPPED;
    runningDirs = new Set<string>();

    private constructor() {}

    static getInstance(): RunManager {
        if (!RunManager.instance) {
            RunManager.instance = new RunManager();
        }
        return RunManager.instance;
    }

    async restart(id: string, folderPath: string, command: string): Promise<boolean> {
        await this.stop(id, folderPath);
        const res = await this.start(id, folderPath, command);
        sendAnalytics('run restarted', {
            success: res,
        });
        return res;
    }

    async start(id: string, folderPath: string, command: string): Promise<boolean> {
        try {
            if (this.state === RunState.RUNNING) {
                this.setState(RunState.ERROR, 'Failed to run. Already running.');
                return false;
            }

            this.setState(RunState.SETTING_UP, 'Setting up...');
            const reverted = await revertLegacyOnlook(folderPath);
            if (!reverted) {
                console.error('Failed to revert legacy Onlook settings.');
                this.setState(
                    RunState.SETTING_UP,
                    'Warning: Failed to revert legacy Onlook settings.',
                );
            }

            this.clearMappings();
            const filePaths = await this.addIdsToDirectoryAndCreateMapping(folderPath);
            await this.listen(folderPath, filePaths);

            this.setState(RunState.RUNNING, 'Running...');
            this.startTerminal(id, folderPath, command);
            this.runningDirs.add(folderPath);

            sendAnalytics('run started', {
                command,
            });
            return true;
        } catch (error) {
            const errorMessage = `Failed to setup: ${error}`;
            console.error(errorMessage);
            this.setState(RunState.ERROR, errorMessage);
            return false;
        }
    }

    async stop(id: string, folderPath: string): Promise<boolean> {
        try {
            this.setState(RunState.STOPPING, 'Stopping terminal...');
            this.stopTerminal(id);

            this.setState(RunState.STOPPING, 'Cleaning up...');
            await this.cleanProjectDir(folderPath);

            this.setState(RunState.STOPPED, 'Stopped.');
            this.runningDirs.delete(folderPath);
            sendAnalytics('run stopped');
            return true;
        } catch (error) {
            const errorMessage = `Failed to stop: ${error}`;
            console.error(errorMessage);
            this.setState(RunState.ERROR, errorMessage);
            return false;
        }
    }

    getTemplateNode(id: string): TemplateNode | undefined {
        return this.idToTemplateNode.get(id);
    }

    setState(state: RunState, message?: string) {
        this.state = state;
        mainWindow?.webContents.send(MainChannels.RUN_STATE_CHANGED, {
            state,
            message,
        });
        if (state === RunState.ERROR) {
            sendAnalytics('run error', {
                message,
            });
        }
    }

    startTerminal(id: string, folderPath: string, command: string) {
        terminal.create(id, { cwd: folderPath });
        terminal.executeCommand(id, command);
        sendAnalytics('terminal started', {
            command,
        });
    }

    stopTerminal(id: string) {
        terminal.kill(id);
        sendAnalytics('terminal stopped');
    }

    clearMappings() {
        this.idToTemplateNode.clear();
        this.fileToIds.clear();
    }

    async cleanProjectDir(folderPath: string): Promise<void> {
        this.clearMappings();
        this.clearWatchers();
        await removeIdsFromDirectory(folderPath);
    }

    clearWatchers() {
        this.fileWatcher?.close();
        this.folderWatcher?.close();
        this.fileWatcher = null;
        this.folderWatcher = null;
    }

    async listen(folderPath: string, filePaths: string[]) {
        this.clearWatchers();

        // TODO: Handle folders to add new files to the watcher
        // this.folderWatcher = watch(folderPath, {
        //     ignored: (filePath) => {
        //         const pathParts = filePath.split(sep);
        //         if (IGNORED_DIRECTORIES.some((dir) => pathParts.includes(dir))) {
        //             return true;
        //         }
        //         return false;
        //     },
        //     persistent: true,
        // });

        this.fileWatcher = watch(filePaths, {
            persistent: true,
        });

        this.fileWatcher
            .on('change', (filePath) => {
                // TODO: This currently triggers twice because processFileForMapping is async
                this.processFileForMapping(filePath);
            })
            .on('error', (error) => {
                console.error(`File watcher error: ${error.toString()}`);
            });

        // this.folderWatcher
        //     .on('add', (filePath) => {
        //         if (!ALLOWED_EXTENSIONS.includes(filePath.split('.').pop() || '')) {
        //             console.log('folder add', filePath);
        //             return;
        //         }
        //         this.processFileForMapping(filePath);
        //         this.fileWatcher?.add(filePath);
        //     })
        //     .on('unlink', (filePath) => {
        //         this.removeFileFromMapping(filePath);
        //         this.fileWatcher?.unwatch(filePath);
        //     })
        //     .on('error', (error) => {
        //         console.error(`Watcher error: ${error.toString()}`);
        //     });
    }

    async addIdsToDirectoryAndCreateMapping(dirPath: string): Promise<string[]> {
        const filePaths = await getValidFiles(dirPath);
        for (const filePath of filePaths) {
            await this.processFileForMapping(filePath);
        }
        return filePaths;
    }

    async processFileForMapping(filePath: string) {
        const content = await getFileContentWithIds(filePath);
        if (!content || content.trim() === '') {
            console.error(`Failed to get content for file: ${filePath}`);
            return;
        }

        this.removeFileFromMapping(filePath);

        const newMapping = createMappingFromContent(content, filePath);
        if (!newMapping) {
            console.error(`Failed to create mapping for file: ${filePath}`);
            return;
        }

        await writeFile(filePath, content);

        const newIds = new Set(Object.keys(newMapping));
        this.fileToIds.set(filePath, newIds);

        for (const [key, value] of Object.entries(newMapping)) {
            this.idToTemplateNode.set(key, value);
        }
        return newMapping;
    }

    removeFileFromMapping(filePath: string) {
        const oldIds = this.fileToIds.get(filePath);
        if (oldIds) {
            for (const id of oldIds) {
                this.idToTemplateNode.delete(id);
            }
        }
    }

    async stopAll() {
        for (const dir of this.runningDirs) {
            await this.cleanProjectDir(dir);
        }
        await this.fileWatcher?.close();
        await this.folderWatcher?.close();
        this.fileWatcher = null;
        this.folderWatcher = null;
        this.runningDirs.clear();
        this.clearMappings();
    }
}

export default RunManager.getInstance();
