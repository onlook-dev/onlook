import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { AppState, ProjectsCache } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { invokeMainChannel, sendAnalytics } from '../utils';

export enum ProjectState {
    READY = 'ready',
    PRERUN = 'prerun',
    WAITING = 'waiting',
    RUNNING = 'running',
    ERROR = 'error',
}

export class ProjectsManager {
    private activeProject: Project | null = null;
    private projectList: Project[] = [];
    state: ProjectState = ProjectState.READY;
    error: string | null = null;
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

    async run(project: Project) {
        if (this.state !== ProjectState.READY) {
            console.error('Failed to run. State is not ready.');
            this.error = 'Failed to run. State is not ready.';
            this.state = ProjectState.ERROR;
            return;
        }

        const res = await this.prerun(project);
        if (!res) {
            console.error('Failed to run. Prerun failed.');
            this.error = 'Failed to run. Prerun failed.';
            this.state = ProjectState.ERROR;
            return;
        }

        const terminalRes = await this.createTerminal(project);
        if (!terminalRes) {
            console.error('Failed to run. Failed to create terminal.');
            this.error = 'Failed to run. Failed to create terminal.';
            this.state = ProjectState.ERROR;
            return;
        }

        const executeCommandRes = await this.executeCommand(project.id, 'npm run dev');
        if (!executeCommandRes) {
            console.error('Failed to run. Failed to execute command.');
            this.error = 'Failed to run. Failed to execute command.';
            this.state = ProjectState.ERROR;
            return;
        }

        this.state = ProjectState.RUNNING;
        this.error = null;
    }

    async createTerminal(project: Project) {
        const res = await invokeMainChannel(MainChannels.TERMINAL_CREATE, {
            id: project.id,
            options: { cwd: project.folderPath },
        });
        if (!res) {
            console.error('Failed to create terminal.');
            return;
        }
        return res;
    }

    async killTerminal(id: string) {
        const res = await invokeMainChannel(MainChannels.TERMINAL_KILL, { id });
        if (!res) {
            console.error('Failed to kill terminal.');
            return;
        }
        return res;
    }

    async executeCommand(id: string, command: string) {
        const res = await invokeMainChannel(MainChannels.TERMINAL_EXECUTE_COMMAND, { id, command });
        if (!res) {
            console.error('Failed to execute command.');
            return;
        }
        return res;
    }

    async prerun(project: Project): Promise<boolean | null> {
        this.state = ProjectState.PRERUN;
        const res: boolean | null = await invokeMainChannel(MainChannels.RUN_SETUP, {
            dirPath: project.folderPath,
            command: 'npm run dev',
        });
        return res;
    }

    async stop(project: Project) {
        if (this.state !== ProjectState.RUNNING) {
            console.error('Failed to stop. State is not running.');
            this.error = 'Failed to stop. State is not running.';
            this.state = ProjectState.ERROR;
            return;
        }
        this.state = ProjectState.WAITING;

        const executeCommandRes = await this.executeCommand(project.id, '\x03');
        if (!executeCommandRes) {
            console.error('Failed to stop. Failed to execute command.');
            this.error = 'Failed to stop. Failed to execute command.';
            this.state = ProjectState.ERROR;
            return;
        }

        const killTerminalRes = await this.killTerminal(project.id);
        if (!killTerminalRes) {
            console.error('Failed to stop. Failed to kill terminal.');
            this.error = 'Failed to stop. Failed to kill terminal.';
            this.state = ProjectState.ERROR;
            return;
        }

        const res: boolean | null = await invokeMainChannel(MainChannels.RUN_CLEANUP, {
            dirPath: project.folderPath,
        });
        if (!res) {
            console.error('Failed to stop. Cleanup failed.');
            this.error = 'Failed to stop. Cleanup failed.';
            this.state = ProjectState.ERROR;
            return;
        }
        this.state = ProjectState.READY;
        this.error = null;
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
