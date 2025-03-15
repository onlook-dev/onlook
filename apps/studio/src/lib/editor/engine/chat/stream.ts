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
        // Listen for stream partial updates
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: StreamResponse) => {
            const { content } = args;
            this.content = content;
            this.errorMessage = null;
            this.rateLimited = null;
        });

        // Listen for stream updates through the channel
        window.api.on(MainChannels.CHAT_STREAM_CHANNEL, (response: StreamResponse) => {
            if (response.streamId) {
                this.streamId = response.streamId;
            }
            
            if (response.status === 'partial') {
                this.content = response.content;
                this.errorMessage = null;
                this.rateLimited = null;
            } else if (response.status === 'full') {
                this.content = response.content;
                this.errorMessage = null;
                this.rateLimited = null;
                this.streamId = null;
            } else if (response.status === 'error') {
                this.errorMessage = response.content;
                this.rateLimited = null;
                this.streamId = null;
            } else if (response.status === 'rate-limited') {
                this.errorMessage = response.content;
                this.rateLimited = response.rateLimitResult ?? null;
                this.streamId = null;
            }
        });
    }

    abortStream() {
        if (this.streamId) {
            window.api.send(MainChannels.SEND_STOP_STREAM_REQUEST, { streamId: this.streamId });
            this.streamId = null;
        }
    }
}
