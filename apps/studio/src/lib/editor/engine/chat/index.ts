import type {
    CodeResponseBlock,
    FileMessageContext,
    HighlightedMessageContext,
    StreamResponse,
} from '@onlook/models/chat';
import { ChatMessageType } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage, DeepPartial } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid';
import type { EditorEngine } from '..';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES, MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';

export class ChatManager {
    isWaiting = false;
    USE_MOCK = false;
    streamResolver = new StreamResolver();
    streamingMessage: AssistantChatMessageImpl | null = this.USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;

    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[] = this.USE_MOCK
        ? MOCK_CHAT_MESSAGES
        : [
              new AssistantChatMessageImpl([
                  {
                      type: 'text',
                      text: 'Hello! How can I assist you today?',
                  },
              ]),
          ];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.streamResolver.current,
            (current) => this.resolveCurrentObject(current),
        );
    }

    resolveCurrentObject(res: DeepPartial<StreamResponse> | null) {
        if (!res) {
            this.streamingMessage = null;
            return;
        }
        const lastUserMessage: UserChatMessageImpl | undefined = this.messages.findLast(
            (message) => message.type === ChatMessageType.USER,
        );
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
        const messageParams = this.getCoreMessages();
        let res: StreamResponse | null = null;

        const requestId = nanoid();
        res = await window.api.invoke(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
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

    getCoreMessages() {
        const messages: CoreMessage[] = this.messages
            .map((m, index) => {
                if (index === 0 && m.role === 'assistant') {
                    // Remove the greeting assistant message
                    return;
                }
                if (index === this.messages.length - 1) {
                    return m.toCurrentMessage();
                } else {
                    return m.toPreviousMessage();
                }
            })
            .filter((m) => m !== undefined);
        return messages;
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
        this.messages = [...this.messages, newMessage];
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
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            console.error('Failed to apply code change');
        }
    }

    addAssistantMessage(
        res: StreamResponse,
        userMessage: UserChatMessageImpl,
    ): AssistantChatMessageImpl {
        const newMessage = new AssistantChatMessageImpl(res.blocks, userMessage.context);
        this.messages = [...this.messages, newMessage];
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
