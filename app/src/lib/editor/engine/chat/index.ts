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
import { ToolCodeChange, ToolCodeChangeResult } from '/common/models/chat/tool';
import { CodeDiff } from '/common/models/code';

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

    async sendMessage(content: string, stream = true): Promise<void> {
        this.isWaiting = true;
        const userMessage = await this.addUserMessage(content);
        const messageParams = this.getMessageParams();

        if (stream) {
            const requestId = nanoid();
            await window.api.invoke(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
                messages: messageParams,
                requestId,
            });
        } else {
            const res: Anthropic.Messages.Message | null = await window.api.invoke(
                MainChannels.SEND_CHAT_MESSAGES,
                messageParams,
            );
            this.isWaiting = false;
            if (!res) {
                console.error('No response received');
                return;
            }
            this.handleChatResponse(res, userMessage);
        }
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
            return this.applyGeneratedCode(toolBlock);
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

/**
 * 
event {
  type: 'message_start',
  message: {
    id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
    type: 'message',
    role: 'assistant',
    model: 'claude-3-5-sonnet-20241022',
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 1022, output_tokens: 1 }
  }
}
event {
  type: 'content_block_start',
  index: 0,
  content_block: { type: 'text', text: '' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'I' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: "'ll" }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' help' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' you modify' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' the code to implement' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' a' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' dark mode version' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' of the current' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' design' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: '. I' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: "'ll update" }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' the backgroun' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'd an' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: 'd text colors to create a' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' dark theme while' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' maintaining the same' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' layout' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: ' and structure' }
}
event {
  type: 'content_block_delta',
  index: 0,
  delta: { type: 'text_delta', text: '.' }
}
contentBlock {
  type: 'text',
  text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
}
event { type: 'content_block_stop', index: 0 }
event {
  type: 'content_block_start',
  index: 1,
  content_block: {
    type: 'tool_use',
    id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
    name: 'generate_code',
    input: {}
  }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '{"chang' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'es": [{' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"fileNam' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e": "/Us' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ers/k' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ietho/workpl' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ace/onlook' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '/tes' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't/test/' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'app/page.tsx' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '", "value": ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"expor' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't defaul' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't funct' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ion Pa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ge() {\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'n    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ret' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'urn (\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       <di' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'v classNa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'me=\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"w-full m' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'in-h-scre' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'en flex ite' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ms-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'center ju' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'stify' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-center bg-g' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ray-900' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' relative ov' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'erflo' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'w-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'hidden\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '">\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '         <di' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'v classNa' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'me=\\"text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'center text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'white p-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '8 relative' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' z-10\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '>\\n         ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '   <h1 clas' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'sN' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ame=' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'text-5xl f' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ont' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-semi' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'bold mb' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-4 ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'tracking-t' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ight\\">\\n  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '     ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      Welcom' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e to' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' you' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'r a' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'pp\\n      ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '          </' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'h1>\\n       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' <p c' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'lassName=\\"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'text-2xl tex' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 't-gray-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '300 mb' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-8\\">\\n     ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '       ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '  Open thi' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 's page in O' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'nlook to ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'start' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\n   ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '            ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' </p>\\n ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '           <' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '/d' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'iv>\\n  ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '      </div>' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '\\n' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '    );\\n}\\n"' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ', "descripti' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'on":' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' "' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'Updated the ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'color' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' scheme ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'to da' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rk mod' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'e ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'by:\\n1.' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' Changed b' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ackg' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'round' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' from bg-w' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'hite to ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'bg-gray-90' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '0\\' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'n2.' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' Ch' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'anged te' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'xt-gray-900' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' to text' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-white fo' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'r better ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'contr' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ast\\n3. Up' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'dated ' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'secondary t' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ext color f' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rom text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'gr' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ay' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '-8' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '00 to text-' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'gray-300' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: ' for bett' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'er readabili' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'ty in da' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: 'rk mode' }
}
event {
  type: 'content_block_delta',
  index: 1,
  delta: { type: 'input_json_delta', partial_json: '"}]}' }
}
contentBlock {
  type: 'tool_use',
  id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
  name: 'generate_code',
  input: { changes: [ [Object] ] }
}
event { type: 'content_block_stop', index: 1 }
event {
  type: 'message_delta',
  delta: { stop_reason: 'tool_use', stop_sequence: null },
  usage: { output_tokens: 374 }
}
message {
  id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
  type: 'message',
  role: 'assistant',
  model: 'claude-3-5-sonnet-20241022',
  content: [
    {
      type: 'text',
      text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
    },
    {
      type: 'tool_use',
      id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
      name: 'generate_code',
      input: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1022, output_tokens: 374 }
}
event { type: 'message_stop' }
finalMessage {
  id: 'msg_01YYhGfvG6MsXQbxFB84q2aY',
  type: 'message',
  role: 'assistant',
  model: 'claude-3-5-sonnet-20241022',
  content: [
    {
      type: 'text',
      text: "I'll help you modify the code to implement a dark mode version of the current design. I'll update the background and text colors to create a dark theme while maintaining the same layout and structure."
    },
    {
      type: 'tool_use',
      id: 'toolu_01QSnwkoX6Z8EMYY5YQrzDJ9',
      name: 'generate_code',
      input: [Object]
    }
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: { input_tokens: 1022, output_tokens: 374 }
}
 */
