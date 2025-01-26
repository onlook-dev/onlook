import type { ImageMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export enum CreateState {
    PROMPT = 'prompting',
    IMPORT = 'import',
    CREATE_LOADING = 'create-loading',
}

export class CreateManager {
    createState: CreateState = CreateState.PROMPT;
    error: string | null = null;
    progress: number = 0;
    message: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listenForPromptProgress();
    }

    listenForPromptProgress() {
        window.api.on(
            MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK,
            ({ message, progress }: { message: string; progress: number }) => {
                this.progress = progress;
                this.message = message;
            },
        );

        return () => {
            window.api.removeAllListeners(MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK);
        };
    }

    get state() {
        return this.createState;
    }

    set state(newState: CreateState) {
        this.createState = newState;
    }

    async sendPrompt(prompt: string, images: ImageMessageContext[]) {
        this.state = CreateState.CREATE_LOADING;
        this.error = null;
        const result: {
            success: boolean;
            error?: string;
        } = await invokeMainChannel(MainChannels.CREATE_NEW_PROJECT_PROMPT, {
            prompt: prompt,
            images: images,
        });

        if (result.success) {
            this.state = CreateState.PROMPT;
        } else {
            this.error = result.error || 'Failed to create project';
            this.state = CreateState.PROMPT;
        }
    }
}
