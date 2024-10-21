import { MessageParam } from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import {
    ChatMessage,
    ChatMessageContext,
    ChatMessageRole,
    MessageContent,
} from '/common/models/chat';

export class ChatMessageImpl implements ChatMessage {
    id: string;
    role: ChatMessageRole;
    content: MessageContent;
    context: ChatMessageContext[] = [];

    constructor(role: ChatMessageRole, content: string) {
        this.id = nanoid();
        this.role = role;
        this.content = [
            {
                type: 'text',
                text: content,
            },
        ];
    }

    getContentText(): string {
        let text = '';
        for (const part of this.content) {
            if (part.type === 'text') {
                text += part.text;
            }
        }
        return text;
    }

    toParam(): MessageParam {
        return {
            role: this.role === ChatMessageRole.USER ? 'user' : 'assistant',
            content: this.getContentText(),
        };
    }
}
