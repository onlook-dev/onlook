import { CUSTOM_OUTPUT_DIR, MainChannels } from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import { FreestyleSandboxes, type FreestyleDeployWebSuccessResponse } from 'freestyle-sandboxes';
import { mainWindow } from '..';
import analytics from '../analytics';
import {
    postprocessNextBuild,
    preprocessNextBuild,
    runBuildScript,
    serializeFiles,
} from './helpers';
import { LogTimer } from '/common/helpers/timer';

class HostingManager {
    private static instance: HostingManager;
    private freestyle: FreestyleSandboxes | null = null;

    private constructor() {
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

        try {
            this.emitState(HostingStatus.DEPLOYING, 'Preparing project...');

            const { success: preprocessSuccess, error: preprocessError } =
                await preprocessNextBuild(folderPath);

            if (!preprocessSuccess) {
                this.emitState(
                    HostingStatus.ERROR,
                    'Failed to prepare project for deployment, error: ' + preprocessError,
                );
                return {
                    state: HostingStatus.ERROR,
                    message: 'Failed to prepare project for deployment, error: ' + preprocessError,
                };
            }

            this.emitState(HostingStatus.DEPLOYING, 'Creating optimized build...');
            timer.log('Starting build');

            const BUILD_SCRIPT_NO_LINT = `${buildScript} -- --no-lint`;
            const { success: buildSuccess, error: buildError } = await runBuildScript(
                folderPath,
                BUILD_SCRIPT_NO_LINT,
            );
            timer.log('Build completed');

            if (!buildSuccess) {
                this.emitState(HostingStatus.ERROR, `Build failed with error: ${buildError}`);
                return {
                    state: HostingStatus.ERROR,
                    message: `Build failed with error: ${buildError}`,
                };
            }

            this.emitState(HostingStatus.DEPLOYING, 'Preparing project for deployment...');

            const { success: postprocessSuccess, error: postprocessError } =
                await postprocessNextBuild(folderPath);
            timer.log('Project preparation completed');

            if (!postprocessSuccess) {
                this.emitState(
                    HostingStatus.ERROR,
                    'Failed to postprocess project for deployment, error: ' + postprocessError,
                );
                return {
                    state: HostingStatus.ERROR,
                    message:
                        'Failed to postprocess project for deployment, error: ' + postprocessError,
                };
            }

            const NEXT_BUILD_OUTPUT_PATH = `${folderPath}/${CUSTOM_OUTPUT_DIR}/standalone`;
            const files = serializeFiles(NEXT_BUILD_OUTPUT_PATH);
            timer.log('Files serialized');

            const config = {
                domains: [url],
                entrypoint: 'server.js',
            };

            this.emitState(HostingStatus.DEPLOYING, 'Deploying project...');

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

    async unpublish(url: string): Promise<{
        success: boolean;
        message?: string;
    }> {
        if (!this.freestyle) {
            console.error('Freestyle client not initialized');
            return {
                success: false,
                message: 'Freestyle client not initialized',
            };
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
                return {
                    success: false,
                    message: 'Failed to delete deployment. ' + res,
                };
            }

            this.emitState(HostingStatus.NO_ENV, 'Deployment deleted');

            analytics.track('hosting unpublish', {
                state: HostingStatus.NO_ENV,
                message: 'Deployment deleted',
            });
            return {
                success: true,
                message: 'Deployment deleted',
            };
        } catch (error) {
            console.error('Failed to delete deployment', error);
            this.emitState(HostingStatus.ERROR, 'Failed to delete deployment');
            analytics.trackError('Failed to delete deployment', {
                error,
            });
            return {
                success: false,
                message: 'Failed to delete deployment. ' + error,
            };
        }
    }
}

export default HostingManager.getInstance();
