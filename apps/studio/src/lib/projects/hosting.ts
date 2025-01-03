import { MainChannels } from '@onlook/models/constants';
import { DeployState, HostingState } from '@onlook/models/hosting';
import type { Project } from '@onlook/models/projects';
import type { UserSettings } from '@onlook/models/settings';
import type { PreviewEnvironment } from '@zonke-cloud/sdk';
import { makeAutoObservable } from 'mobx';
import type { ProjectsManager } from '.';
import { invokeMainChannel } from '../utils';

const MOCK_STATE = {
    status: HostingState.DELETING_ENV,
    message: null,
    error: null,
    env: null,
    deployState: null,
};

const DEFAULT_STATE = {
    status: HostingState.NO_ENV,
    message: null,
    error: null,
    env: null,
    deployState: null,
};

export class HostingManager {
    private project: Project;
    state: {
        status: HostingState;
        message: string | null;
        error: string | null;
        env: PreviewEnvironment | null;
        deployState: DeployState | null;
    } = DEFAULT_STATE;
    private stateChangeListener: ((...args: any[]) => void) | null = null;

    constructor(
        private projectsManager: ProjectsManager,
        project: Project,
    ) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
        this.listenForStateChanges();
    }

    async listenForStateChanges() {
        this.stateChangeListener = async (args: any) => {
            const { state, message } = args as { state: DeployState; message: string };
            this.state.deployState = state;
            this.state.message = message;
            this.state.error = null;

            if (state === DeployState.DEPLOYED) {
                this.state.status = HostingState.ENV_FOUND;
            } else if (state === DeployState.ERROR) {
                this.state.status = HostingState.ERROR;
            } else {
                this.state.status = HostingState.DEPLOYING;
            }
        };

        window.api.on(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
    }

    async restoreState() {
        this.state.env = await this.getEnv();
        this.state.status = this.state.env ? HostingState.ENV_FOUND : HostingState.NO_ENV;
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
        this.project.hosting = {
            ...this.project.hosting,
            envId: res.environmentId,
        };
        this.projectsManager.updateProject(this.project);
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

    async deleteEnv() {
        await invokeMainChannel(MainChannels.DELETE_HOSTING_ENV, {
            envId: this.state.env?.environmentId,
        });
        this.state.env = null;
        this.state.status = HostingState.NO_ENV;
    }

    async dispose() {
        if (this.stateChangeListener) {
            window.api.removeListener(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
        }
    }
}
