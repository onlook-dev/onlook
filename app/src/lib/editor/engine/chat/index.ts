import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { AssistantChatMessageImpl } from './message/assistant';
import { SystemChatMessageImpl } from './message/system';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES } from './mockData';
import { StreamResolver } from './stream';
import { MainChannels } from '/common/constants';
import { ChatMessageRole, ChatMessageType } from '/common/models/chat/message';
import { FileMessageContext, HighlightedMessageContext } from '/common/models/chat/message/context';
import { ToolCodeChange, ToolCodeChangeResult } from '/common/models/chat/tool';
import { CodeDiff } from '/common/models/code';

export class ChatManager {
    isWaiting = false;
    USE_MOCK = false;
    streamResolver = new StreamResolver();
    streamingMessage: AssistantChatMessageImpl | null = null;

    messages: (UserChatMessageImpl | AssistantChatMessageImpl | SystemChatMessageImpl)[] = this
        .USE_MOCK
        ? MOCK_CHAT_MESSAGES
        : [
              new AssistantChatMessageImpl(nanoid(), [
                  {
                      type: 'text',
                      text: 'Hello! How can I assist you today?',
                  },
              ]),
          ];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.streamResolver.currentMessage,
            (message) => this.resolveCurrentMessage(message),
        );
    }

    resolveCurrentMessage(message: Anthropic.Messages.Message | null) {
        if (!message) {
            this.streamingMessage = null;
            return;
        }
        const lastUserMessage: UserChatMessageImpl | undefined = this.messages.findLast(
            (message) => message.type === ChatMessageType.USER,
        );
        this.streamingMessage = new AssistantChatMessageImpl(
            message.id,
            message.content,
            lastUserMessage?.context || [],
        );
    }

    async sendMessage(content: string, stream = true): Promise<void> {
        this.streamResolver.errorMessage = null;
        this.isWaiting = true;

        const userMessage = await this.addUserMessage(content);
        const messageParams = this.getMessageParams();
        let res: Anthropic.Messages.Message | null = null;

        if (stream) {
            const requestId = nanoid();
            res = await window.api.invoke(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
                messages: messageParams,
                requestId,
            });
        } else {
            res = await window.api.invoke(MainChannels.SEND_CHAT_MESSAGES, messageParams);
        }

        this.isWaiting = false;

        if (!res) {
            console.error('No response received');
            return;
        }

        this.handleChatResponse(res, userMessage);
    }

    getMessageParams() {
        const messages = this.messages.map((m, index) => {
            if (index === this.messages.length - 1) {
                return m.toCurrentParam();
            } else {
                return m.toPreviousParam();
            }
        });
        return messages;
    }

    handleChatResponse(res: Anthropic.Messages.Message, userMessage: UserChatMessageImpl) {
        if (res.type !== 'message') {
            throw new Error('Unexpected response type');
        }
        if (res.role !== ChatMessageRole.ASSISTANT) {
            throw new Error('Unexpected response role');
        }
        if (!res.content || res.content.length === 0) {
            throw new Error('No content received');
        }

        this.addAssistantMessage(res.id, res.content, userMessage);

        if (res.stop_reason === 'tool_use') {
            const toolUse = res.content.find((c) => c.type === 'tool_use');
            if (!toolUse) {
                throw new Error('Tool use block not found');
            }
            this.handleToolUse(toolUse);
        }
    }

    async addUserMessage(content: string): Promise<UserChatMessageImpl> {
        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.messages = [...this.messages, newMessage];
        return newMessage;
    }

    async handleToolUse(toolBlock: ToolUseBlock): Promise<void> {
        if (toolBlock.name === 'generate_code') {
            this.applyGeneratedCode(toolBlock);
        }

        this.addToolUseResult(toolBlock);
    }

    async addToolUseResult(toolBlock: ToolUseBlock): Promise<SystemChatMessageImpl> {
        const result: ToolCodeChangeResult = {
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: 'applied',
        };
        const newMessage = new SystemChatMessageImpl([result]);
        this.messages = [...this.messages, newMessage];
        return newMessage;
    }

    async applyGeneratedCode(toolBlock: ToolUseBlock): Promise<void> {
        const input = toolBlock.input as { changes: ToolCodeChange[] };
        for (const change of input.changes) {
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
    }

    addAssistantMessage(
        id: string,
        contentBlocks: ContentBlock[],
        userMessage: UserChatMessageImpl,
    ): AssistantChatMessageImpl {
        const newMessage = new AssistantChatMessageImpl(id, contentBlocks, userMessage.context);
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
