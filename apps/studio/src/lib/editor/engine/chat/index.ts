import { invokeMainChannel } from '@/lib/utils';
import type {
    CodeResponseBlock,
    FileMessageContext,
    HighlightedMessageContext,
    StreamResponse,
} from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { DeepPartial } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid';
import type { EditorEngine } from '..';
import { ChatConversationImpl } from './conversation';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';

export class ChatManager {
    isWaiting = false;
    USE_MOCK = false;
    streamResolver = new StreamResolver();
    streamingMessage: AssistantChatMessageImpl | null = this.USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;

    conversations: ChatConversationImpl[] = [new ChatConversationImpl('New Conversation', [])];
    conversation = this.conversations[0];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.streamResolver.current,
            (current) => this.resolveCurrentObject(current),
        );
    }

    startNewConversation() {
        this.conversation = new ChatConversationImpl('New Conversation', []);
        this.conversations.push(this.conversation);
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this.conversation = match;
    }

    resolveCurrentObject(res: DeepPartial<StreamResponse> | null) {
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

    async sendMessage(content: string): Promise<void> {
        this.streamResolver.errorMessage = null;
        this.isWaiting = true;

        const userMessage = await this.addUserMessage(content);
        const messageParams = this.conversation.getCoreMessages();
        let res: StreamResponse | null = null;

        const requestId = nanoid();
        res = await invokeMainChannel(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
            messages: messageParams,
            requestId,
        });

        this.isWaiting = false;

        if (!res) {
            console.error('No response received');
            return;
        }

        this.handleChatResponse(res, userMessage);
    }

    handleChatResponse(res: StreamResponse, userMessage: UserChatMessageImpl) {
        this.addAssistantMessage(res, userMessage);

        for (const block of res.blocks) {
            if (block.type === 'text') {
                continue;
            }
            if (block.type === 'code') {
                this.applyGeneratedCode(block);
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
        res: StreamResponse,
        userMessage: UserChatMessageImpl,
    ): AssistantChatMessageImpl {
        const newMessage = new AssistantChatMessageImpl(res.blocks, userMessage.context);
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
                name: templateNode.component || node.tagName,
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
