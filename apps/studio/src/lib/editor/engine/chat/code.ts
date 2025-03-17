import type { ProjectsManager } from '@/lib/projects';
import { sendAnalytics } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import { ChatMessageRole, type AssistantChatMessage, type CodeBlock } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { makeAutoObservable } from 'mobx';
import type { ChatManager } from '.';
import type { EditorEngine } from '..';

export class ChatCodeManager {
    processor: CodeBlockProcessor;

    constructor(
        private chat: ChatManager,
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.processor = new CodeBlockProcessor();
    }

    async applyCode(messageId: string, commitMessage?: string) {
        const message = this.chat.conversation.current?.getMessageById(messageId);
        if (!message) {
            console.error('No message found with id', messageId);
            return;
        }
        if (message.role !== ChatMessageRole.ASSISTANT) {
            console.error('Can only apply code to assistant messages');
            return;
        }

        this.projectsManager.versions?.createCommit(
            commitMessage ?? 'Save before applying code',
            false,
        );

        const fileToCodeBlocks = this.getFileToCodeBlocks(message);

        for (const [file, codeBlocks] of fileToCodeBlocks) {
            // If file doesn't exist, we'll assume it's a new file and create it
            const originalContent =
                (await this.editorEngine.code.getFileContent(file, false)) || '';
            if (originalContent == null) {
                console.error('Failed to get file content', file);
                continue;
            }
            let content = originalContent;
            for (const block of codeBlocks) {
                content = await this.processor.applyDiff(content, block.content);
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

        const selectedWebviews = this.editorEngine.webviews.selected;
        for (const webview of selectedWebviews) {
            await this.editorEngine.ast.refreshAstDoc(webview);
        }

        this.chat.suggestions.shouldHide = false;

        setTimeout(() => {
            this.editorEngine.webviews.reloadWebviews();
            this.editorEngine.errors.clear();
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
        this.chat.conversation.saveConversationToStorage();
        setTimeout(() => {
            this.editorEngine.webviews.reloadWebviews();
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
        this.editorEngine.code.runCodeDiffs(codeDiff);
        return true;
    }

    getFileToCodeBlocks(message: AssistantChatMessage) {
        // TODO: Need to handle failure cases
        const content = message.content;
        const contentString =
            typeof content === 'string'
                ? content
                : content.map((part) => (part.type === 'text' ? part.text : '')).join('');
        const codeBlocks = this.processor.extractCodeBlocks(contentString);
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
