import { MessageParam } from '@anthropic-ai/sdk/resources';
import { ChatContentBlock, TextContentBlock } from './content';
import { ChatMessageContext } from './context';

interface BaseChatMessage {
    role: ChatMessageRole;
    toParam(): MessageParam;
}

export interface UserChatMessage extends BaseChatMessage {
    role: ChatMessageRole.USER;
    content: TextContentBlock[];
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends BaseChatMessage {
    role: ChatMessageRole.ASSISTANT;
    content: ChatContentBlock[];
}

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}
