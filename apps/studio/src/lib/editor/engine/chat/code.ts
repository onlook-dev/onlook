import type { ChatManager } from '.';

import { invokeMainChannel } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { AssistantChatMessage, CodeBlock } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';

export class ChatCodeManager {
    processor: CodeBlockProcessor;

    constructor(private chat: ChatManager) {
        makeAutoObservable(this);
        this.processor = new CodeBlockProcessor();
    }

    async applyCode(messageId: string) {
        const message = this.chat.conversation.current?.getMessageById(messageId);
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
            message.applied = true;
            message.snapshot = content;
            this.chat.conversation.current?.updateMessage(message);
            this.chat.conversation.saveConversationToStorage();
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

    async revertCode(messageId: string) {
        const message = this.chat.conversation.current?.getMessageById(messageId);
        if (!message) {
            console.error('No message found with id', messageId);
            return;
        }
        if (message.type !== 'assistant') {
            console.error('Can only revert code to assistant messages');
            return;
        }
        if (!message.applied) {
            console.error('Code is not applied');
            return;
        }
        message.applied = false;
        console.log(message.snapshot);
        this.chat.conversation.current?.updateMessage(message);
        this.chat.conversation.saveConversationToStorage();

        // if (!this.conversation.current) {
        //     console.error('No conversation found');
        //     return;
        // }

        // const codeDiff: CodeDiff[] = [
        //     {
        //         path: change.fileName,
        //         original: change.value,
        //         generated: change.original,
        //     },
        // ];

        // const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        // if (!res) {
        //     console.error('Failed to revert code change');
        //     return;
        // }

        // this.conversation.current.updateCodeReverted(change.id);
        // this.conversation.saveConversationToStorage();
        // sendAnalytics('revert code change');
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
