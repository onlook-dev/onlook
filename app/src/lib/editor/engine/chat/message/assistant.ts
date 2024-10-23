import {
    ContentBlock,
    MessageParam,
    TextBlockParam,
    ToolUseBlock,
    ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources';
import { AssistantChatMessage, ChatMessageRole } from '/common/models/chat/message';
import {
    ChatContentBlock,
    CodeChangeContentBlock,
    TextContentBlock,
    ToolCodeChangeContent,
} from '/common/models/chat/message/content';
import { ChatMessageContext } from '/common/models/chat/message/context';
import { GENERATE_CODE_TOOL_NAME, ToolCodeChange } from '/common/models/chat/tool';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: ChatContentBlock[];
    files: Record<string, string> = {};

    constructor(id: string, content: ContentBlock[], context?: ChatMessageContext[]) {
        this.id = id;
        this.files = this.getFilesFromContext(context || []);
        this.content = this.resolveContentBlocks(content);
    }

    resolveContentBlocks(content: ContentBlock[]): ChatContentBlock[] {
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
            .filter((c) => c !== undefined) as ChatContentBlock[];
    }

    resolveToolUseBlock(c: ToolUseBlock): CodeChangeContentBlock {
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

    resolveToolCodeChange(change: ToolCodeChange): ToolCodeChangeContent | null {
        const fileName = change.fileName;
        if (!this.files[fileName]) {
            console.error('File not found in context', fileName);
            return null;
        }
        return {
            ...change,
            original: this.files[fileName],
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

    toParam(): MessageParam {
        return {
            role: this.role,
            content: this.getContentParam(),
        };
    }
}
