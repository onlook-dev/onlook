import { MainChannels } from '@onlook/models/constants';
import { DeployState } from '@onlook/models/hosting';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { readdirSync, readFileSync, statSync } from 'fs';
import { exec } from 'node:child_process';
import { join } from 'node:path';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

class HostingManager {
    private static instance: HostingManager;
    private freestyle: FreestyleSandboxes | null = null;
    private userId: string | null = null;
    private activePolling: Map<string, Timer> = new Map();

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

    // createEnv(options: CreateEnvOptions) {
    //     if (this.userId === null) {
    //         console.error('User ID not found');
    //         return;
    //     }

    //     if (!this.freestyle) {
    //         console.error('Zonke client not initialized');
    //         return;
    //     }

    //     const framework = options.framework as SupportedFrameworks;
    //     const awsHostedZone = 'zonke.market';

    //     return this.freestyle.createPreviewEnvironment({
    //         userId: this.userId,
    //         framework,
    //         awsHostedZone,
    //     });
    // }

    async getEnv(envId: string) {
        // if (!this.freestyle) {
        //     console.error('Zonke client not initialized');
        //     return null;
        // }
        // try {
        //     return await this.freestyle.getPreviewEnvironment(envId);
        // } catch (error) {
        //     console.error('Failed to get preview environment', error);
        //     return null;
        // }
    }

    async publishEnv(envId: string, folderPath: string, buildScript: string) {
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

            this.emitState(DeployState.DEPLOYING, 'Creating deployment...');
            const files = readFilesRecursively(STANDALONE_PATH);
            console.log('Files...', Object.keys(files));
            const res: FreestyleDeployWebSuccessResponse = await this.freestyle.deployWeb(
                { ...files, '.next/testben.txt': 'ben is testing' },
                {
                    entrypoint: 'server.js',
                },
            );

            this.emitState(DeployState.DEPLOYED, 'Deployment successful', res.projectId);
            return res;
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(DeployState.ERROR, 'Deployment failed');
            return null;
        }
    }

    pollDeploymentStatus(envId: string, versionId: string) {
        // this.emitState(DeployState.DEPLOYING, 'Checking deployment status...');
        // const pollingKey = `${envId}:${versionId}`;
        // if (this.activePolling.has(pollingKey)) {
        //     clearInterval(this.activePolling.get(pollingKey));
        //     this.activePolling.delete(pollingKey);
        // }
        // const interval = 3000;
        // const timeout = 300000;
        // const startTime = Date.now();
        // const intervalId = setInterval(async () => {
        //     try {
        //         const status = await this.getDeploymentStatus(envId, versionId);
        //         if (!status) {
        //             console.error('Failed to get deployment status');
        //             return;
        //         }
        //         if (status.status === VersionStatus.SUCCESS) {
        //             this.clearPolling(pollingKey);
        //             const env = await this.getEnv(envId);
        //             this.emitState(DeployState.DEPLOYED, 'Deployment successful', env?.endpoint);
        //         } else if (status.status === VersionStatus.FAILED) {
        //             this.clearPolling(pollingKey);
        //             this.emitState(DeployState.ERROR, 'Deployment failed');
        //         } else if (Date.now() - startTime > timeout) {
        //             this.clearPolling(pollingKey);
        //             this.emitState(DeployState.ERROR, 'Deployment timed out');
        //         }
        //     } catch (error) {
        //         this.clearPolling(pollingKey);
        //         console.error('Failed to check deployment status', error);
        //         this.emitState(DeployState.ERROR, `Failed to check deployment status: ${error}`);
        //     }
        // }, interval);
        // this.activePolling.set(pollingKey, intervalId);
        // setTimeout(() => {
        //     this.clearPolling(pollingKey);
        // }, timeout);
    }

    private clearPolling(pollingKey: string) {
        if (this.activePolling.has(pollingKey)) {
            clearInterval(this.activePolling.get(pollingKey));
            this.activePolling.delete(pollingKey);
        }
    }

    async getDeploymentStatus(envId: string, versionId: string) {
        if (!this.freestyle) {
            console.error('Zonke client not initialized');
            return null;
        }

        // return await this.freestyle.getDeploymentStatus({
        //     environmentId: envId,
        //     sourceVersion: versionId,
        // });
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

        // return this.freestyle.deletePreviewEnvironment(envId);
    }
}

function readFilesRecursively(currentDir: string, basePath: string = ''): Record<string, string> {
    const files: Record<string, string> = {};

    for (const entry of readdirSync(currentDir)) {
        const entryPath = join(currentDir, entry);
        if (entryPath.includes('node_modules')) {
            continue;
        }

        const stats = statSync(entryPath);
        if (stats.isDirectory()) {
            Object.assign(files, readFilesRecursively(entryPath, `${basePath}${entry}/`));
        } else if (stats.isFile()) {
            files[`${basePath}${entry}`] = readFileSync(entryPath, 'utf-8');
        }
    }

    return files;
}

export default HostingManager.getInstance();
