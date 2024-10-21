import { MessageParam } from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import { ChatContent, ChatRole } from '/common/models/chat';

export class ChatMessage {
    id: string;
    role: ChatRole;
    content: ChatContent;

    constructor(role: ChatRole, content: string) {
        this.id = nanoid();
        this.role = role;
        this.content = {
            type: 'text',
            text: content,
        };
    }

    toParam(): MessageParam {
        return {
            role: this.role,
            content: this.content.text,
        };
    }
}
