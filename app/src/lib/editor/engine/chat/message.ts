import { MessageParam } from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import { getFormattedPrompt } from './prompt';
import { ChatMessage, ChatMessageContext, ChatMessageRole } from '/common/models/chat';

export class ChatMessageImpl implements ChatMessage {
    id: string;
    role: ChatMessageRole;
    content: string;
    context: ChatMessageContext[] = [];

    constructor(role: ChatMessageRole, content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.role = role;
        this.content = content;
        this.context = context;
    }

    toParam(): MessageParam {
        return {
            role: this.role === ChatMessageRole.USER ? 'user' : 'assistant',
            content: getFormattedPrompt(this.content, this.context),
        };
    }
}
