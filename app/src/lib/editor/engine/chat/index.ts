import Anthropic from '@anthropic-ai/sdk';
import { makeAutoObservable } from 'mobx';
import { EditorEngine } from '..';
import { ChatMessage } from './message';
import { MainChannels } from '/common/constants';
import { ChatRole } from '/common/models/chat';

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

        const res: Anthropic.Messages.Message | null = await window.api.invoke(
            MainChannels.SEND_CHAT_MESSAGES,
            this.getMessages(),
        );

        this.isWaiting = false;
        if (!res) {
            console.error('No response received');
            return;
        }
        this.handleChatResponse(res);
    }

    getMessages() {
        const messages = this.messages.map((m) => m.toParam());
        return messages;
    }

    handleChatResponse(res: Anthropic.Messages.Message) {
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
