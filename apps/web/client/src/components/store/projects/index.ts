import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';

export class ProjectsManager {
    private _projects: Project[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    createProject(): Project {
        const newProject: Project = {
            id: '1',
            name: 'Project 1',
            canvas: {
                id: '1',
                scale: 1,
                frames: [],
                position: {
                    x: 0,
                    y: 0,
                },
            },
            domains: {
                base: null,
                custom: null,
            },
            sandbox: {
                id: '1',
                url: 'http://localhost:8084',
            },
            metadata: {
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
                updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12).toISOString(),
                previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
            },
        }
        return newProject;
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
