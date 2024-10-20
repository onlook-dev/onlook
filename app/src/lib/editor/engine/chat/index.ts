import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { MainChannels } from '/common/constants';

interface TextContent {
    type: 'text';
    text: string;
}

export type ChatContent = TextContent;

export enum ChatRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}

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

export class ChatManager {
    isWaiting = false;
    messages: ChatMessage[] = [
        new ChatMessage(ChatRole.ASSISTANT, 'Hello! How can I assist you today?'),
    ];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async send(content: string): Promise<void> {
        this.isWaiting = true;

        this.addUserMessage(content);
        const messages = this.messages.map((m) => m.toParam());
        const res: Anthropic.Messages.Message | null = await window.api.invoke(
            MainChannels.SEND_CHAT_MESSAGES,
            messages,
        );

        this.isWaiting = false;
        if (!res) {
            console.error('No response received');
            return;
        }
        this.handleResponseMessage(res);
    }

    handleResponseMessage(res: Anthropic.Messages.Message) {
        if (res.type !== 'message') {
            throw new Error('Unexpected response type');
        }
        if (res.role !== ChatRole.ASSISTANT) {
            throw new Error('Unexpected response role');
        }
        if (!res.content || res.content.length === 0) {
            throw new Error('No content received');
        }
        const message = res.content[0];
        if (message.type !== 'text') {
            throw new Error('Unexpected content type');
        }
        this.addAssistantMessage(message.text);
    }

    addUserMessage(content: string) {
        this.messages = [...this.messages, new ChatMessage(ChatRole.USER, content)];
    }

    addAssistantMessage(content: string) {
        this.messages = [...this.messages, new ChatMessage(ChatRole.ASSISTANT, content)];
    }
}
