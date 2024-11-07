import { invokeMainChannel } from '@/lib/utils';
import type {
    CodeResponseBlock,
    FileMessageContext,
    HighlightedMessageContext,
    StreamResponse,
    StreamResult,
} from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { DeepPartial } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid';
import type { PartialDeep } from 'type-fest';
import type { EditorEngine } from '..';
import { ChatConversationImpl } from './conversation';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES, MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';

export class ChatManager {
    isWaiting = false;
    USE_MOCK = false;
    stream = new StreamResolver();
    streamingMessage: AssistantChatMessageImpl | null = this.USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;

    conversation = new ChatConversationImpl(this.USE_MOCK ? MOCK_CHAT_MESSAGES : []);
    conversations: ChatConversationImpl[] = [this.conversation];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.stream.current,
            (current) => this.resolveStreamObject(current),
        );
    }

    resubmitMessage(id: string, content: string) {
        const message = this.conversation.messages.find((m) => m.id === id);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        if (message.type !== 'user') {
            console.error('Can only edit user messages');
            return;
        }

        message.editContent(content);
        this.conversation.trimToMessage(message);
        this.sendMessage(message);
    }

    startNewConversation() {
        if (this.conversation.messages.length === 0 && !this.conversation.displayName) {
            console.error(
                'Error starting new conversation. Current conversation is already empty.',
            );
            return;
        }
        this.conversation = new ChatConversationImpl([]);
        this.conversations.push(this.conversation);
    }

    deleteConversation(id: string) {
        const index = this.conversations.findIndex((c) => c.id === id);
        if (index === -1) {
            console.error('No conversation found with id', id);
            return;
        }
        this.conversations.splice(index, 1);
        if (this.conversation.id === id) {
            this.conversation = new ChatConversationImpl([]);
            this.conversations.push(this.conversation);
        }
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this.conversation = match;
    }

    resolveStreamObject(res: DeepPartial<StreamResponse> | null) {
        if (!res) {
            this.streamingMessage = null;
            return;
        }
        const lastUserMessage: UserChatMessageImpl | undefined =
            this.conversation.getLastUserMessage();
        if (!res.blocks) {
            return;
        }
        this.streamingMessage = new AssistantChatMessageImpl(
            res.blocks,
            lastUserMessage?.context || [],
        );
    }

    async sendNewMessage(content: string): Promise<void> {
        const userMessage = await this.addUserMessage(content);
        this.conversation.updateName(content);
        await this.sendMessage(userMessage);
    }

    async sendMessage(userMessage: UserChatMessageImpl): Promise<void> {
        this.stream.errorMessage = null;
        this.isWaiting = true;
        const messageParams = this.conversation.getCoreMessages();

        const res: StreamResult = await invokeMainChannel(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
            messages: messageParams,
            requestId: nanoid(),
        });

        this.stream.clear();
        this.isWaiting = false;
        this.handleChatResponse(res, userMessage);
    }

    stopStream() {
        const requestId = nanoid();
        invokeMainChannel(MainChannels.SEND_STOP_STREAM_REQUEST, {
            requestId,
        });
    }

    handleChatResponse(res: StreamResult, userMessage: UserChatMessageImpl) {
        if (!res.object) {
            console.error('No response object found');
            return;
        }

        this.addAssistantMessage(res.object, userMessage);

        if (!res.object.blocks || res.object.blocks.length === 0) {
            console.error('No blocks found in response');
            return;
        }

        for (const block of res.object.blocks) {
            if (block.type === 'text') {
                continue;
            }
            if (block.type === 'code') {
                if (res.success) {
                    this.applyGeneratedCode(block);
                }
            }
        }
    }

    async addUserMessage(content: string): Promise<UserChatMessageImpl> {
        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.conversation.addMessage(newMessage);
        return newMessage;
    }

    async applyGeneratedCode(change: CodeResponseBlock): Promise<void> {
        if (change.value === '') {
            console.error('No code found in response');
            return;
        }

        const codeDiff: CodeDiff[] = [
            {
                path: change.fileName,
                original: '',
                generated: change.value,
            },
        ];
        const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            console.error('Failed to apply code change');
        }
    }

    addAssistantMessage(
        res: PartialDeep<StreamResponse>,
        userMessage: UserChatMessageImpl,
    ): AssistantChatMessageImpl {
        const newMessage = new AssistantChatMessageImpl(res.blocks || [], userMessage.context);
        this.conversation.addMessage(newMessage);
        return newMessage;
    }

    async getMessageContext() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return [];
        }

        const fileNames = new Set<string>();

        const highlightedContext: HighlightedMessageContext[] = [];
        for (const node of selected) {
            const templateNode = this.editorEngine.ast.getAnyTemplateNode(node.selector);
            if (!templateNode) {
                continue;
            }
            const codeBlock = await this.editorEngine.code.getCodeBlock(templateNode);
            if (!codeBlock) {
                continue;
            }
            highlightedContext.push({
                type: 'selected',
                name: node.tagName.toLowerCase(),
                value: codeBlock,
                templateNode: templateNode,
            });
            fileNames.add(templateNode.path);
        }

        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            const fileContent = await this.editorEngine.code.getFileContent(fileName);
            if (!fileContent) {
                continue;
            }
            fileContext.push({
                type: 'file',
                name: fileName,
                value: fileContent,
            });
        }
        return [...fileContext, ...highlightedContext];
    }
}
