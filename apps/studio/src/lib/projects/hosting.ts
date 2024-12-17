import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { PreviewEnvironment } from '@zonke-cloud/sdk';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class HostingManager {
    private project: Project;
    env: PreviewEnvironment | null = null;

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
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
        return res as PreviewEnvironment;
    }

    async publish() {
        const folderPath = this.project.folderPath;
        const buildScript: string = this.project.commands?.build || 'npm run build';
        const envId = this.env?.environmentId;

        if (!folderPath || !buildScript || !envId) {
            console.error('Failed to publish hosting environment');
            return;
        }

        const res = await invokeMainChannel(MainChannels.PUBLISH_PROJECT_HOSTING_ENV, {
            folderPath,
            buildScript,
            envId,
        });
        if (!res) {
            console.error('Failed to publish hosting environment');
            return;
        }
        console.log('Published hosting environment', res);
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

    async restart() {}

    async dispose() {
        await this.stop();
    }
}
