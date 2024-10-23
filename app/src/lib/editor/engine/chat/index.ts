import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { AssistantChatMessageImpl } from './message/assistant';
import { SystemChatMessageImpl } from './message/system';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES } from './mockData';
import { MainChannels } from '/common/constants';
import { ChatMessageRole } from '/common/models/chat/message';
import { FileMessageContext, HighlightedMessageContext } from '/common/models/chat/message/context';
import { ToolCodeChangeResult } from '/common/models/chat/tool';

export class ChatManager {
    isWaiting = false;
    USE_MOCK = false;

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
    }

    async sendMessage(content: string): Promise<void> {
        this.isWaiting = true;
        const userMessage = await this.addUserMessage(content);

        const res: Anthropic.Messages.Message | null = await window.api.invoke(
            MainChannels.SEND_CHAT_MESSAGES,
            this.getMessageParams(),
        );

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
        console.log('Sending messages:', messages);
        return messages;
    }

    handleChatResponse(res: Anthropic.Messages.Message, userMessage: UserChatMessageImpl) {
        console.log('Received response:', res);
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
            this.addToolUseResult(toolUse as ToolUseBlock);
        }
    }

    async addUserMessage(content: string): Promise<UserChatMessageImpl> {
        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.messages = [...this.messages, newMessage];
        return newMessage;
    }

    async addToolUseResult(toolBlock: ToolUseBlock): Promise<SystemChatMessageImpl> {
        const result: ToolCodeChangeResult = {
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: 'applied', // TODO: Update when user apply or reject
        };
        const newMessage = new SystemChatMessageImpl([result]);
        this.messages = [...this.messages, newMessage];
        return newMessage;
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

/**
{
    "id": "msg_016pX8P3mqxLcdhBkGfqpYvC",
    "type": "message",
    "role": "assistant",
    "model": "claude-3-haiku-20240307",
    "content": [
        {
            "type": "text",
            "text": "Okay, let's update the code to make the copy more enticing. Here are the changes:"
        },
        {
            "type": "tool_use",
            "id": "toolu_01VJAPZXhvqyJtWnrWTaViy1",
            "name": "generate_code",
            "input": {
                "changes": [
                    {
                        "fileName": "/Users/kietho/workplace/onlook/test/_123/app/page.tsx",
                        "value": "export default function Page() {\n    return (\n        <div className=\"w-full min-h-screen flex items-center justify-center bg-white relative overflow-hidden\">\n            <div className=\"text-center text-gray-900 p-8 relative z-10\">\n                <h1 className=\"text-5xl font-bold mb-4 tracking-tight text-gray-800\">\n                    Unlock Your App's Potential\n                </h1>\n                <p className=\"text-2xl text-gray-700 mb-8\">\n                    Discover the power of our cutting-edge app and transform your business today.\n                </p>\n                <button className=\"bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-semibold\">Get Started</button>\n            </div>\n        </div>\n    );\n}"
                    }
                ]
            }
        }
    ],
    "stop_reason": "tool_use",
    "stop_sequence": null,
    "usage": {
        "input_tokens": 779,
        "output_tokens": 339
    }
}
 */
