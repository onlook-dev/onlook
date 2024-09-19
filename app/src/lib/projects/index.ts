import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';
import { Project } from '/common/models/project';
import { AppState } from '/common/models/settings';

export class ProjectsManager {
    private activeProject: Project | null = null;
    private allProjects: Project[] = [];

    constructor() {
        makeAutoObservable(this);
        this.restoreProjects();
    }

    async restoreProjects() {
        console.log('Restoring projects');
        const projects = (await window.api.invoke(MainChannels.GET_PROJECTS)) as Project[];
        if (!projects) {
            console.error('Failed to restore projects');
            return;
        }
        this.allProjects = projects;

        const appState = (await window.api.invoke(MainChannels.GET_APP_STATE)) as AppState;
        if (appState.activeProjectId) {
            this.activeProject = projects.find((p) => p.id === appState.activeProjectId) || null;
        }
    }

    saveActiveProject() {
        console.log('Saving active project');
        window.api.invoke(MainChannels.UPDATE_APP_STATE, {
            activeProjectId: this.activeProject?.id,
        });
    }

    get project() {
        return this.activeProject;
    }

    set project(newProject: Project | null) {
        this.activeProject = newProject;
        this.saveActiveProject();
    }

    get projects() {
        return this.allProjects;
    }
}
