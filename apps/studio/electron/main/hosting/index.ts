import { MainChannels } from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { mainWindow } from '..';
import { PersistentStorage } from '../storage';
import { prepareNextProject, runBuildScript, serializeFiles } from './helpers';

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

    async deploy(
        folderPath: string,
        buildScript: string,
        url: string,
    ): Promise<{
        state: HostingStatus;
        message?: string;
    }> {
        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            this.emitState(HostingStatus.ERROR, 'Hosting client not initialized');
            return { state: HostingStatus.ERROR, message: 'Hosting client not initialized' };
        }

        // TODO: Infer this from project
        const BUILD_OUTPUT_PATH = folderPath + '/.next';
        const BUILD_SCRIPT_NO_LINT = buildScript + ' -- --no-lint';

        try {
            this.emitState(HostingStatus.DEPLOYING, 'Creating optimized build...');

            const STANDALONE_PATH = BUILD_OUTPUT_PATH + '/standalone';
            const { success, error } = await runBuildScript(folderPath, BUILD_SCRIPT_NO_LINT);
            if (!success) {
                this.emitState(HostingStatus.ERROR, `Build failed with error: ${error}`);
                return {
                    state: HostingStatus.ERROR,
                    message: `Build failed with error: ${error}`,
                };
            }

            const preparedResult = prepareNextProject(folderPath);
            if (!preparedResult) {
                this.emitState(
                    HostingStatus.ERROR,
                    'Failed to prepare project for deployment, no lock file found',
                );
                return {
                    state: HostingStatus.ERROR,
                    message: 'Failed to prepare project for deployment, no lock file found',
                };
            }

            this.emitState(HostingStatus.DEPLOYING, 'Creating deployment...');
            const files = serializeFiles(STANDALONE_PATH);

            const config = {
                domains: [url],
                entrypoint: 'server.js',
            };

            const res: FreestyleDeployWebSuccessResponse = await this.freestyle.deployWeb(
                files,
                config,
            );

            if (!res.projectId) {
                console.error('Failed to deploy to preview environment', res);
                this.emitState(HostingStatus.ERROR, 'Deployment failed with error: ' + res);
                return {
                    state: HostingStatus.ERROR,
                    message: 'Deployment failed with error: ' + res,
                };
            }

            this.emitState(
                HostingStatus.READY,
                'Deployment successful, project ID: ' + res.projectId,
            );

            return {
                state: HostingStatus.READY,
                message: 'Deployment successful, project ID: ' + res.projectId,
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(HostingStatus.ERROR, 'Deployment failed with error: ' + error);
            return {
                state: HostingStatus.ERROR,
                message: 'Deployment failed with error: ' + error,
            };
        }
    }

    emitState(state: HostingStatus, message?: string) {
        console.log('Deployment state changed', state, message);
        mainWindow?.webContents.send(MainChannels.DEPLOY_STATE_CHANGED, {
            state,
            message,
        });
    }

    deleteEnv(envId: string) {
        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            return;
        }

        // TODO: Implement
    }
}

export default HostingManager.getInstance();
