import { MainChannels } from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { mainWindow } from '..';
import analytics from '../analytics';
import { PersistentStorage } from '../storage';
import { prepareNextProject, runBuildScript, serializeFiles } from './helpers';
import { LogTimer } from '/common/helpers/timer';

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
        const timer = new LogTimer('Deployment');

        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            this.emitState(HostingStatus.ERROR, 'Hosting client not initialized');
            return { state: HostingStatus.ERROR, message: 'Hosting client not initialized' };
        }

        // TODO: Check if project is a Next.js project

        const BUILD_OUTPUT_PATH = folderPath + '/.next';
        const BUILD_SCRIPT_NO_LINT = buildScript + ' -- --no-lint';

        try {
            this.emitState(HostingStatus.DEPLOYING, 'Creating optimized build...');
            timer.log('Starting build');

            const STANDALONE_PATH = BUILD_OUTPUT_PATH + '/standalone';
            const { success, error } = await runBuildScript(folderPath, BUILD_SCRIPT_NO_LINT);
            timer.log('Build completed');

            if (!success) {
                this.emitState(HostingStatus.ERROR, `Build failed with error: ${error}`);
                return {
                    state: HostingStatus.ERROR,
                    message: `Build failed with error: ${error}`,
                };
            }

            const preparedResult = await prepareNextProject(folderPath);
            timer.log('Project preparation completed');

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
            timer.log('Files serialized');

            const config = {
                domains: [url],
                entrypoint: 'server.js',
            };

            const res: FreestyleDeployWebSuccessResponse = await this.freestyle.deployWeb(
                files,
                config,
            );
            timer.log('Deployment completed');

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
            analytics.trackError('Failed to deploy to preview environment', {
                error,
            });
            return {
                state: HostingStatus.ERROR,
                message: 'Deployment failed with error: ' + error,
            };
        }
    }

    emitState(state: HostingStatus, message?: string) {
        console.log(`Deployment state: ${state} - ${message}`);
        mainWindow?.webContents.send(MainChannels.DEPLOY_STATE_CHANGED, {
            state,
            message,
        });
        analytics.track(`hosting state updated`, {
            state,
            message,
        });
    }

    async unpublish(url: string) {
        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            return;
        }

        const config = {
            domains: [url],
        };

        try {
            const res: FreestyleDeployWebSuccessResponse = await this.freestyle.deployWeb(
                {},
                config,
            );

            if (!res.projectId) {
                console.error('Failed to delete deployment', res);
                return false;
            }

            this.emitState(HostingStatus.NO_ENV, 'Deployment deleted');

            analytics.track('hosting unpublish', {
                state: HostingStatus.NO_ENV,
                message: 'Deployment deleted',
            });
            return true;
        } catch (error) {
            console.error('Failed to delete deployment', error);
            this.emitState(HostingStatus.ERROR, 'Failed to delete deployment');
            analytics.trackError('Failed to delete deployment', {
                error,
            });
            return false;
        }
    }
}

export default HostingManager.getInstance();
