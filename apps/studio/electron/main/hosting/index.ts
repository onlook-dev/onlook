import { MainChannels } from '@onlook/models/constants';
import { DeployState, VersionStatus, type CreateEnvOptions } from '@onlook/models/hosting';
import { PreviewEnvironmentClient, SupportedFrameworks } from '@zonke-cloud/sdk';
import { exec } from 'node:child_process';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

class HostingManager {
    private static instance: HostingManager;
    private zonke: PreviewEnvironmentClient | null = null;
    private userId: string | null = null;
    private activePolling: Map<string, Timer> = new Map();

    private constructor() {
        this.restoreSettings();
        this.zonke = this.initZonkeClient();
    }

    initZonkeClient() {
        if (
            !import.meta.env.VITE_ZONKE_API_KEY ||
            !import.meta.env.VITE_ZONKE_API_TOKEN ||
            !import.meta.env.VITE_ZONKE_API_ENDPOINT
        ) {
            console.error('Zonke API key, token, and endpoint not found. Disabling hosting.');
            return null;
        }
        return new PreviewEnvironmentClient({
            apiKey: import.meta.env.VITE_ZONKE_API_KEY,
            apiToken: import.meta.env.VITE_ZONKE_API_TOKEN,
            apiEndpoint: import.meta.env.VITE_ZONKE_API_ENDPOINT,
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

    createEnv(options: CreateEnvOptions) {
        if (this.userId === null) {
            console.error('User ID not found');
            return;
        }

        if (!this.zonke) {
            console.error('Zonke client not initialized');
            return;
        }

        const framework = options.framework as SupportedFrameworks;
        const awsHostedZone = 'zonke.market';

        return this.zonke.createPreviewEnvironment({
            userId: this.userId,
            framework,
            awsHostedZone,
        });
    }

    async getEnv(envId: string) {
        if (!this.zonke) {
            console.error('Zonke client not initialized');
            return null;
        }

        try {
            return await this.zonke.getPreviewEnvironment(envId);
        } catch (error) {
            console.error('Failed to get preview environment', error);
            return null;
        }
    }

    async publishEnv(envId: string, folderPath: string, buildScript: string) {
        if (!this.zonke) {
            console.error('Zonke client not initialized');
            return null;
        }

        // TODO: Infer this from project
        const BUILD_OUTPUT_PATH = folderPath + '/.next';

        try {
            const { success, error } = await this.runBuildScript(folderPath, buildScript);
            if (!success) {
                this.emitState(DeployState.ERROR, `Build failed with error: ${error}`);
                return null;
            }

            this.emitState(DeployState.DEPLOYING, 'Creating deployment...');
            const version = await this.zonke.deployToPreviewEnvironment({
                message: 'New deployment',
                environmentId: envId,
                buildOutputDirectory: BUILD_OUTPUT_PATH,
            });

            this.pollDeploymentStatus(envId, version.versionId);
            return version;
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(DeployState.ERROR, 'Deployment failed');
            return null;
        }
    }

    pollDeploymentStatus(envId: string, versionId: string) {
        this.emitState(DeployState.DEPLOYING, 'Checking deployment status...');

        const pollingKey = `${envId}:${versionId}`;

        if (this.activePolling.has(pollingKey)) {
            clearInterval(this.activePolling.get(pollingKey));
            this.activePolling.delete(pollingKey);
        }

        const interval = 3000;
        const timeout = 300000;
        const startTime = Date.now();

        const intervalId = setInterval(async () => {
            try {
                const status = await this.getDeploymentStatus(envId, versionId);
                if (!status) {
                    console.error('Failed to get deployment status');
                    return;
                }

                if (status.status === VersionStatus.SUCCESS) {
                    this.clearPolling(pollingKey);
                    const env = await this.getEnv(envId);
                    this.emitState(DeployState.DEPLOYED, 'Deployment successful', env?.endpoint);
                } else if (status.status === VersionStatus.FAILED) {
                    this.clearPolling(pollingKey);
                    this.emitState(DeployState.ERROR, 'Deployment failed');
                } else if (Date.now() - startTime > timeout) {
                    this.clearPolling(pollingKey);
                    this.emitState(DeployState.ERROR, 'Deployment timed out');
                }
            } catch (error) {
                this.clearPolling(pollingKey);
                console.error('Failed to check deployment status', error);
                this.emitState(DeployState.ERROR, `Failed to check deployment status: ${error}`);
            }
        }, interval);

        this.activePolling.set(pollingKey, intervalId);

        setTimeout(() => {
            this.clearPolling(pollingKey);
        }, timeout);
    }

    private clearPolling(pollingKey: string) {
        if (this.activePolling.has(pollingKey)) {
            clearInterval(this.activePolling.get(pollingKey));
            this.activePolling.delete(pollingKey);
        }
    }

    async getDeploymentStatus(envId: string, versionId: string) {
        if (!this.zonke) {
            console.error('Zonke client not initialized');
            return null;
        }

        return await this.zonke.getDeploymentStatus({
            environmentId: envId,
            sourceVersion: versionId,
        });
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
        if (!this.zonke) {
            console.error('Zonke client not initialized');
            return;
        }

        return this.zonke.deletePreviewEnvironment(envId);
    }
}

export default HostingManager.getInstance();
