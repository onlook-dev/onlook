import type { StreamResponse, UsageCheckResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    content: string | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: UsageCheckResult | null = null;
    streamId: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.content = null;
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = null;
        this.streamId = null;
    }

    listen() {
        // Legacy listener for backward compatibility
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: StreamResponse) => {
            const { content } = args;
            this.content = content;
            this.errorMessage = null;
            this.rateLimited = null;
        });
    }
    
    setStreamId(streamId: string) {
        this.streamId = streamId;
    }
    
    clearStreamId() {
        this.streamId = null;
    }
    
    abortStream() {
        if (this.streamId) {
            window.api.send(MainChannels.SEND_STOP_STREAM_REQUEST, { streamId: this.streamId });
            this.streamId = null;
        }
    }
}
