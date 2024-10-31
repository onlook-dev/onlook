import { type AssistantChatMessage, ChatMessageRole, ChatMessageType } from '@onlook/models/chat';
import type {
    AssistantContentBlock,
    ChatMessageContext,
    CodeChangeBlock,
    CodeResponseBlock,
    ResponseBlock,
    TextBlock,
} from '@onlook/models/chat/message';
import type { AssistantContent, CoreAssistantMessage, DeepPartial, TextPart } from 'ai';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    type: ChatMessageType.ASSISTANT = ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
    files: Record<string, string> = {};

    constructor(blocks: DeepPartial<ResponseBlock[]>, context?: ChatMessageContext[]) {
        this.id = 'id';
        this.files = this.getFilesFromContext(context || []);
        this.content = this.resolveContentBlocks(blocks);
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
                    console.error('Unsupported content block type', c);
                }
            })
            .filter((c) => c !== undefined) as AssistantContentBlock[];
    }

    resolveCodeChangeBlock(c: DeepPartial<CodeResponseBlock>): CodeChangeBlock {
        const fileName = c.fileName || '';
        return {
            type: 'code',
            id: 'id',
            fileName: fileName,
            value: c.value || '',
            original: this.files[fileName] || '',
            applied: true,
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

    getMessageContent(strip = false): AssistantContent {
        return this.content
            .map((c) => {
                if (c.type === 'text') {
                    return this.getTextBlockParam(c);
                } else if (c.type === 'code') {
                    return this.getToolCallParam(c, strip);
                }
            })
            .filter((c) => c !== undefined);
    }

    getTextBlockParam(block: TextBlock): TextPart {
        return {
            type: 'text',
            text: block.text,
        };
    }

    getToolCallParam(block: CodeChangeBlock, strip = false): TextPart {
        const codeResBlock: CodeResponseBlock = {
            type: 'code',
            fileName: block.fileName,
            value: strip ? '// Removed for brevity' : block.value,
        };

        return {
            type: 'text',
            text: JSON.stringify(codeResBlock),
        };
    }

    toPreviousMessage(): CoreAssistantMessage {
        const content = this.getMessageContent(true);
        return {
            role: this.role,
            content: content,
        };
    }

    toCurrentMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: this.getMessageContent(),
        };
    }
}
