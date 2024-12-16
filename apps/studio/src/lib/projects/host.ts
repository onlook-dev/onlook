import { createEnv } from '@onlook/hosting';
import type { Project } from '@onlook/models/projects';
import { makeAutoObservable } from 'mobx';

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
        const env = await createEnv({
            userId: 'testUserId',
            framework: 'nextjs',
        });
        console.log('Created hosting environment', env);
    }

    async stop() {
        console.log('Stopping hosting environment', this.project.id);
    }

    async restart() {
    }

    async dispose() {
        await this.stop();
    }
}
