import { MainChannels } from '@onlook/models/constants';
import { DeployState, HostingState } from '@onlook/models/hosting';
import type { Project } from '@onlook/models/projects';
import type { UserSettings } from '@onlook/models/settings';
import type { PreviewEnvironment } from '@zonke-cloud/sdk';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class HostingManager {
    private project: Project;
    state: {
        status: HostingState;
        message: string | null;
        error: string | null;
        env: PreviewEnvironment | null;
        deployState: DeployState | null;
    } = {
        status: HostingState.NO_ENV,
        message: null,
        error: null,
        env: null,
        deployState: null,
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
            this.state.deployState = state;
            this.state.message = message;
            this.state.error = null;
        });
    }

    async restoreState() {
        this.state.env = await this.getEnv();
    }

    async createEnv(user: UserSettings) {
        const res: PreviewEnvironment | null = await invokeMainChannel(
            MainChannels.CREATE_HOSTING_ENV,
            {
                userId: user.id,
                framework: 'nextjs',
            },
        );
        if (!res) {
            console.error('Failed to create hosting environment');
            return;
        }
        this.state.env = res;
    }

    async getEnv(): Promise<PreviewEnvironment | null> {
        if (!this.project.hosting?.envId) {
            console.error('No hosting env found');
            return null;
        }
        const res: PreviewEnvironment | null = await invokeMainChannel(
            MainChannels.GET_HOSTING_ENV,
            {
                envId: this.project.hosting?.envId,
            },
        );
        return res;
    }

    async publish() {
        const folderPath = this.project.folderPath;
        const buildScript: string = this.project.commands?.build || 'npm run build';
        const envId = this.state.env?.environmentId;

        if (!folderPath || !buildScript || !envId) {
            console.error('Missing required data for publishing');
            return;
        }

        const res = await invokeMainChannel(MainChannels.DEPLOY_VERSION, {
            folderPath,
            buildScript,
            envId,
        });

        if (!res) {
            console.error('Failed to publish hosting environment');
        }
    }

    get isDeploying() {
        return (
            this.state.deployState &&
            [DeployState.BUILDING, DeployState.DEPLOYING].includes(this.state.deployState)
        );
    }

    async dispose() {}
}
