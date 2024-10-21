import {
    ContentBlock,
    MessageParam,
    TextBlockParam,
    ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import { getFormattedUserPrompt } from './prompt';
import {
    AssistantChatMessage,
    ChatContentBlock,
    ChatMessageContext,
    ChatMessageRole,
    CodeChangeContentBlock,
    TextContentBlock,
    UserChatMessage,
} from '/common/models/chat';
import { GENERATE_CODE_TOOL_NAME } from '/common/models/chat/tool';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: TextContentBlock[];
    context: ChatMessageContext[] = [];

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = [{ type: 'text', value: content }];
        this.context = context;
    }

    getStringContent(): string {
        return this.content.map((c) => c.value).join('\n');
    }

    toParam(): MessageParam {
        return {
            role: this.role,
            content: getFormattedUserPrompt(this.getStringContent(), this.context),
        };
    }
}

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: ChatContentBlock[];

    constructor(id: string, content: ContentBlock[]) {
        this.id = id;
        this.content = this.resolveContentBlocks(content);
    }

    resolveContentBlocks(content: ContentBlock[]): ChatContentBlock[] {
        return [];
    }

    getContentParam(): Array<TextBlockParam | ToolUseBlockParam> {
        return this.content
            .map((c) => {
                if (c.type === 'text') {
                    return this.getTextBlockParam(c);
                } else if (c.type === 'codeChange') {
                    return this.getToolCallParam(c);
                }
            })
            .filter((c) => c !== undefined) as Array<TextBlockParam | ToolUseBlockParam>;
    }

    getTextBlockParam(block: TextContentBlock): TextBlockParam {
        return {
            type: 'text',
            text: block.value,
        };
    }

    getToolCallParam(block: CodeChangeContentBlock): ToolUseBlockParam {
        return {
            id: block.id,
            type: 'tool_use',
            name: GENERATE_CODE_TOOL_NAME,
            input: {
                changes: block.value,
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
