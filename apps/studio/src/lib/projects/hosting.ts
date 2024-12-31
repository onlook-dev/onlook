import { MainChannels } from '@onlook/models/constants';
import { DeployState } from '@onlook/models/hosting';
import type { Project } from '@onlook/models/projects';
import type { PreviewEnvironment } from '@zonke-cloud/sdk';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class HostingManager {
    private project: Project;
    state: {
        status: DeployState;
        message: string | null;
        error: string | null;
        env: PreviewEnvironment | null;
    } = {
        status: DeployState.NONE,
        message: null,
        error: null,
        env: null,
    };

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
        this.listenForStateChanges();
    }

    async listenForStateChanges() {
        window.api.on(MainChannels.DEPLOY_STATE_CHANGED, async (args) => {
            const { state, message } = args as { state: DeployState; message: string };
            this.state = {
                status: state,
                message,
                error: null,
                env: this.state.env,
            };
        });
    }

    async restoreState() {
        this.state.env = await this.getEnv();
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
        this.state.env = res;
    }

    async getEnv() {
        const res = await invokeMainChannel(MainChannels.GET_PROJECT_HOSTING_ENV, {
            envId: '850540f8-a168-43a6-9772-6a1727d73b93',
        });
        return res as PreviewEnvironment | null;
    }

    async publish() {
        const folderPath = this.project.folderPath;
        const buildScript: string = this.project.commands?.build || 'npm run build';
        const envId = this.state.env?.environmentId;

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
        return [DeployState.BUILDING, DeployState.DEPLOYING].includes(this.state.status);
    }

    async dispose() {}

    async getDeploymentStatus(envId: string, versionId: string) {
        const res = await invokeMainChannel(MainChannels.GET_DEPLOYMENT_STATUS, {
            envId,
            versionId,
        });
        return res;
    }
}
