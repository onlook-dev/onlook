import { api } from '@/trpc/client';
import {
    DeploymentStatus,
    DeploymentType,
    type DeploymentState
} from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

const DEFAULT_PUBLISH_STATE: DeploymentState = {
    status: DeploymentStatus.UNPUBLISHED,
    message: null,
    buildLog: null,
    error: null,
    progress: null,
};

export class HostingManager {
    state: DeploymentState = DEFAULT_PUBLISH_STATE;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private updateState(state: Partial<DeploymentState>) {
        this.state = {
            ...this.state,
            ...state,
        };
    }

    resetState() {
        this.state = DEFAULT_PUBLISH_STATE
    }

    async publish({
        projectId,
        buildScript,
        type,
        buildFlags,
        envVars,
    }: {
        projectId: string;
        type: DeploymentType;
        buildScript: string;
        buildFlags: string;
        envVars: Record<string, string>;
    }) {

        const response = await api.publish.publish.mutate({
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        });
    }
}
