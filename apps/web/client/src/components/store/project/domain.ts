import { get, makeAutoObservable } from "mobx";
import type { ProjectManager } from "./manager";
import { PublishStatus, type Project, type PublishState, type PublishOptions, type PublishRequest, type DomainSettings } from "@onlook/models";
import { HostingManager } from "./hosting";
import { sendAnalytics } from "@/utils/analytics";
import { DefaultSettings } from "@onlook/constants";
import { getPublishUrls } from "@onlook/utility";
import type { EditorEngine } from "../editor/engine";

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
};


export class DomainsManager {
    private _customHosting: HostingManager | null = null;
    state: PublishState = DEFAULT_STATE;


    constructor(
        private projectManager: ProjectManager,
        private project: Project,
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
        this._customHosting = new HostingManager(this.editorEngine);
    }

    get custom() {
        return this._customHosting;
    }

    get domains() {
        return this.projectManager.project?.domains;
    }


    private updateState(partialState: Partial<PublishState>) {
        this.state = { ...this.state, ...partialState };
    }


    async publish(options: PublishOptions): Promise<boolean> {
        console.log('publish', this.project);
        sendAnalytics('project.publish', {
            projectId: this.project.id,
            domain: this.project.domains?.custom?.url || '',
        });
        console.log('publish', this.project.domains?.custom?.url);

        this.updateState({ status: PublishStatus.LOADING, message: 'Creating deployment...' });

        const request: PublishRequest = {
            buildScript: this.project.commands?.build || DefaultSettings.COMMANDS.build,
            urls:
                getPublishUrls(this.project.domains?.custom?.url || 'https://nextjs-boilerplate-three-sable-50.vercel.app'),
            options,
        };

        if (!this.custom) {
            console.error('Custom hosting not found');
            return false;
        }

        const res = await this.custom.publish(request)

        if (!res || !res.success) {
            const error = `Failed to publish hosting environment: ${res?.message || 'client error'}`;
            console.error(error);
            this.updateState({
                status: PublishStatus.ERROR,
                message: error,
            });
            sendAnalytics('Failed to publish', {
                message: error,
            });

            return false;
        }

        this.updateState({ status: PublishStatus.PUBLISHED, message: res.message });
        // this.updateDomain({ ...this.domain, publishedAt: new Date().toISOString() });

        sendAnalytics('hosting publish success', {
            urls: request.urls,
        });
        return true;
    }

    
}