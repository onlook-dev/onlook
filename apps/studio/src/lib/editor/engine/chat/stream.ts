import { createDuplexStream } from '@/lib/utils';
import type { StreamResponse, UsageCheckResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type IPCStream from 'electron-ipc-stream';

export class StreamResolver {
    content: string | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: UsageCheckResult | null = null;
    private stream: IPCStream | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    clear() {
        this.content = null;
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = null;
        
        // Close the stream if it exists
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }

    createStream(requestId: string): IPCStream {
        // Close any existing stream
        if (this.stream) {
            this.stream.end();
        }
        
        this.requestId = requestId;
        this.stream = createDuplexStream(`${MainChannels.CHAT_STREAM_PARTIAL}-${requestId}`);
        
        // Set up the stream to update the content
        this.stream.on('data', (args: StreamResponse) => {
            const { content, status, rateLimitResult } = args;
            
            if (status === 'partial' || status === 'full') {
                this.content = content;
                this.errorMessage = null;
                this.rateLimited = null;
            } else if (status === 'error') {
                this.errorMessage = content;
            } else if (status === 'rate-limited') {
                this.rateLimited = rateLimitResult || null;
                this.errorMessage = content;
            }
        });
        
        return this.stream;
    }

    getStream(): IPCStream | null {
        return this.stream;
    }
}
