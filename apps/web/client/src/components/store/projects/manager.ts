import { api } from '@/trpc/client';
import type { ImageMessageContext, Project } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from '../user/manager';

export class ProjectsManager {
    private _projects: Project[] = [];
    isFetching = false;

    constructor(private userManager: UserManager) {
        makeAutoObservable(this);

        reaction(
            () => this.userManager.user?.id,
            () => this.fetchProjects(),
        );
    }

    createProject(name: string, images: ImageMessageContext[]) {
        console.log('createProject', name, images);
    }

    async fetchProjects() {
        if (!this.userManager.user?.id) {
            console.error('No user ID found');
            return;
        }
        this.isFetching = true;
        this._projects = await api.project.getPreviewProjects.query({
            userId: this.userManager.user.id,
        });
        this.isFetching = false;
    }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
    }

    deleteProject(project: Project) {
        api.project.delete.mutate({ id: project.id });
    }
}
