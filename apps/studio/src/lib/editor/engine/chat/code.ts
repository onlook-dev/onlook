import { sendAnalytics } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { AssistantChatMessage, CodeBlock } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { makeAutoObservable } from 'mobx';
import type { ChatManager } from '.';
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
        if (!message || message.type !== 'assistant') {
            console.error('Invalid message');
            return;
        }

        const fileToCodeBlocks = this.getFileToCodeBlocks(message);
        const errors: Array<{ file: string; error: string }> = [];

        for (const [file, codeBlocks] of fileToCodeBlocks) {
            try {
                const originalContent = await this.editorEngine.code.getFileContent(file, true);
                if (originalContent == null) {
                    errors.push({ file, error: 'Failed to get file content' });
                    continue;
                }

                let content = originalContent;
                for (const block of codeBlocks) {
                    try {
                        content = await this.processor.applyDiff(content, block.content, file);
                    } catch (error) {
                        errors.push({
                            file,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                        continue;
                    }
                }

                const success = await this.writeFileContent(file, content, originalContent);
                if (!success) {
                    errors.push({ file, error: 'Failed to write file content' });
                    continue;
                }

                message.applied = true;
                message.snapshots[file] = {
                    path: file,
                    original: originalContent,
                    generated: content,
                };
            } catch (error) {
                errors.push({
                    file,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        if (errors.length > 0) {
            await this.chat.sendNewMessage({
                type: 'system',
                content: `Code application failed:\n${errors
                    .map((e) => `File: ${e.file}\nError: ${e.error}`)
                    .join('\n\n')}`,
            });
        }

        this.chat.conversation.current?.updateMessage(message);
        this.chat.conversation.saveConversationToStorage();
        this.chat.suggestions.shouldHide = false;
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
                snapshot.original,
                snapshot.generated,
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

    dispose() {
        // Clean up processor
        this.processor = null as any;

        // Clear references
        this.chat = null as any;
        this.editorEngine = null as any;
    }
}
