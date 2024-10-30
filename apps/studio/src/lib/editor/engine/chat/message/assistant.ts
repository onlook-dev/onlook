import type { TextBlockParam, ToolUseBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { AssistantContent, CoreAssistantMessage, TextPart, ToolCallPart } from 'ai';
import {
    type AssistantChatMessage,
    ChatMessageRole,
    ChatMessageType,
} from '/common/models/chat/message';
import type {
    AssistantContentBlock,
    CodeChangeBlock,
    TextBlock,
} from '/common/models/chat/message/content';
import type { ChatMessageContext } from '/common/models/chat/message/context';
import { CodeResponseBlock, ResponseBlock } from '/common/models/chat/message/response';
import { GENERATE_CODE_TOOL_NAME } from '/common/models/chat/tool';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    type: ChatMessageType.ASSISTANT = ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
    files: Record<string, string> = {};

    constructor(blocks: ResponseBlock[], context?: ChatMessageContext[]) {
        this.id = 'id';
        this.files = this.getFilesFromContext(context || []);
        this.content = this.resolveContentBlocks(blocks);
    }

    resolveContentBlocks(content: ResponseBlock[]): AssistantContentBlock[] {
        return content
            .map((c) => {
                if (c.type === 'text') {
                    return c;
                } else if (c.type === 'code') {
                    return this.resolveCodeChangeBlock(c);
                } else {
                    console.error('Unsupported content block type', c);
                }
            })
            .filter((c) => c !== undefined) as AssistantContentBlock[];
    }

    resolveCodeChangeBlock(c: CodeResponseBlock): CodeChangeBlock {
        const fileName = c.fileName;
        return {
            ...c,
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

    getMessageContent(): AssistantContent {
        return this.content
            .map((c) => {
                if (c.type === 'text') {
                    return this.getTextBlockParam(c);
                } else if (c.type === 'code') {
                    return this.getToolCallParam(c);
                }
            })
            .filter((c) => c !== undefined) as Array<TextBlockParam | ToolUseBlockParam>;
    }

    getTextBlockParam(block: TextBlock): TextPart {
        return block;
    }

    getToolCallParam(block: CodeChangeBlock): ToolCallPart {
        return {
            id: block.id,
            type: 'tool_use',
            name: GENERATE_CODE_TOOL_NAME,
            input: {
                changes: block.changes,
            },
        };
    }

    stripMessageContent(c: AssistantContent): AssistantContent {
        if (c.type === 'tool_use' && c.name === GENERATE_CODE_TOOL_NAME) {
            c.input = {
                changes: (c.input as { changes: CodeChangeContent[] }).changes.map((change) => {
                    return {
                        fileName: change.fileName,
                        value: '// Code removed for brevity',
                        description: change.description,
                    };
                }),
            };
        }
        return c;
    }

    toPreviousMessage(): CoreAssistantMessage {
        const content = this.getMessageContent();
        const strippedContent = this.stripMessageContent(content);
        return {
            role: this.role,
            content: strippedContent,
        };
    }

    toCurrentMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: this.getMessageContent(),
        };
    }
}
