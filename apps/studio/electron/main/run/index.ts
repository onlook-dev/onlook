import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { RunState } from '@onlook/models/run';
import * as watcher from '@parcel/watcher';
import { mainWindow } from '..';
import { sendAnalytics } from '../analytics';
import { writeFile } from '../code/files';
import { removeIdsFromDirectory } from './cleanup';
import { ALLOWED_EXTENSIONS, getValidFiles } from './helpers';
import { createMappingFromContent, getFileWithIds as getFileContentWithIds } from './setup';
import terminal from './terminal';

class RunManager {
    private static instance: RunManager;
    private mapping = new Map<string, TemplateNode>();
    private watcher: watcher.AsyncSubscription | null = null;
    state: RunState = RunState.STOPPED;
    runningDirs = new Set<string>();

    private constructor() {
        this.mapping = new Map();
    }

    static getInstance(): RunManager {
        if (!RunManager.instance) {
            RunManager.instance = new RunManager();
        }
        return RunManager.instance;
    }

    async restart(id: string, folderPath: string, command: string): Promise<boolean> {
        const stopped = await this.stop(id, folderPath);
        if (!stopped) {
            return false;
        }
        this.setState(RunState.STOPPED, 'Stopped.');
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
            this.mapping.clear();
            const filePaths = await this.addIdsToDirectoryAndCreateMapping(folderPath);
            await this.listen(filePaths);

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
        return this.mapping.get(id);
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

    async cleanProjectDir(folderPath: string): Promise<void> {
        this.mapping.clear();
        if (this.watcher) {
            await this.watcher.unsubscribe();
            this.watcher = null;
        }
        await removeIdsFromDirectory(folderPath);
    }

    async listen(filePaths: string[]) {
        if (this.watcher) {
            await this.watcher.unsubscribe();
            this.watcher = null;
        }

        // @parcel/watcher requires a directory to watch, not individual files
        // We'll extract unique directories from the file paths
        const directories = new Set<string>();
        for (const filePath of filePaths) {
            const directory = filePath.substring(0, filePath.lastIndexOf('/'));
            directories.add(directory);
        }

        // Subscribe to each directory
        for (const directory of directories) {
            try {
                this.watcher = await watcher.subscribe(directory, (err, events) => {
                    if (err) {
                        console.error(`Watcher error: ${err}`);
                        return;
                    }
                    
                    for (const event of events) {
                        // Only process changes to files we're interested in
                        if (event.type === 'update' && filePaths.includes(event.path)) {
                            this.processFileForMapping(event.path);
                        }
                    }
                }, {
                    // Similar options to chokidar's persistent: true
                    backend: 'fs-events',
                });
            } catch (error) {
                console.error(`Failed to watch directory ${directory}: ${error}`);
            }
        }
    }

    addFileToWatcher(filePath: string) {
        for (const allowedExtension of ALLOWED_EXTENSIONS) {
            if (filePath.endsWith(allowedExtension)) {
                // @parcel/watcher doesn't have an add method like chokidar
                // We need to re-subscribe to include the new file's directory
                const directory = filePath.substring(0, filePath.lastIndexOf('/'));
                
                // Process the file immediately
                this.processFileForMapping(filePath);
                break;
            }
        }
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

    async stopAll() {
        for (const dir of this.runningDirs) {
            await this.cleanProjectDir(dir);
        }
        if (this.watcher) {
            await this.watcher.unsubscribe();
            this.watcher = null;
        }
        this.runningDirs.clear();
        this.mapping.clear();
    }
}

export default RunManager.getInstance();
