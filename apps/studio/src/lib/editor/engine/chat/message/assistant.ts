import { type AssistantChatMessage, ChatMessageRole, ChatMessageType } from '@onlook/models/chat';
import type {
    AssistantContentBlock,
    ChatMessageContext,
    CodeChangeBlock,
    CodeResponseBlock,
    ResponseBlock,
    StreamResponse,
    TextBlock,
    TextResponseBlock,
} from '@onlook/models/chat/message';
import type { CoreAssistantMessage, DeepPartial } from 'ai';
import { nanoid } from 'nanoid';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    type: ChatMessageType.ASSISTANT = ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
    files: Record<string, string> = {};

    constructor(blocks: DeepPartial<ResponseBlock[]>, context?: ChatMessageContext[]) {
        this.id = nanoid();
        this.files = this.getFilesFromContext(context || []);
        this.content = this.resolveContentBlocks(blocks);
    }

    static fromJSON(data: AssistantChatMessage): AssistantChatMessageImpl {
        const message = new AssistantChatMessageImpl([], []);
        message.id = data.id;
        message.content = data.content;
        return message;
    }

    static toJSON(message: AssistantChatMessageImpl): AssistantChatMessage {
        return {
            id: message.id,
            type: message.type,
            role: message.role,
            content: message.content,
        };
    }

    resolveContentBlocks(content: DeepPartial<ResponseBlock[]>): AssistantContentBlock[] {
        return content
            .filter((c) => c !== undefined)
            .map((c) => {
                if (c.type === 'text') {
                    return {
                        type: 'text',
                        text: c.text || '',
                    };
                } else if (c.type === 'code') {
                    return this.resolveCodeChangeBlock(c);
                } else {
                    console.error('Unsupported content block type', c.type);
                }
            })
            .filter((c) => c !== undefined) as AssistantContentBlock[];
    }

    resolveCodeChangeBlock(c: DeepPartial<CodeResponseBlock>): CodeChangeBlock {
        const fileName = c.fileName || '';
        return {
            type: 'code',
            id: nanoid(),
            fileName: fileName,
            value: c.value || '',
            original: this.files[fileName] || '',
            applied: false,
        };
    }

    getFilesFromContext(context: ChatMessageContext[]): Record<string, string> {
        const files: Record<string, string> = {};
        context.forEach((c) => {
            if (c.type === 'file') {
                files[c.name] = c.value;
            }
        });
        return files;
    }

    getMessageContent(strip = false): StreamResponse {
        return {
            blocks: this.content
                .map((c) => {
                    if (c.type === 'text') {
                        return this.getTextResponse(c);
                    } else if (c.type === 'code') {
                        return this.getCodeResponse(c, strip);
                    }
                })
                .filter((c) => c !== undefined),
        };
    }

    getTextResponse(block: TextBlock): TextResponseBlock {
        return {
            type: 'text',
            text: block.text,
        };
    }

    getCodeResponse(block: CodeChangeBlock, strip = false): CodeResponseBlock {
        return {
            type: 'code',
            fileName: block.fileName,
            value: strip ? '// Removed for brevity' : block.value,
        };
    }

    toPreviousMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: JSON.stringify(this.getMessageContent(true)),
        };
    }

    toCurrentMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: JSON.stringify(this.getMessageContent()),
        };
    }
}
