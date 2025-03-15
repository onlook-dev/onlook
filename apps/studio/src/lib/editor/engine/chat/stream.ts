import type { StreamResponse, UsageCheckResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    content: string | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: UsageCheckResult | null = null;
    port: MessagePort | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.content = null;
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = null;
        this.closePort();
    }

    closePort() {
        if (this.port) {
            this.port.close();
            this.port = null;
        }
    }

    listen() {
        // Keep legacy listener for backward compatibility
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: StreamResponse) => {
            const { content } = args;
            this.content = content;
            this.errorMessage = null;
            this.rateLimited = null;
        });

        // Listen for new message port
        window.api.on(MainChannels.CHAT_STREAM_CHANNEL, (event: MessageEvent) => {
            this.closePort();
            this.port = event.ports[0];
            this.port.start();
            
            this.port.onmessage = (event: MessageEvent) => {
                const response = event.data as StreamResponse;
                if (response.status === 'partial') {
                    this.content = response.content;
                    this.errorMessage = null;
                    this.rateLimited = null;
                } else if (response.status === 'full') {
                    this.content = response.content;
                    this.errorMessage = null;
                    this.rateLimited = null;
                } else if (response.status === 'error') {
                    this.errorMessage = response.content;
                    this.rateLimited = null;
                } else if (response.status === 'rate-limited') {
                    this.errorMessage = response.content;
                    this.rateLimited = response.rateLimitResult ?? null;
                }
            };
            
            // Use addEventListener for close event instead of onclose
            this.port.addEventListener('close', () => {
                this.port = null;
            });
        });
    }

    abortStream() {
        if (this.port) {
            this.port.postMessage({ type: 'abort' });
        }
    }
}
