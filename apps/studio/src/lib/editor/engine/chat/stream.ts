import type { PartialStreamResponse, UsageCheckResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { TextStreamPart, ToolSet } from 'ai';
import { makeAutoObservable } from 'mobx';
export class StreamResolver {
    content: TextStreamPart<ToolSet>[] = [];
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: UsageCheckResult | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.content = [];
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = null;
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: PartialStreamResponse) => {
            const { payload } = args;
            this.content.push(payload);
            this.errorMessage = null;
            this.rateLimited = null;
        });
    }
}
