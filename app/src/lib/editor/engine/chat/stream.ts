import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';

export class StreamResolver {
    resolvedMessage: Anthropic.Messages.Message | null = null;
    currentContent: Map<number, ContentBlock> = new Map();
    activeRequestId: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    private initializeMessage(message: Anthropic.Messages.Message) {
        this.resolvedMessage = {
            id: message.id,
            type: 'message',
            role: message.role,
            content: [],
            model: message.model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
                input_tokens: 0,
                output_tokens: 0,
            },
        };
    }

    private getSortedContentBlocks(): ContentBlock[] {
        return Array.from(this.currentContent.entries())
            .sort(([keyA], [keyB]) => keyA - keyB)
            .map(([, contentBlock]) => contentBlock);
    }

    private handleMessageStart(event: Anthropic.Messages.MessageStartEvent) {
        this.initializeMessage(event.message);
    }

    private handleMessageDelta(event: Anthropic.Messages.MessageDeltaEvent) {
        if (!this.resolvedMessage) {
            return;
        }

        if (event.delta.stop_reason) {
            this.resolvedMessage.stop_reason = event.delta.stop_reason;
        }
        if (event.delta.stop_sequence) {
            this.resolvedMessage.stop_sequence = event.delta.stop_sequence;
        }
    }

    private handleMessageStop(event: Anthropic.Messages.MessageStopEvent) {
        if (!this.resolvedMessage) {
            return;
        }
    }

    private handleContentBlockStart(event: Anthropic.Messages.ContentBlockStartEvent) {
        if (!this.resolvedMessage) {
            return;
        }

        const content = event.content_block;
        if (content.type === 'tool_use') {
            content.input = '';
        }
        this.currentContent.set(event.index, content);
    }

    private handleContentBlockDelta(event: Anthropic.Messages.ContentBlockDeltaEvent) {
        if (!this.resolvedMessage) {
            return;
        }

        const contentBlock = this.currentContent.get(event.index);
        if (!contentBlock) {
            console.error('Content block not found');
            return;
        }

        if (event.delta.type === 'text_delta' && contentBlock.type === 'text') {
            contentBlock.text = contentBlock.text + event.delta.text;
            this.currentContent.set(event.index, contentBlock);
        } else if (event.delta.type === 'input_json_delta' && contentBlock.type === 'tool_use') {
            contentBlock.input = contentBlock.input + event.delta.partial_json;
        }
    }

    private handleContentBlockStop(event: Anthropic.Messages.ContentBlockStopEvent) {
        if (!this.resolvedMessage) {
            return;
        }

        const contentBlock = this.currentContent.get(event.index);
        if (!contentBlock) {
            console.error('Content block not found');
            return;
        }

        if (contentBlock.type === 'tool_use') {
            contentBlock.input = JSON.parse(contentBlock.input as string);
        }
        this.currentContent.set(event.index, contentBlock);
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_EVENT, (args) => {
            const { requestId, message } = args as {
                requestId: string;
                message: Anthropic.Messages.RawMessageStreamEvent;
            };

            // Track the current request
            if (this.activeRequestId !== requestId) {
                this.activeRequestId = requestId;
                this.resolvedMessage = null;
                this.currentContent = new Map();
            }

            switch (message.type) {
                case 'message_start':
                    this.handleMessageStart(message);
                    break;
                case 'message_delta':
                    this.handleMessageDelta(message);
                    break;
                case 'message_stop':
                    this.handleMessageStop(message);
                    break;
                case 'content_block_start':
                    this.handleContentBlockStart(message);
                    break;
                case 'content_block_delta':
                    this.handleContentBlockDelta(message);
                    break;
                case 'content_block_stop':
                    this.handleContentBlockStop(message);
                    break;
            }
            if (this.resolvedMessage) {
                this.resolvedMessage.content = this.getSortedContentBlocks();
            }
            console.log('Ping');
        });

        window.api.on(MainChannels.CHAT_STREAM_FINAL_MESSAGE, (args) => {
            const { requestId, message } = args as {
                requestId: string;
                message: Anthropic.Messages.Message;
            };

            console.log('Resolved: ', JSON.stringify(this.resolvedMessage));
            // Reset state for next stream
            this.activeRequestId = null;
            this.currentContent = new Map();
            this.resolvedMessage = message;

            console.log('Final: ', JSON.stringify(this.resolvedMessage));
        });
    }

    // Helper method to get current resolved message state
    getCurrentMessage(): Anthropic.Messages.Message | null {
        return this.resolvedMessage;
    }
}
