import type { PartialStreamResponse, UsageCheckResult } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { TextPart, TextStreamPart, ToolCallPart, ToolResultPart, ToolSet } from 'ai';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    content: (TextPart | ToolCallPart | ToolResultPart)[] = [];
    requestId: string | null = null;
    errorMessage: string | null = null;
    rateLimited: UsageCheckResult | null = null;
    id: string = 'stream';

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args: PartialStreamResponse) => {
            const { payload } = args;
            this.resolveContent(payload);
            this.errorMessage = null;
            this.rateLimited = null;
        });
    }

    resolveContent(payload: TextStreamPart<ToolSet>) {
        const resolvedPart = this.resolveToolCallPart(payload);
        if (!resolvedPart) {
            return;
        }

        if (this.content.length === 0) {
            this.content.push(resolvedPart);
            return;
        }

        const lastPart = this.content[this.content.length - 1];

        // If the last part is a text part and the resolved part is also a text part, merge them
        if (lastPart.type === 'text' && resolvedPart.type === 'text') {
            const newLastPart = {
                ...lastPart,
                text: (lastPart as TextPart).text + (resolvedPart as TextPart).text,
            } satisfies TextPart;
            this.content[this.content.length - 1] = newLastPart;
            return;
        }

        this.content.push(resolvedPart);
    }

    resolveToolCallPart(
        payload: TextStreamPart<ToolSet>,
    ): TextPart | ToolCallPart | ToolResultPart | null {
        if (payload.type === 'tool-call') {
            return payload;
        } else if (payload.type === 'text-delta') {
            const textPart = {
                type: 'text',
                text: payload.textDelta,
            } satisfies TextPart;
            return textPart;
        }
        return null;
    }

    clear() {
        this.content = [];
        this.requestId = null;
        this.errorMessage = null;
        this.rateLimited = null;
    }
}
