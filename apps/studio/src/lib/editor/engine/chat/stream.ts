import type { StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    content: string | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: boolean = false;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.content = null;
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = false;
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: StreamResponse) => {
            const { content } = args;
            this.content = content;
            this.errorMessage = null;
            this.rateLimited = false;
        });

        window.api.on(MainChannels.CHAT_STREAM_FINAL_MESSAGE, (args: StreamResponse) => {
            this.content = null;
            this.errorMessage = null;
            this.rateLimited = false;
        });

        window.api.on(MainChannels.CHAT_STREAM_ERROR, (args: StreamResponse) => {
            const { content } = args;
            this.errorMessage = content;
            this.rateLimited = false;
        });
    }
}
