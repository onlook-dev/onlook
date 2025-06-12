import { api } from '@/trpc/client';
import { fromProject } from '@onlook/db';
import type { Project } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from '../user/manager';

export enum ProjectTabs {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
    PROMPT_CREATE = 'prompt-create',
    IMPORT_PROJECT = 'import-project',
    IMPORT_GITHUB = 'import-github',
}
export class ProjectsManager {

    private _projects: Project[] = [];
    isFetching = false;
    projectsTab: ProjectTabs = ProjectTabs.PROJECTS;

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

    async deleteProject(project: Project) {
        this.projects = this.projects.filter((p) => p.id !== project.id);
        await api.project.delete.mutate({ id: project.id });
        await api.sandbox.delete.mutate({ sandboxId: project.sandbox.id });
    }

    async updateProject(project: Project) {
        this.projects = this.projects.map((p) => (p.id === project.id ? project : p));

        const dbProject = fromProject(project);
        await api.project.update.mutate(dbProject);
    }
}
