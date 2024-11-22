import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { AppState, ProjectsCache } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import { invokeMainChannel, sendAnalytics } from '../utils';
import { RunManager } from './run';

export class ProjectsManager {
    private activeProject: Project | null = null;
    private projectList: Project[] = [];
    private runManagers: Map<string, RunManager> = new Map();

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
        invokeMainChannel(MainChannels.UPDATE_APP_STATE, {
            activeProjectId: this.activeProject?.id,
        });
    }

    saveProjects() {
        invokeMainChannel(MainChannels.UPDATE_PROJECTS, { projects: this.projectList });
    }

    deleteProject(project: Project) {
        if (this.activeProject?.id === project.id) {
            this.project = null;
        }
        this.projects = this.projectList.filter((p) => p.id !== project.id);
        sendAnalytics('delete project', { url: project.url, id: project.id });
    }

    getActiveRunManager(): RunManager | null {
        if (!this.activeProject) {
            return null;
        }
        return this.runManagers.get(this.activeProject.id) || null;
    }

    async run(project: Project) {
        let runManager = this.runManagers.get(project.id);
        if (!runManager) {
            runManager = new RunManager(project);
            this.runManagers.set(project.id, runManager);
        }
        await runManager.run();
    }

    async stop(project: Project) {
        const runManager = this.runManagers.get(project.id);
        if (!runManager) {
            console.error('No run manager found for project');
            return;
        }
        await runManager.stop();
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
