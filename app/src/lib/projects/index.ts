import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { MainChannels } from '/common/constants';
import { Project } from '/common/models/project';
import { AppState, ProjectsCache } from '/common/models/settings';

export class ProjectsManager {
    private activeProject: Project | null = null;
    private projectList: Project[] = [];

    constructor() {
        makeAutoObservable(this);
        this.restoreProjects();
    }

    async restoreProjects() {
        const cachedProjects = (await window.api.invoke(
            MainChannels.GET_PROJECTS,
        )) as ProjectsCache;
        if (!cachedProjects || !cachedProjects.projects) {
            console.error('Failed to restore projects');
            return;
        }
        this.projectList = cachedProjects.projects;

        const appState = (await window.api.invoke(MainChannels.GET_APP_STATE)) as AppState;
        if (appState.activeProjectId) {
            this.activeProject =
                this.projectList.find((p) => p.id === appState.activeProjectId) || null;
        }
    }

    createProject(name: string, url: string, folderPath: string): Project {
        const newProject: Project = {
            id: nanoid(),
            name,
            url,
            folderPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const updatedProjects = [...this.projectList, newProject];
        this.projects = updatedProjects;
        return newProject;
    }

    updateProject(project: Project) {
        const updatedProjects = this.projectList.map((p) => (p.id === project.id ? project : p));
        this.projects = updatedProjects;
        if (project.id === this.activeProject?.id) {
            this.project = project;
        }
    }

    saveActiveProject() {
        window.api.invoke(MainChannels.UPDATE_APP_STATE, {
            activeProjectId: this.activeProject?.id,
        });
    }

    saveProjects() {
        window.api.invoke(
            MainChannels.UPDATE_PROJECTS,
            JSON.parse(JSON.stringify({ projects: this.projectList })),
        );
    }

    deleteProject(project: Project) {
        if (this.activeProject?.id === project.id) {
            this.project = null;
        }
        this.projects = this.projectList.filter((p) => p.id !== project.id);
    }

    get project() {
        return this.activeProject;
    }

    set project(newProject: Project | null) {
        this.activeProject = newProject;
        this.saveActiveProject();
    }

    get projects() {
        return this.projectList;
    }

    set projects(newProjects: Project[]) {
        this.projectList = newProjects;
        this.saveProjects();
    }
}
