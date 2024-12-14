import { invokeMainChannel } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { AssistantChatMessage, ChatConversation, CodeBlock } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class ChatCodeManager {
    processor: CodeBlockProcessor;

    constructor() {
        makeAutoObservable(this);
        this.processor = new CodeBlockProcessor();
    }

    async applyCode(messageId: string, conversation: ChatConversation) {
        const message = conversation.messages.find((m) => m.id === messageId);
        if (!message) {
            console.error('No message found with id', messageId);
            return;
        }
        if (message.type !== 'assistant') {
            console.error('Can only apply code to assistant messages');
            return;
        }
        const fileToCodeBlocks = this.getFileToCodeBlocks(message);
        for (const [file, codeBlocks] of fileToCodeBlocks) {
            const originalContent = await this.getFileContent(file);
            if (!originalContent) {
                console.error('Failed to get file content', file);
                continue;
            }
            let content = originalContent;
            for (const block of codeBlocks) {
                content = this.processor.applyDiff(content, block.content);
            }

            // TODO: Save snapshot and write to file
            console.log(content);
        }

        // TODO:
        // 1. Get code blocks
        // 2. Get code diffs from code blocks
        // 3. Apply code diffs
        // 4. Save snapshot
        // 5. Write to file

        // Optional: Move code stuff to conversation and subclass

        // const codeDiff: CodeDiff[] = [
        //     {
        //         path: message.content,
        //         original: '',
        //         generated: message.content,
        //     },
        // ];

        // const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        // if (!res) {
        //     console.error('Failed to apply code change');
        //     return;
        // }

        // if (!this.conversation.current) {
        //     console.error('No conversation found');
        //     return;
        // }

        // this.conversation.current.updateCodeApplied(change.id);
        // this.saveConversationToStorage();
        // sendAnalytics('apply code change');
    }

    getFileToCodeBlocks(message: AssistantChatMessage) {
        const content = message.content;
        const codeBlocks = this.processor.extractCodeBlocks(content);
        const fileToCode: Map<string, CodeBlock[]> = new Map();
        for (const codeBlock of codeBlocks) {
            if (!codeBlock.fileName) {
                continue;
            }
            fileToCode.set(codeBlock.fileName, [
                ...(fileToCode.get(codeBlock.fileName) ?? []),
                codeBlock,
            ]);
        }
        return fileToCode;
    }

    async getFileContent(path: string): Promise<string | null> {
        return invokeMainChannel(MainChannels.GET_FILE_CONTENT, path);
    }
}
