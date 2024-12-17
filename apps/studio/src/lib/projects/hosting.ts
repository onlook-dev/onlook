import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { PreviewEnvironment } from '@zonke-cloud/sdk';
import { makeAutoObservable } from 'mobx';
import { DeployState, DeploymentStatus } from '../../../../electron/main/hosting';
import { invokeMainChannel } from '../utils';

export class HostingManager {
    private project: Project;
    env: PreviewEnvironment | null = null;
    deploymentStatus: DeploymentStatus = { state: DeployState.NONE };

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
        this.setupListeners();
    }

    private setupListeners() {
        // Listen for deployment state changes
        window.api.on(MainChannels.DEPLOY_STATE_CHANGED, (status: DeploymentStatus) => {
            this.deploymentStatus = status;

            // Update env endpoint if deployment is successful and endpoint is provided
            if (status.state === DeployState.DEPLOYED && status.endpoint && this.env) {
                this.env.endpoint = status.endpoint;
            }
        });
    }

    async restoreState() {
        this.env = await this.getEnv();
    }

    async create() {
        const res: PreviewEnvironment | null = await invokeMainChannel(
            MainChannels.CREATE_PROJECT_HOSTING_ENV,
            {
                userId: 'testUserId',
                framework: 'nextjs',
            },
        );
        if (!res) {
            console.error('Failed to create hosting environment');
            return;
        }
        this.env = res;
    }

    async getEnv() {
        const res = await invokeMainChannel(MainChannels.GET_PROJECT_HOSTING_ENV, {
            projectId: this.project.id,
        });
        return res as PreviewEnvironment | null;
    }

    async publish() {
        const folderPath = this.project.folderPath;
        const buildScript: string = this.project.commands?.build || 'npm run build';
        const envId = this.env?.environmentId;

        if (!folderPath || !buildScript || !envId) {
            console.error('Missing required data for publishing');
            return;
        }

        const res = await invokeMainChannel(MainChannels.PUBLISH_PROJECT_HOSTING_ENV, {
            folderPath,
            buildScript,
            envId,
        });

        if (!res) {
            console.error('Failed to publish hosting environment');
        }
    }

    get isDeploying() {
        return [DeployState.BUILDING, DeployState.DEPLOYING].includes(this.deploymentStatus.state);
    }

    get deploymentMessage() {
        return this.deploymentStatus.message;
    }

    async stop() {
        // if (!this.env) {
        //     console.error('No hosting environment to stop');
        //     return;
        // }
        // await invokeMainChannel(MainChannels.STOP_PROJECT_HOSTING_ENV, {
        //     envId: this.env.environmentId,
        // });
    }

    async restart() { }

    async dispose() {
        await this.stop();
    }
}
