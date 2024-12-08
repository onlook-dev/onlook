import type {
    AssistantChatMessage,
    AssistantContentBlock,
    ChatMessageContext,
    CodeChangeBlock,
    CodeEditResponseBlock,
    ResponseBlock,
    StreamResponse,
    TextBlock,
    TextResponseBlock,
} from '@onlook/models/chat';
import { ChatMessageRole, ChatMessageType } from '@onlook/models/chat';
import type { CoreAssistantMessage, DeepPartial } from 'ai';
import { nanoid } from 'nanoid/non-secure';
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
                } else if (c.type === 'code-edit') {
                    return this.resolveCodeChangeBlock(c);
                } else {
                    console.error('Unsupported content block type', c.type);
                }
            })
            .filter((c) => c !== undefined) as AssistantContentBlock[];
    }

    resolveCodeChangeBlock(c: DeepPartial<CodeEditResponseBlock>): CodeChangeBlock | null {
        // TODO: Apply the patches
        const fileName = c.fileName || '';

        if (!(fileName in this.files)) {
            console.error(`File ${fileName} not found in context`);
            return null;
        }

        const originalContent = this.files[fileName];

        // Not this
        const newContent = c.updated || '';

        return {
            type: 'code-file',
            id: nanoid(),
            fileName: fileName,
            value: newContent,
            original: originalContent,
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

    getMessageContent(): StreamResponse {
        return {
            blocks: this.content
                .map((c) => {
                    if (c.type === 'text') {
                        return this.getTextResponse(c);
                    } else if (c.type === 'code-file') {
                        return this.getCodeResponse(c);
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

    getCodeResponse(block: CodeChangeBlock): CodeEditResponseBlock {
        return {
            type: 'code-edit',
            fileName: block.fileName,
            original: block.original,
            updated: block.value,
        };
    }

    toCurrentMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: JSON.stringify(this.getMessageContent()),
        };
    }
}
