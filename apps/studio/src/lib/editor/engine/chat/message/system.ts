import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { nanoid } from 'nanoid';
import {
    ChatMessageRole,
    ChatMessageType,
    type SystemChatMessage,
} from '/common/models/chat/message';
import type { SystemContentBlock } from '/common/models/chat/message/content';

export class SystemChatMessageImpl implements SystemChatMessage {
    id: string;
    type: ChatMessageType.SYSTEM = ChatMessageType.SYSTEM;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: SystemContentBlock[];

    constructor(content: SystemContentBlock[]) {
        this.id = nanoid();
        this.content = content;
    }

    toPreviousParam(): MessageParam {
        return {
            role: this.role,
            content: this.content,
        };
    }

    toCurrentParam(): MessageParam {
        return {
            role: this.role,
            content: this.content,
        };
    }
}
