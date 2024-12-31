import { MainChannels } from '@onlook/models/constants';
import { DeployState, VersionStatus, type CreateEnvOptions } from '@onlook/models/hosting';
import { PreviewEnvironmentClient, SupportedFrameworks } from '@zonke-cloud/sdk';
import { exec } from 'node:child_process';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';

class HostingManager {
    private static instance: HostingManager;
    private zonke: PreviewEnvironmentClient;
    private userId: string | null = null;

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
            throw new Error('Zonke API key, token, and endpoint must be set');
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

        const framework = options.framework as SupportedFrameworks;
        const awsHostedZone = 'zonke.market';

        return this.zonke.createPreviewEnvironment({
            userId: this.userId,
            framework,
            awsHostedZone,
        });
    }

    async getEnv(envId: string) {
        try {
            return await this.zonke.getPreviewEnvironment(envId);
        } catch (error) {
            console.error('Failed to get preview environment', error);
            return null;
        }
    }

    async publishEnv(envId: string, folderPath: string, buildScript: string) {
        console.log('Publishing environment', {
            envId,
            folderPath,
            buildScript,
        });

        // TODO: Infer this from project
        const BUILD_OUTPUT_PATH = folderPath + '/.next';

        try {
            this.emitState(DeployState.BUILDING, 'Building project');
            const success = await this.runBuildScript(folderPath, buildScript);
            if (!success) {
                this.emitState(DeployState.ERROR, 'Build failed');
                return null;
            }

            this.emitState(DeployState.DEPLOYING, 'Deploying to preview environment');
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
        const interval = 3000;
        const timeout = 300000;
        const startTime = Date.now();

        const intervalId = setInterval(async () => {
            try {
                const status = await this.getDeploymentStatus(envId, versionId);

                if (status.status === VersionStatus.SUCCESS) {
                    clearInterval(intervalId);
                    const env = await this.getEnv(envId);
                    this.emitState(DeployState.DEPLOYED, 'Deployment successful', env?.endpoint);
                } else if (status.status === VersionStatus.FAILED) {
                    clearInterval(intervalId);
                    this.emitState(DeployState.ERROR, 'Deployment failed');
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(intervalId);
                    this.emitState(DeployState.ERROR, 'Deployment timed out');
                }
            } catch (error) {
                clearInterval(intervalId);
                this.emitState(DeployState.ERROR, 'Failed to check deployment status');
            }
        }, interval);

        setTimeout(() => {
            clearInterval(intervalId);
        }, timeout);
    }

    async getDeploymentStatus(envId: string, versionId: string) {
        return await this.zonke.getDeploymentStatus({
            environmentId: envId,
            sourceVersion: versionId,
        });
    }

    runBuildScript(folderPath: string, buildScript: string): Promise<boolean> {
        this.emitState(DeployState.BUILDING, 'Building project');

        return new Promise((resolve, reject) => {
            exec(
                buildScript,
                { cwd: folderPath, env: { ...process.env, NODE_ENV: 'production' } },
                (error: Error | null, stdout: string, stderr: string) => {
                    if (error) {
                        console.error(`Build script error: ${error}`);
                        resolve(false);
                        return;
                    }

                    if (stderr) {
                        console.warn(`Build script stderr: ${stderr}`);
                    }

                    console.log(`Build script output: ${stdout}`);
                    resolve(true);
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
        return this.zonke.deletePreviewEnvironment(envId);
    }
}

export default HostingManager.getInstance();
