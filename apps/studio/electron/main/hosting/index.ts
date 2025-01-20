import {
    ApiRoutes,
    BASE_API_ROUTE,
    CUSTOM_OUTPUT_DIR,
    FUNCTIONS_ROUTE,
    MainChannels,
} from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import {
    type FreestyleDeployWebConfiguration,
    type FreestyleDeployWebSuccessResponse,
} from 'freestyle-sandboxes';
import { mainWindow } from '..';
import analytics from '../analytics';
import { PersistentStorage } from '../storage';
import {
    postprocessNextBuild,
    preprocessNextBuild,
    runBuildScript,
    serializeFiles,
    updateGitignore,
    type FileRecord,
} from './helpers';
import { LogTimer } from '/common/helpers/timer';

class HostingManager {
    private static instance: HostingManager;

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
        skipBuild: boolean = false,
    ): Promise<{
        state: HostingStatus;
        message?: string;
    }> {
        try {
            const timer = new LogTimer('Deployment');
            this.emitState(HostingStatus.DEPLOYING, 'Preparing project...');

            await this.runPrepareStep(folderPath);
            this.emitState(HostingStatus.DEPLOYING, 'Creating optimized build...');
            timer.log('Prepare completed');

            // Run the build script
            await this.runBuildStep(folderPath, buildScript, skipBuild);
            this.emitState(HostingStatus.DEPLOYING, 'Preparing project for deployment...');
            timer.log('Build completed');

            // Postprocess the project for deployment
            const { success: postprocessSuccess, error: postprocessError } =
                await postprocessNextBuild(folderPath);
            timer.log('Project preparation completed');

            if (!postprocessSuccess) {
                throw new Error(
                    `Failed to postprocess project for deployment, error: ${postprocessError}`,
                );
            }

            // Serialize the files for deployment
            const NEXT_BUILD_OUTPUT_PATH = `${folderPath}/${CUSTOM_OUTPUT_DIR}/standalone`;
            const files: FileRecord = serializeFiles(NEXT_BUILD_OUTPUT_PATH);

            this.emitState(HostingStatus.DEPLOYING, 'Deploying project...');
            timer.log('Files serialized, sending to Freestyle...');

            const id = await this.sendHostingPostRequest(files, url);
            timer.log('Deployment completed');

            this.emitState(HostingStatus.READY, 'Deployment successful, deployment ID: ' + id);

            return {
                state: HostingStatus.READY,
                message: 'Deployment successful, deployment ID: ' + id,
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

    async runPrepareStep(folderPath: string) {
        // Preprocess the project
        const { success: preprocessSuccess, error: preprocessError } =
            await preprocessNextBuild(folderPath);

        if (!preprocessSuccess) {
            throw new Error(`Failed to prepare project for deployment, error: ${preprocessError}`);
        }

        // Update .gitignore to ignore the custom output directory
        const gitignoreSuccess = updateGitignore(folderPath, CUSTOM_OUTPUT_DIR);
        if (!gitignoreSuccess) {
            console.warn('Failed to update .gitignore');
        }
    }

    async runBuildStep(folderPath: string, buildScript: string, skipBuild: boolean = false) {
        const BUILD_SCRIPT_NO_LINT = `${buildScript} -- --no-lint`;
        if (skipBuild) {
            console.log('Skipping build');
            return;
        }
        const { success: buildSuccess, error: buildError } = await runBuildScript(
            folderPath,
            BUILD_SCRIPT_NO_LINT,
        );

        if (!buildSuccess) {
            this.emitState(HostingStatus.ERROR, `Build failed with error: ${buildError}`);
            throw new Error(`Build failed with error: ${buildError}`);
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
        try {
            const id = await this.sendHostingPostRequest({}, url);
            console.log('Deployment deleted with ID', id);
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

    async sendHostingPostRequest(files: FileRecord, url: string): Promise<string> {
        const authTokens = PersistentStorage.AUTH_TOKENS.read();
        if (!authTokens) {
            throw new Error('No auth tokens found');
        }

        const config: FreestyleDeployWebConfiguration = {
            domains: [url],
            entrypoint: 'server.js',
        };

        const res: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authTokens.accessToken}`,
                },
                body: JSON.stringify({
                    files,
                    config,
                }),
            },
        );
        const freestyleResponse = (await res.json()) as {
            success: boolean;
            message?: string;
            error?: string;
            data?: FreestyleDeployWebSuccessResponse;
        };

        if (!freestyleResponse.success) {
            throw new Error(
                `Failed to deploy to preview environment, error: ${freestyleResponse.error}`,
            );
        }

        return freestyleResponse.data?.deploymentId ?? '';
    }
}

export default HostingManager.getInstance();
