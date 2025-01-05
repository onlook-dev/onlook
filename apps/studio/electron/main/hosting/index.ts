import { MainChannels } from '@onlook/models/constants';
import { DeployState } from '@onlook/models/hosting';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

class HostingManager {
    private static instance: HostingManager;
    private freestyle: FreestyleSandboxes | null = null;
    private userId: string | null = null;

    private constructor() {
        this.restoreSettings();
        this.freestyle = this.initFreestyleClient();
    }

    initFreestyleClient() {
        if (!import.meta.env.VITE_FREESTYLE_API_KEY) {
            console.error('Freestyle API key not found. Disabling hosting.');
            return null;
        }
        return new FreestyleSandboxes({
            apiKey: import.meta.env.VITE_FREESTYLE_API_KEY,
        });
    }

    public static getInstance(): HostingManager {
        if (!HostingManager.instance) {
            HostingManager.instance = new HostingManager();
        }
        return HostingManager.instance;
    }

    private restoreSettings() {
        const settings = PersistentStorage.USER_SETTINGS.read() || {};
        this.userId = settings.id || null;
    }

    async publishEnv(folderPath: string, buildScript: string) {
        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            return null;
        }

        // TODO: Infer this from project
        const BUILD_OUTPUT_PATH = folderPath + '/.next';

        try {
            this.emitState(DeployState.BUILDING, 'Building project...');

            const STANDALONE_PATH = BUILD_OUTPUT_PATH + '/standalone';
            const { success, error } = await this.runBuildScript(folderPath, buildScript);
            if (!success) {
                this.emitState(DeployState.ERROR, `Build failed with error: ${error}`);
                return null;
            }

            prepareNextProject(folderPath);

            this.emitState(DeployState.DEPLOYING, 'Creating deployment...');
            const files = readDir(STANDALONE_PATH);
            const res: FreestyleDeployWebSuccessResponse = await this.freestyle.deployWeb(
                { ...files, '.next/testben.txt': 'ben is testing' },
                {
                    domains: ['test.onlook.live'],
                    entrypoint: 'server.js',
                },
            );

            console.log('DEPLOYMENT RESPONSE', res);
            this.emitState(DeployState.DEPLOYED, 'Deployment successful', res.projectId);
            return res;
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(DeployState.ERROR, 'Deployment failed');
            return null;
        }
    }

    runBuildScript(
        folderPath: string,
        buildScript: string,
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        this.emitState(DeployState.BUILDING, 'Building project...');

        return new Promise((resolve, reject) => {
            exec(
                buildScript,
                { cwd: folderPath, env: { ...process.env, NODE_ENV: 'production' } },
                (error: Error | null, stdout: string, stderr: string) => {
                    if (error) {
                        console.error(`Build script error: ${error}`);
                        resolve({ success: false, error: error.message });
                        return;
                    }

                    if (stderr) {
                        console.warn(`Build script stderr: ${stderr}`);
                    }

                    console.log(`Build script output: ${stdout}`);
                    resolve({ success: true });
                },
            );
        });
    }

    emitState(state: DeployState, message?: string, endpoint?: string) {
        mainWindow?.webContents.send(MainChannels.DEPLOY_STATE_CHANGED, {
            state,
            message,
            endpoint,
        });
    }

    deleteEnv(envId: string) {
        if (!this.freestyle) {
            console.error('Zonke client not initialized');
            return;
        }

        // TODO: Implement
    }
}

function readDir(currentDir: string, basePath: string = ''): Record<string, string> {
    const files: Record<string, string> = {};

    for (const entry of readdirSync(currentDir)) {
        const entryPath = join(currentDir, entry);
        if (entryPath.includes('node_modules')) {
            continue;
        }

        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
            Object.assign(files, readDir(entryPath, `${basePath}${entry}/`));
        } else if (stats.isFile()) {
            files[`${basePath}${entry}`] = readFileSync(entryPath, 'utf-8');
        }
    }

    return files;
}

function prepareNextProject(project_dir: string) {
    copyDir(project_dir + '/public', project_dir + '/.next/standalone/public');
    copyDir(project_dir + '/.next/static', project_dir + '/.next/standalone/.next/static');
    if (existsSync(project_dir + '/bun.lock')) {
        copyFileSync(project_dir + '/bun.lock', project_dir + '/.next/standalone/bun.lock');
    }
}

function copyDir(src: string, dest: string) {
    if (!existsSync(src)) {
        return;
    }
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

export default HostingManager.getInstance();
