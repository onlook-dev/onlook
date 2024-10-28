import { MessageParam } from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import { ChatMessageRole, ChatMessageType, SystemChatMessage } from '/common/models/chat/message';
import { SystemContentBlock } from '/common/models/chat/message/content';

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
