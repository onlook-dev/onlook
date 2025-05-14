import type { ProjectManager } from '@/components/store/project/manager';
import type { UserManager } from '@/components/store/user/manager';
import { sendAnalytics } from '@/utils/analytics';
import { ChatMessageRole, StreamRequestType, type AssistantChatMessage } from '@onlook/models/chat';
import type { ParsedError } from '@onlook/utility';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { SuggestionManager } from './suggestions';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    suggestions: SuggestionManager;

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        this.context = new ChatContext(this.editorEngine, this.projectManager);
        this.conversation = new ConversationManager(this.editorEngine, this.projectManager);
        this.code = new ChatCodeManager(this, this.editorEngine);
        this.suggestions = new SuggestionManager(this.projectManager);
        makeAutoObservable(this);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    async getStreamMessages(content: string): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const context = await this.context.getChatContext();
        const userMessage = this.conversation.addUserMessage(content, context);
        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send chat message', {
            content,
        });
        return this.generateStreamMessages(content);
    }

    async getFixErrorMessages(errors: ParsedError[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        if (errors.length === 0) {
            console.error('No errors found');
            return null;
        }

        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        this.conversation.current.updateName(errors[0]?.content ?? 'Fix errors');
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send fix error chat message', {
            errors: errors.map((e) => e.content),
        });
        return this.generateStreamMessages(prompt);
    }

    async getResubmitMessages(id: string, newMessageContent: string) {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        const message = this.conversation.current.messages.find((m) => m.id === id);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        if (message.role !== ChatMessageRole.USER) {
            console.error('Can only edit user messages');
            return;
        }

        message.updateContent(newMessageContent);
        await this.conversation.current.removeAllMessagesAfter(message);
        await this.conversation.current.updateMessage(message);
        return this.generateStreamMessages(StreamRequestType.CHAT);
    }

    private async generateStreamMessages(userPrompt?: string): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }
        // Save current changes before sending to AI

        // TODO: Reenable this
        // this.projectsManager.versions?.createCommit(
        //     userPrompt ?? "Save before chat",
        //     false,
        // );

        const messages = this.conversation.current.getMessagesForStream();
        return messages;
    }

    autoApplyCode(assistantMessage: AssistantChatMessage) {
        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id);
            }, 100);
        }
    }

    clear() {
        this.code.clear();
        this.context.clear();
        if (this.conversation) {
            this.conversation.current = null;
        }
    }
}
