import Anthropic from '@anthropic-ai/sdk';
import { makeAutoObservable } from 'mobx';
import { EditorEngine } from '..';
import { ChatMessageImpl } from './message';
import { MainChannels } from '/common/constants';
import {
    ChatMessageRole,
    FileMessageContext,
    HighlightedMessageContext,
} from '/common/models/chat';

const MOCK_RESPONSES_MESSAGE = new ChatMessageImpl(
    ChatMessageRole.USER,
    'Test message with some selected files',
    [
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
    ],
);

export class ChatManager {
    isWaiting = false;
    messages: ChatMessageImpl[] = [
        new ChatMessageImpl(ChatMessageRole.ASSISTANT, 'Hello! How can I assist you today?'),
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
        const message = res.content[0];
        if (message.type !== 'text') {
            throw new Error('Unexpected content type');
        }
        this.addAssistantMessage(message.text);
    }

    async addUserMessage(content: string) {
        const context = await this.getMessageContext();
        const newMessage = new ChatMessageImpl(ChatMessageRole.USER, content, context);
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

    addAssistantMessage(content: string) {
        this.messages = [...this.messages, new ChatMessageImpl(ChatMessageRole.ASSISTANT, content)];
    }
}

/**
 * {
    "id": "msg_01VZhxHCKKQX3rRbgBqCjbC7",
    "type": "message",
    "role": "assistant",
    "model": "claude-3-haiku-20240307",
    "content": [
        {
            "type": "text",
            "text": "Here's the updated `page.tsx` file with the requested changes:\n\n```typescript\nexport default function Page() {\n  return (\n    <div className=\"w-full min-h-screen flex items-center justify-center relative overflow-hidden flex-col gap-[50px] bg-transparent\">\n      <Flex />\n      <Text />\n      <Grid />\n    </div>\n  );\n}\n\nfunction Flex() {\n  return (\n    <div className=\"bg-transparent h-[fit-content] w-[fit-content]\">\n      <p className=\"w-[fit-content] h-[fit-content]\">Flex</p>\n      <div className=\"rounded-[10px] border border-[#000000] w-[800px] h-[800px] flex flex-col justify-center items-center gap-[20px] bg-[#C9A791]\">\n        <div className=\"h-[149px] text-[56px] flex flex-col justify-center items-center m-0 gap-[10px] border-[10px] border-[#8a2222] w-[182px] bg-red-500\">\n          EFG\n        </div>\n        <div className=\"h-[149px] border-[10px] border-[#000000] text-[56px] flex flex-col justify-center items-center gap-[10px] m-0 w-[192px] bg-[#49DED6]\">\n          abc\n        </div>\n\n        <div className=\"w-[182px] h-[149px] border-[10px] text-[56px] flex flex-col justify-center items-center bg-[#3f783f] border-[#b1b1a2] m-0 gap-[10px]\">\n          789\n        </div>\n        <div className=\"w-[182px] h-[149px] border-[10px] border-[#000000] text-[56px] flex flex-col justify-center items-center bg-[#9e1111] m-0 gap-[10px]\">\n          xyz\n        </div>\n      </div>\n    </div>\n  );\n}\n\nfunction Text() {\n  return (\n    <div className=\"bg-transparent h-[fit-content] w-[fit-content]\">\n      <p className=\"w-[fit-content] h-[fit-content]\">Text</p>\n      <div className=\"rounded-[10px] bg-transparent border border-[#000000] w-[800px] grid-rows-[repeat(3,_1fr)] grid-cols-[repeat(3,_1fr)] p-[40px] gap-[30px] block h-[500px]\">\n        <h1 className=\"w-[123px] h-[49px]\">H1</h1>\n        <h2 className=\"w-[123px] h-[49px]\">H2</h2>\n        <h3 className=\"w-[123px] h-[49px]\">H3</h3>\n        <h4 className=\"w-[123px] h-[49px]\">H4</h4>\n        <h4 className=\"w-[123px] h-[49px]\">H4</h4>\n        <h5 className=\"w-[123px] h-[49px]\">H5</h5>\n        <h6 className=\"w-[123px] h-[49px]\">H5</h6>\n        <p className=\"w-[123px] h-[49px]\">p</p>\n        <span className=\"w-[123px] h-[49px]\">span</span>\n        <span className=\"w-[123px] h-[49px]\">\n          Lorem ipsum dolor sit amet, consectetur adipiscing elit. In blandit\n          neque et tortor sodales iaculis.{\" \"}\n        </span>\n      </div>\n    </div>\n  );\n}\n\nfunction Grid() {\n  return (\n    <div className=\"bg-transparent h-[fit-content] w-[fit-content]\">\n      <p className=\"w-[fit-content] h-[fit-content]"
        }
    ],
    "stop_reason": "max_tokens",
    "stop_sequence": null,
    "usage": {
        "input_tokens": 1654,
        "output_tokens": 1024
    }
}
 */
