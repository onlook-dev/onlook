import { api } from '@/trpc/client';
import type { Canvas as DbCanvas, Frame as DbFrame, Project as DbProject } from '@onlook/db';
import type { Canvas, FrameType, Project, WebFrame } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import type { UserManager } from '../user/manager';

export class ProjectsManager {
    private _projects: Project[] = [];
    isFetchingProjects = false;

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
        this.isFetchingProjects = true;
        const projects = await api.project.getByUserId.query({ id: this.userManager.user.id });
        this._projects = projects.map((project) => dbProjectToProject(project.project));
        this.isFetchingProjects = false;
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
                previewImg:
                    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
            },
        };
        return newProject;
    }

    saveProjects() {}

    deleteProject(project: Project) {}

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
        this.saveProjects();
    }
}

const dbProjectToProject = (
    dbProject: DbProject & { canvas: DbCanvas & { frames: DbFrame[] } },
): Project => {
    return {
        id: dbProject.id,
        name: dbProject.name,
        sandbox: {
            id: dbProject.sandboxId,
            url: dbProject.sandboxUrl,
        },
        metadata: {
            createdAt: dbProject.createdAt?.toISOString() ?? '',
            updatedAt: dbProject.updatedAt?.toISOString() ?? '',
            previewImg: dbProject.previewImg,
        },
        canvas: dbCanvasToCanvas(dbProject.canvas),
        domains: {
            base: null,
            custom: null,
        },
    };
};

const dbCanvasToCanvas = (dbCanvas: DbCanvas & { frames: DbFrame[] }): Canvas => {
    return {
        id: dbCanvas.id,
        scale: Number(dbCanvas.scale),
        frames: dbCanvas.frames.map(dbFrameToFrame),
        position: dbCanvas.position,
    };
};

const dbFrameToFrame = (dbFrame: DbFrame): WebFrame => {
    return {
        id: dbFrame.id,
        url: dbFrame.url,
        type: dbFrame.type as FrameType,
        position: {
            x: Number(dbFrame.x),
            y: Number(dbFrame.y),
        },
        dimension: {
            width: Number(dbFrame.width),
            height: Number(dbFrame.height),
        },
    };
};
