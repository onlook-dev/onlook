import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { AppState, ProjectsCache } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import { invokeMainChannel, sendAnalytics } from '../utils';
import { HostingManager } from './hosting';
import { RunManager } from './run';

export class ProjectsManager {
    private activeProject: Project | null = null;
    private activeRunManager: RunManager | null = null;
    private activeHostingManager: HostingManager | null = null;

    private projectList: Project[] = [];

    constructor() {
        makeAutoObservable(this);
        this.restoreProjects();
    }

    async restoreProjects() {
        const cachedProjects = (await invokeMainChannel(
            MainChannels.GET_PROJECTS,
        )) as ProjectsCache;
        if (!cachedProjects || !cachedProjects.projects) {
            console.error('Failed to restore projects');
            return;
        }
        this.projectList = cachedProjects.projects;

        const appState = (await invokeMainChannel(MainChannels.GET_APP_STATE)) as AppState;
        if (appState.activeProjectId) {
            this.project = this.projectList.find((p) => p.id === appState.activeProjectId) || null;
        }
    }

    createProject(
        name: string,
        url: string,
        folderPath: string,
        commands: {
            run: string;
            build: string;
        },
    ): Project {
        const newProject: Project = {
            id: nanoid(),
            name,
            url,
            folderPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commands,
        };

        const updatedProjects = [...this.projectList, newProject];
        this.projects = updatedProjects;
        return newProject;
    }

    updateProject(project: Project) {
        const updatedProjects = this.projectList.map((p) => (p.id === project.id ? project : p));
        this.projects = updatedProjects;
        if (project.id === this.project?.id) {
            this.project = project;
        }
    }

    saveActiveProject() {
        invokeMainChannel(MainChannels.UPDATE_APP_STATE, {
            activeProjectId: this.project?.id,
        });
    }

    saveProjects() {
        invokeMainChannel(MainChannels.UPDATE_PROJECTS, { projects: this.projectList });
    }

    deleteProject(project: Project) {
        if (this.project?.id === project.id) {
            this.project = null;
        }
        this.projects = this.projectList.filter((p) => p.id !== project.id);
        sendAnalytics('delete project', { url: project.url, id: project.id });
    }

    get project() {
        return this.activeProject;
    }

    get runner(): RunManager | null {
        return this.activeRunManager;
    }

    get hosting(): HostingManager | null {
        return this.activeHostingManager;
    }

    set project(newProject: Project | null) {
        if (!newProject || newProject.id !== this.activeProject?.id) {
            this.disposeManagers();
        }

        if (newProject) {
            this.setManagers(newProject);
        }

        this.activeProject = newProject;
        this.saveActiveProject();
    }

    setManagers(project: Project) {
        this.activeRunManager = new RunManager(project);
        this.activeHostingManager = new HostingManager(project);
    }

    disposeManagers() {
        this.activeRunManager?.dispose();
        this.activeHostingManager?.dispose();
        this.activeRunManager = null;
        this.activeHostingManager = null;
    }

    get projects() {
        return this.projectList;
    }

    set projects(newProjects: Project[]) {
        this.projectList = newProjects;
        this.saveProjects();
    }
}
