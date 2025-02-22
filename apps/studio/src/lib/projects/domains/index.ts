import type { Project } from "@onlook/models/projects";
import { makeAutoObservable, reaction } from "mobx";
import type { ProjectsManager } from "../index";
import { HostingManager } from "./hosting";

export class DomainsManager {
    private _baseHosting: HostingManager | null = null;
    private _customHosting: HostingManager | null = null;

    constructor(private projectsManager: ProjectsManager, private project: Project) {
        makeAutoObservable(this);
        reaction(() => this.project.domains, () => {
            this._baseHosting = new HostingManager(this.projectsManager, this.project, this.project.domains?.base);
            this._customHosting = new HostingManager(this.projectsManager, this.project, this.project.domains?.custom);
        });
    }

    get base() {
        return this._baseHosting;
    }

    get custom() {
        return this._customHosting;
    }

    dispose() {
        this._baseHosting?.dispose();
        this._customHosting?.dispose();
    }
}