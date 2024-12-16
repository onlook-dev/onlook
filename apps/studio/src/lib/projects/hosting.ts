import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export class HostingManager {
    private project: Project;

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
    }

    async restoreState() {
        // Create hosting env for project
    }

    async create() {
        console.log('Creating hosting environment', this.project.id);
        const res = await invokeMainChannel(MainChannels.CREATE_PROJECT_HOSTING_ENV, {
            userId: 'testUserId',
            framework: 'nextjs',
        });
        console.log('Created hosting environment', res);
    }

    async stop() {
        console.log('Stopping hosting environment', this.project.id);
    }

    async restart() {}

    async dispose() {
        await this.stop();
    }
}
