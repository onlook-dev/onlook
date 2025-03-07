import {
    addBuiltWithScript,
    injectBuiltWithScript,
    removeBuiltWithScript,
    removeBuiltWithScriptFromLayout,
} from '@onlook/growth';
import {
    ApiRoutes,
    BASE_API_ROUTE,
    CUSTOM_OUTPUT_DIR,
    FUNCTIONS_ROUTE,
    HostingRoutes,
    MainChannels,
} from '@onlook/models/constants';
import { PublishStatus, type PublishRequest, type PublishResponse } from '@onlook/models/hosting';
import {
    type FreestyleDeployWebConfiguration,
    type FreestyleDeployWebSuccessResponse,
} from 'freestyle-sandboxes';
import { mainWindow } from '..';
import analytics from '../analytics';
import { getRefreshedAuthTokens } from '../auth';
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

    async publish({
        folderPath,
        buildScript,
        urls,
        options,
    }: PublishRequest): Promise<PublishResponse> {
        try {
            const timer = new LogTimer('Deployment');
            this.emitState(PublishStatus.LOADING, 'Preparing project...');

            await this.runPrepareStep(folderPath);
            this.emitState(PublishStatus.LOADING, 'Creating optimized build...');
            timer.log('Prepare completed');

            if (!options?.skipBadge) {
                this.emitState(PublishStatus.LOADING, 'Adding badge...');
                await this.addBadge(folderPath);
                timer.log('"Built with Onlook" badge added');
            }

            // Run the build script
            await this.runBuildStep(folderPath, buildScript, options?.skipBuild);
            this.emitState(PublishStatus.LOADING, 'Preparing project for deployment...');
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

            this.emitState(PublishStatus.LOADING, 'Deploying project...');
            timer.log('Files serialized, sending to Freestyle...');

            const id = await this.sendHostingPostRequest(files, urls);
            timer.log('Deployment completed');

            this.emitState(PublishStatus.PUBLISHED, 'Deployment successful, deployment ID: ' + id);

            if (!options?.skipBadge) {
                await this.removeBadge(folderPath);
                timer.log('"Built with Onlook" badge removed');
            }

            return {
                success: true,
                message: 'Deployment successful, deployment ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to deploy to preview environment', error);
            this.emitState(PublishStatus.ERROR, 'Deployment failed with error: ' + error);
            analytics.trackError('Failed to deploy to preview environment', {
                error,
            });
            return {
                success: false,
                message: 'Deployment failed with error: ' + error,
            };
        }
    }

    async addBadge(folderPath: string) {
        await injectBuiltWithScript(folderPath);
        await addBuiltWithScript(folderPath);
    }

    async removeBadge(folderPath: string) {
        await removeBuiltWithScriptFromLayout(folderPath);
        await removeBuiltWithScript(folderPath);
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
        const {
            success: buildSuccess,
            error: buildError,
            output: buildOutput,
        } = await runBuildScript(folderPath, BUILD_SCRIPT_NO_LINT);

        if (!buildSuccess) {
            this.emitState(PublishStatus.ERROR, `Build failed with error: ${buildError}`);
            throw new Error(`Build failed with error: ${buildError}`);
        } else {
            console.log('Build succeeded with output: ', buildOutput);
        }
    }

    emitState(state: PublishStatus, message?: string) {
        console.log(`Deployment state: ${state} - ${message}`);
        mainWindow?.webContents.send(MainChannels.PUBLISH_STATE_CHANGED, {
            state,
            message,
        });
        analytics.track(`hosting state updated`, {
            state,
            message,
        });
    }

    async unpublish(urls: string[]): Promise<PublishResponse> {
        try {
            const id = await this.sendHostingPostRequest({}, urls);
            this.emitState(PublishStatus.UNPUBLISHED, 'Deployment deleted with ID: ' + id);

            analytics.track('hosting unpublish', {
                state: PublishStatus.UNPUBLISHED,
                message: 'Deployment deleted with ID: ' + id,
            });
            return {
                success: true,
                message: 'Deployment deleted with ID: ' + id,
            };
        } catch (error) {
            console.error('Failed to delete deployment', error);
            this.emitState(PublishStatus.ERROR, 'Failed to delete deployment');
            analytics.trackError('Failed to delete deployment', {
                error,
            });
            return {
                success: false,
                message: 'Failed to delete deployment. ' + error,
            };
        }
    }

    async sendHostingPostRequest(files: FileRecord, urls: string[]): Promise<string> {
        const authTokens = await getRefreshedAuthTokens();
        const config: FreestyleDeployWebConfiguration = {
            domains: urls,
            entrypoint: 'server.js',
        };

        const res: Response = await fetch(
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_API_ROUTE}${ApiRoutes.HOSTING_V2}${HostingRoutes.DEPLOY_WEB}`,
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
        if (!res.ok) {
            throw new Error(`Failed to deploy to preview environment, error: ${res.statusText}`);
        }
        const freestyleResponse = (await res.json()) as {
            success: boolean;
            message?: string;
            error?: string;
            data?: FreestyleDeployWebSuccessResponse;
        };

        if (!freestyleResponse.success) {
            throw new Error(
                `Failed to deploy to preview environment, error: ${freestyleResponse.error || freestyleResponse.message}`,
            );
        }

        return freestyleResponse.data?.deploymentId ?? '';
    }
}

export default HostingManager.getInstance();
