import Anthropic from '@anthropic-ai/sdk';
import { ContentBlock } from '@anthropic-ai/sdk/resources';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { EditorEngine } from '..';
import { AssistantChatMessageImpl, UserChatMessageImpl } from './message';
import { MainChannels } from '/common/constants';
import {
    ChatMessageRole,
    FileMessageContext,
    HighlightedMessageContext,
} from '/common/models/chat';

const MOCK_RESPONSES_MESSAGE = new UserChatMessageImpl('Test message with some selected files', [
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

export class ChatManager {
    isWaiting = false;
    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[] = [
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
    }
}

/**
 * 
 * {
    "id": "msg_01Qi9dW9GPMSgMqLd8hn3NbN",
    "type": "message",
    "role": "assistant",
    "model": "claude-3-haiku-20240307",
    "content": [
        {
            "type": "text",
            "text": "Okay, here is an updated version of the file with changes to make the content more interesting:"
        },
        {
            "type": "tool_use",
            "id": "toolu_01MWCYZMqzM3CmUm7uW5UdiA",
            "name": "generate_code",
            "input": {
                "changes": "[\n  {\n    \"fileName\": \"/Users/kietho/workplace/onlook/test/_123/app/page.tsx\",\n    \"code\": `\nconst NoiseOverlay = () => (\n  <div\n    className=\"fixed inset-0 pointer-events-none z-50 mix-blend-multiply\"\n    style={{\n      backgroundImage: `url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")`,\n      filter: 'contrast(120%) brightness(120%)',\n    }}\n  />\n);\n\nexport default function Page() {\n  return (\n    <div className=\"w-full min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 relative overflow-hidden\">\n      <NoiseOverlay />\n      <div className=\"text-center text-white p-8 relative z-10\">\n        <h1 className=\"text-6xl font-extrabold mb-4 tracking-tight\">\n          Unleash Your Creativity\n        </h1>\n        <p className=\"text-2xl text-gray-200 mb-8\">\n          Discover the limitless possibilities of your imagination\n        </p>\n        <button className=\"bg-white text-purple-500 px-6 py-3 rounded-full font-semibold hover:bg-purple-500 hover:text-white transition-colors\">\n          Explore Now\n        </button>\n      </div>\n    </div>\n  );\n}\n`,\n    \"description\": \"Updated the design and content to make it more vibrant and engaging. Changed the background to a gradient, updated the heading and subheading text, and added a call-to-action button.\"\n  }\n]"
            }
        }
    ],
    "stop_reason": "tool_use",
    "stop_sequence": null,
    "usage": {
        "input_tokens": 1006,
        "output_tokens": 622
    }
}
 */
