import type { ChatManager } from '.';

import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { AssistantChatMessage, CodeBlock } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ChatCodeManager {
    processor: CodeBlockProcessor;

    constructor(
        private chat: ChatManager,
        private editorEngine: EditorEngine,
    ) {
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
            const originalContent = await this.getFileContent(file, true);
            if (!originalContent) {
                console.error('Failed to get file content', file);
                continue;
            }
            let content = originalContent;
            for (const block of codeBlocks) {
                content = this.processor.applyDiff(content, block.content);
            }

            const success = await this.writeFileContent(file, content, originalContent);
            if (!success) {
                console.error('Failed to write file content');
                continue;
            }

            message.applied = true;
            message.snapshots[file] = {
                path: file,
                original: originalContent,
                generated: content,
            };
            this.chat.conversation.current?.updateMessage(message);
            this.chat.conversation.saveConversationToStorage();
        }

        sendAnalytics('apply code change');
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

        for (const [file, snapshot] of Object.entries(message.snapshots)) {
            const success = await this.writeFileContent(
                file,
                snapshot.generated,
                snapshot.original,
            );
            if (!success) {
                console.error('Failed to revert code change');
                return;
            }
        }

        message.applied = false;
        this.chat.conversation.current?.updateMessage(message);
        this.chat.conversation.saveConversationToStorage();
        sendAnalytics('revert code change');
    }

    async writeFileContent(
        path: string,
        content: string,
        originalContent: string,
    ): Promise<boolean> {
        const codeDiff: CodeDiff[] = [
            {
                path: path,
                original: originalContent,
                generated: content,
            },
        ];
        this.editorEngine.code.runCodeDiffs(codeDiff);
        return true;
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

    async getFileContent(filePath: string, stripIds: boolean): Promise<string | null> {
        return invokeMainChannel(MainChannels.GET_FILE_CONTENT, { filePath, stripIds });
    }
}
