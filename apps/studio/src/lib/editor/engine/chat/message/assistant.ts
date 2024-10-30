import type {
    ContentBlock,
    MessageParam,
    TextBlockParam,
    ToolUseBlock,
    ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import { type AssistantChatMessage, ChatMessageRole, ChatMessageType } from '@onlook/models/chat';
import type {
    AssistantContentBlock,
    CodeChangeContentBlock,
    TextContentBlock,
    ToolCodeChangeContent,
} from '@onlook/models/chat';
import type { ChatMessageContext } from '@onlook/models/chat';
import { GENERATE_CODE_TOOL_NAME, type ToolCodeChange } from '@onlook/models/chat';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    type: ChatMessageType.ASSISTANT = ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
    files: Record<string, string> = {};

    constructor(id: string, content: ContentBlock[], context?: ChatMessageContext[]) {
        this.id = id;
        this.files = this.getFilesFromContext(context || []);
        this.content = this.resolveContentBlocks(content);
    }

    resolveContentBlocks(content: ContentBlock[]): AssistantContentBlock[] {
        return content
            .map((c) => {
                if (c.type === 'text') {
                    return c;
                } else if (c.type === 'tool_use' && c.name === GENERATE_CODE_TOOL_NAME) {
                    return this.resolveToolUseBlock(c);
                } else {
                    console.error('Unsupported content block type', c);
                }
            })
            .filter((c) => c !== undefined) as AssistantContentBlock[];
    }

    resolveToolUseBlock(c: ToolUseBlock): CodeChangeContentBlock {
        if (c.input === '' || typeof c.input === 'string') {
            return this.resolveEmptyToolUse(c);
        }

        const changes = (c.input as { changes: ToolCodeChange[] }).changes;
        const contentCodeChange = changes
            .map((change) => this.resolveToolCodeChange(change))
            .filter((c) => c !== null) as ToolCodeChangeContent[];
        const block: CodeChangeContentBlock = {
            type: 'code',
            id: c.id,
            changes: contentCodeChange,
        };
        return block;
    }

    resolveEmptyToolUse(c: ToolUseBlock) {
        const change: ToolCodeChangeContent = {
            fileName: '',
            original: '',
            applied: false,
            value: '',
            description: '',
            loading: true,
        };

        const block: CodeChangeContentBlock = {
            type: 'code',
            id: c.id,
            changes: [change],
        };
        return block;
    }

    resolveToolCodeChange(change: ToolCodeChange): ToolCodeChangeContent | null {
        const fileName = change.fileName;
        return {
            ...change,
            original: this.files[fileName] || '',
            applied: true,
            loading: false,
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

    getContentParam(): Array<TextBlockParam | ToolUseBlockParam> {
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

    getTextBlockParam(block: TextContentBlock): TextBlockParam {
        return block;
    }

    getToolCallParam(block: CodeChangeContentBlock): ToolUseBlockParam {
        return {
            id: block.id,
            type: 'tool_use',
            name: GENERATE_CODE_TOOL_NAME,
            input: {
                changes: block.changes,
            },
        };
    }

    toPreviousParam(): MessageParam {
        const content = this.getContentParam();
        const strippedContent = content.map((c) => {
            if (c.type === 'tool_use' && c.name === GENERATE_CODE_TOOL_NAME) {
                c.input = {
                    changes: (c.input as { changes: ToolCodeChangeContent[] }).changes.map(
                        (change) => {
                            return {
                                fileName: change.fileName,
                                value: '// Code removed for brevity',
                                description: change.description,
                            };
                        },
                    ),
                };
            }
            return c;
        });

        return {
            role: this.role,
            content: strippedContent,
        };
    }

    toCurrentParam(): MessageParam {
        return {
            role: this.role,
            content: this.getContentParam(),
        };
    }
}
