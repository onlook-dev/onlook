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
    private mapping = new Map<string, TemplateNode>();
    private watcher: FSWatcher | null = null;
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
            await this.addIdsToDirectoryAndCreateMapping(folderPath);
            await this.listen(folderPath);

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
        await this.watcher?.close();
        this.watcher = null;
        await removeIdsFromDirectory(folderPath);
    }

    async listen(folderPath: string) {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }

        this.watcher = watch(folderPath, {
            persistent: true,
            ignoreInitial: true,
            ignored: [
                /(^|[/\\])\..*~$/,
                /(^|[/\\])node_modules([/\\]|$)/,
                /(^|[/\\])dist([/\\]|$)/,
                /(^|[/\\])build([/\\]|$)/,
                /(^|[/\\])coverage([/\\]|$)/,
                /(^|[/\\])*.lock/,
                /(^|[/\\])*.log/,
                /(^|[/\\])\.[^/\\]/,
            ],
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100,
            },
            followSymlinks: false,
            usePolling: false,
            atomic: true,
        });

        this.watcher
            .on('change', async (filePath) => {
                this.watcher?.unwatch(filePath);
                await this.processFileForMapping(filePath);
                setTimeout(() => this.watcher?.add(filePath), 500);
            })
            .on('add', async (filePath) => {
                this.watcher?.unwatch(filePath);
                await this.processFileForMapping(filePath);
                setTimeout(() => this.watcher?.add(filePath), 500);
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
        await this.watcher?.close();
        this.watcher = null;
        this.runningDirs.clear();
        this.mapping.clear();
    }
}

export default RunManager.getInstance();
