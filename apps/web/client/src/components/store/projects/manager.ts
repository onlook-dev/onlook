import { api } from '@/trpc/client';
import type { Project } from '@onlook/models';
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

    async fetchProjects() {
        if (!this.userManager.user?.id) {
            console.error('No user ID found');
            return;
        }
        this.isFetching = true;
        this._projects = await api.project.getPreviewProjectsByUserId.query({ id: this.userManager.user.id });
        this.isFetching = false;
    }

    saveProjects() { }

    deleteProject(project: Project) { }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
        this.saveProjects();
    }
}