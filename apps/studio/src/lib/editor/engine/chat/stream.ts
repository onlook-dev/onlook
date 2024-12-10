import type { StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    content: string | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.content = null;
        this.requestId = null;
        this.errorMessage = null;
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args) => {
            const { content, status } = args as StreamResponse;
            this.content = content;
        });

        window.api.on(MainChannels.CHAT_STREAM_FINAL_MESSAGE, (args) => {
            this.content = null;
        });

        window.api.on(MainChannels.CHAT_STREAM_ERROR, (args) => {
            const { content } = args as StreamResponse;
            this.errorMessage = content;
            this.requestId = null;
            this.content = null;
        });
    }
}
