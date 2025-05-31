import { api } from '@/trpc/client';
import { sendAnalytics } from '@/utils/analytics';
import { CodeBlockProcessor } from '@onlook/ai';
import type { WriteCodeAction } from '@onlook/models/actions';
import { ChatMessageRole, type AssistantChatMessage, type CodeBlock } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { toast } from '@onlook/ui/sonner';
import { makeAutoObservable } from 'mobx';
import type { ChatManager } from '.';
import type { EditorEngine } from '../engine';

export class ChatCodeManager {
    isApplying = false;
    processor: CodeBlockProcessor;

    constructor(
        private chat: ChatManager,
        private editorEngine: EditorEngine,
    ) {
        this.processor = new CodeBlockProcessor();
        makeAutoObservable(this);
    }

    async applyCode(messageId: string) {
        this.isApplying = true;
        const message = this.chat.conversation.current?.getMessageById(messageId);
        if (!message) {
            console.error('No message found with id', messageId);
            return;
        }
        if (message.role !== ChatMessageRole.ASSISTANT) {
            console.error('Can only apply code to assistant messages');
            return;
        }

        const fileToCodeBlocks = this.getFileToCodeBlocks(message);

        for (const [filePath, codeBlocks] of fileToCodeBlocks) {
            // If file doesn't exist, we'll assume it's a new file and create it
            const originalContent = (await this.editorEngine.sandbox.readFile(filePath)) || '';
            if (originalContent == null) {
                console.error('Failed to get file content', filePath);
                continue;
            }
            let content = originalContent;
            for (const block of codeBlocks) {
                const result = await api.code.applyDiff.mutate({
                    originalCode: content,
                    updateSnippet: block.content,
                });
                if (result.error || !result.result) {
                    console.error('Failed to apply code block', block);
                    toast.error('Failed to apply code block', {
                        description: 'Please try again or prompt the AI to fix it.',
                    });
                    continue;
                }
                content = result.result;
            }

            const success = await this.editorEngine.sandbox.writeFile(filePath, content);
            if (!success) {
                console.error('Failed to write file content');
                continue;
            }

            message.applied = true;
            message.snapshots[filePath] = {
                path: filePath,
                original: originalContent,
                generated: content,
            };
            await this.chat.conversation.current?.updateMessage(message);
        }

        const selectedWebviews = this.editorEngine.frames.selected;
        for (const frame of selectedWebviews) {
            await this.editorEngine.ast.refreshAstDoc(frame.view);
        }

        this.chat.suggestions.shouldHide = false;
        this.isApplying = false;

        setTimeout(() => {
            this.editorEngine.frames.reloadAll();
            this.editorEngine.error.clear();
        }, 500);
        sendAnalytics('apply code change');
    }

    async revertCode(messageId: string) {
        const message = this.chat.conversation.current?.getMessageById(messageId);
        if (!message) {
            console.error('No message found with id', messageId);
            return;
        }
        if (message.role !== ChatMessageRole.ASSISTANT) {
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
        setTimeout(() => {
            this.editorEngine.frames.reloadAll();
        }, 500);
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
        const action: WriteCodeAction = {
            type: 'write-code',
            diffs: codeDiff,
        };
        this.editorEngine.action.run(action);
        return true;
    }

    getFileToCodeBlocks(message: AssistantChatMessage) {
        const codeBlocks = this.processor.extractCodeBlocks(message.content);
        const fileToCode: Map<string, CodeBlock[]> = new Map();
        for (const codeBlock of codeBlocks) {
            if (!codeBlock.fileName) {
                console.error('No file name found in code block', codeBlock);
                continue;
            }
            fileToCode.set(codeBlock.fileName, [
                ...(fileToCode.get(codeBlock.fileName) ?? []),
                codeBlock,
            ]);
        }
        return fileToCode;
    }

    clear() { }
}
