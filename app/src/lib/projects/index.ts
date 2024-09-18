import { makeAutoObservable } from 'mobx';
import { Project } from '/common/models/project';

export class ProjectsManager {
    private activeProject: Project | null = null;
    private allProjects: Project[] = [];

    constructor() {
        makeAutoObservable(this);
    }

    get project() {
        return this.activeProject;
    }

    set project(newProject: Project | null) {
        this.activeProject = newProject;
    }

    get projects() {
        return this.allProjects;
    }
}
