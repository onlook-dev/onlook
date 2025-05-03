import type { Project } from "@onlook/models";

export class ProjectsManager {
    readonly projects: Project[];

    constructor() {
        this.projects = [];
    }
}

