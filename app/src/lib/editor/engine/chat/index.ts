import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MainChannels } from '/common/constants';
import { ChatMessageRole } from '/common/models/chat/message';
import { FileMessageContext, HighlightedMessageContext } from '/common/models/chat/message/context';

const MOCK_USER_MSG = new UserChatMessageImpl('Test message with some selected files', [
    {
        type: 'file',
        name: 'index.tsx',
        value: 'export const a = 1;',
    },
    {
        type: 'selected',
        name: 'Component',
        value: 'export const Component = () => <div></div>',
        templateNode: {
            path: 'path/to/file',
            startTag: {
                start: {
                    line: 1,
                    column: 1,
                },
                end: {
                    line: 1,
                    column: 10,
                },
            },
        },
    },
    {
        type: 'image',
        name: 'screenshot.png',
        value: 'https://example.com/screenshot',
    },
    {
        type: 'image',
        name: 'logo.svg',
        value: 'https://example.com/logo',
    },
]);

const MOCK_ASSISTANT_MSG = new AssistantChatMessageImpl('1', [
    {
        type: 'text',
        text: "Okay, let's update the code to make the copy more enticing. Here are the changes:",
    },
    {
        type: 'tool_use',
        id: 'toolu_01VJAPZXhvqyJtWnrWTaViy1',
        name: 'generate_code',
        input: {
            changes: [
                {
                    fileName: '/Users/kietho/workplace/onlook/test/_123/app/page.tsx',
                    value: 'export default function Page() {\n    return (\n        <div className="w-full min-h-screen flex items-center justify-center bg-white relative overflow-hidden">\n            <div className="text-center text-gray-900 p-8 relative z-10">\n                <h1 className="text-5xl font-bold mb-4 tracking-tight text-gray-800">\n                    Unlock Your App\'s Potential\n                </h1>\n                <p className="text-2xl text-gray-700 mb-8">\n                    Discover the power of our cutting-edge app and transform your business today.\n                </p>\n                <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-semibold">Get Started</button>\n            </div>\n        </div>\n    );\n}',
                },
            ],
        },
    },
]);

export class ChatManager {
    isWaiting = false;
    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[] = [
        new AssistantChatMessageImpl(nanoid(), [
            {
                type: 'text',
                text: 'Hello! How can I assist you today?',
            },
        ]),
        MOCK_USER_MSG,
        MOCK_ASSISTANT_MSG,
    ];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async sendMessage(content: string): Promise<void> {
        this.isWaiting = true;
        await this.addUserMessage(content);

        const res: Anthropic.Messages.Message | null = await window.api.invoke(
            MainChannels.SEND_CHAT_MESSAGES,
            this.getMessages(),
        );

        this.isWaiting = false;
        if (!res) {
            console.error('No response received');
            return;
        }
        console.log('Received response:', res);
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
        if (res.role !== ChatMessageRole.ASSISTANT) {
            throw new Error('Unexpected response role');
        }
        if (!res.content || res.content.length === 0) {
            throw new Error('No content received');
        }
        this.addAssistantMessage(res.id, res.content);
    }

    async addUserMessage(content: string) {
        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.messages = [...this.messages, newMessage];
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

    addAssistantMessage(id: string, contentBlocks: ContentBlock[]) {
        const newAssistantMessage = new AssistantChatMessageImpl(id, contentBlocks);
        this.messages = [...this.messages, newAssistantMessage];

        console.log('Added assistant message:', newAssistantMessage);

        console.log(this.messages);
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
