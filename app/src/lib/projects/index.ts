import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';
import { Project } from '/common/models/project';
import { AppState, ProjectsCache } from '/common/models/settings';

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
            id: String(this.projectList.length),
            name,
            url,
            folderPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.projectList.push(newProject);
        this.saveProjects();
        return newProject;
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
