import { api } from '@/trpc/client';
import {
    PublishStatus,
    PublishType,
    type PublishState
} from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

const DEFAULT_PUBLISH_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
    buildLog: null,
    error: null,
    progress: null,
};

export class HostingManager {
    state: PublishState = DEFAULT_PUBLISH_STATE;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private updateState(state: Partial<PublishState>) {
        this.state = {
            ...this.state,
            ...state,
        };
    }

    resetState() {
        this.state = DEFAULT_PUBLISH_STATE
    }

    async publish({
        sandboxId,
        projectId,
        buildScript,
        type,
        buildFlags,
        envVars,
    }: {
        sandboxId: string;
        projectId: string;
        type: PublishType;
        buildScript: string;
        buildFlags: string;
        envVars: Record<string, string>;
    }) {

        const response = await api.publish.publish.mutate({
            sandboxId,
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        });
    }
}
