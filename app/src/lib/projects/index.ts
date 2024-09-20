import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';
import { Project } from '/common/models/project';
import { AppState } from '/common/models/settings';

const MOCK_PROJECTS: Project[] = [
    {
        id: '0',
        previewImg: 'https://picsum.photos/id/237/200/300',
        name: 'Airbnb.com',
        url: 'http://localhost:3000',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        folderPath: '/path/to/folder',
    },
    {
        id: '1',
        previewImg: 'https://picsum.photos/id/238/300/200',
        name: 'Netflix Clone',
        url: 'http://localhost:5371',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        folderPath: '/path/to/folder',
    },
    {
        id: '2',
        previewImg: 'https://picsum.photos/id/239/500/500',
        name: 'Personal Portfolio',
        url: 'http://localhost:8080',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        folderPath: '/path/to/folder',
    },
];

export class ProjectsManager {
    private activeProject: Project | null = null;
    private projectList: Project[] = MOCK_PROJECTS;

    constructor() {
        makeAutoObservable(this);
        // this.restoreProjects();
    }

    async restoreProjects() {
        const cachedProjects = (await window.api.invoke(MainChannels.GET_PROJECTS)) as Project[];
        if (!cachedProjects) {
            console.error('Failed to restore projects');
            return;
        }
        this.projectList = cachedProjects;

        const appState = (await window.api.invoke(MainChannels.GET_APP_STATE)) as AppState;
        if (appState.activeProjectId) {
            this.activeProject =
                cachedProjects.find((p) => p.id === appState.activeProjectId) || null;
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
        return this.projectList;
    }
}
