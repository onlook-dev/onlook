import type {
    ChatMessageContext,
    ErrorMessageContext,
    FileMessageContext,
    HighlightMessageContext,
    ProjectMessageContext,
} from '@onlook/models';
import type { Attachment, Message, UserContent } from 'ai';
import { CONTEXT_PROMPTS } from './context';
import { CREATE_PAGE_EXAMPLE_CONVERSATION, PAGE_SYSTEM_PROMPT } from './create';
import { EDIT_PROMPTS, SEARCH_REPLACE_EXAMPLE_CONVERSATION } from './edit';
import { FENCE } from './format';
import { wrapXml } from './helpers';
import { PLATFORM_SIGNATURE } from './signatures';
import { SUMMARY_PROMPTS } from './summary';

export class PromptProvider {
    shouldWrapXml: boolean;
    constructor(shouldWrapXml = true) {
        this.shouldWrapXml = shouldWrapXml;
    }

    getSystemPrompt() {
        let prompt = '';

        if (this.shouldWrapXml) {
            prompt += wrapXml('role', EDIT_PROMPTS.system);
            prompt += wrapXml('search-replace-rules', EDIT_PROMPTS.searchReplaceRules);
            prompt += wrapXml(
                'example-conversation',
                this.getExampleConversation(SEARCH_REPLACE_EXAMPLE_CONVERSATION),
            );
        } else {
            prompt += EDIT_PROMPTS.system;
            prompt += EDIT_PROMPTS.searchReplaceRules;
            prompt += this.getExampleConversation(SEARCH_REPLACE_EXAMPLE_CONVERSATION);
        }
        prompt = prompt.replace(PLATFORM_SIGNATURE, 'linux');
        return prompt;
    }

    getCreatePageSystemPrompt() {
        let prompt = '';

        if (this.shouldWrapXml) {
            prompt += wrapXml('role', PAGE_SYSTEM_PROMPT.role);
            prompt += wrapXml('rules', PAGE_SYSTEM_PROMPT.rules);
            prompt += wrapXml(
                'example-conversation',
                this.getExampleConversation(CREATE_PAGE_EXAMPLE_CONVERSATION),
            );
        } else {
            prompt += PAGE_SYSTEM_PROMPT.role;
            prompt += PAGE_SYSTEM_PROMPT.rules;
            prompt += this.getExampleConversation(CREATE_PAGE_EXAMPLE_CONVERSATION);
        }
        return prompt;
    }

    getExampleConversation(
        conversation: {
            role: string;
            content: string;
        }[],
    ) {
        let prompt = '';
        for (const message of conversation) {
            prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
        }
        return prompt;
    }

    getHydratedUserMessage(
        id: string,
        content: UserContent,
        context: ChatMessageContext[],
    ): Message {
        if (content.length === 0) {
            throw new Error('Message is required');
        }

        const files = context.filter((c) => c.type === 'file').map((c) => c);
        const highlights = context.filter((c) => c.type === 'highlight').map((c) => c);
        const errors = context.filter((c) => c.type === 'error').map((c) => c);
        const project = context.filter((c) => c.type === 'project').map((c) => c);
        const images = context.filter((c) => c.type === 'image').map((c) => c);

        let prompt = '';
        let contextPrompt = this.getFilesContent(files, highlights);
        if (contextPrompt) {
            if (this.shouldWrapXml) {
                contextPrompt = wrapXml('context', contextPrompt);
            }
            prompt += contextPrompt;
        }

        if (errors.length > 0) {
            let errorPrompt = this.getErrorsContent(errors);
            prompt += errorPrompt;
        }

        if (project.length > 0) {
            const projectContext = project[0];
            if (projectContext) {
                prompt += this.getProjectContext(projectContext);
            }
        }

        if (this.shouldWrapXml) {
            const textContent =
                typeof content === 'string'
                    ? content
                    : content
                          .filter((c) => c.type === 'text')
                          .map((c) => c.text)
                          .join('\n');
            prompt += wrapXml('instruction', textContent);
        } else {
            prompt += content;
        }

        const attachments: Attachment[] = images.map((i) => ({
            type: 'image',
            contentType: i.mimeType,
            url: i.content,
        }));

        return {
            id,
            role: 'user',
            content: prompt,
            experimental_attachments: attachments,
        };
    }

    getFilesContent(files: FileMessageContext[], highlights: HighlightMessageContext[]) {
        if (files.length === 0) {
            return '';
        }
        let prompt = '';
        prompt += `${CONTEXT_PROMPTS.filesContentPrefix}\n`;
        let index = 1;
        for (const file of files) {
            let filePrompt = `${file.path}\n`;
            filePrompt += `${FENCE.code.start}${this.getLanguageFromFilePath(file.path)}\n`;
            filePrompt += file.content;
            filePrompt += `\n${FENCE.code.end}\n`;
            filePrompt += this.getHighlightsContent(file.path, highlights);

            if (this.shouldWrapXml) {
                filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
            }
            prompt += filePrompt;
            index++;
        }

        return prompt;
    }

    getErrorsContent(errors: ErrorMessageContext[]) {
        if (errors.length === 0) {
            return '';
        }
        let prompt = `${CONTEXT_PROMPTS.errorsContentPrefix}\n`;
        for (const error of errors) {
            prompt += `${error.content}\n`;
        }

        if (prompt.trim().length > 0 && this.shouldWrapXml) {
            prompt = wrapXml('errors', prompt);
        }
        return prompt;
    }

    getLanguageFromFilePath(filePath: string): string {
        return filePath.split('.').pop() || '';
    }

    getHighlightsContent(filePath: string, highlights: HighlightMessageContext[]) {
        const fileHighlights = highlights.filter((h) => h.path === filePath);
        if (fileHighlights.length === 0) {
            return '';
        }
        let prompt = `${CONTEXT_PROMPTS.highlightPrefix}\n`;
        let index = 1;
        for (const highlight of fileHighlights) {
            let highlightPrompt = `${filePath}#L${highlight.start}:L${highlight.end}\n`;
            highlightPrompt += `${FENCE.code.start}\n`;
            highlightPrompt += highlight.content;
            highlightPrompt += `\n${FENCE.code.end}\n`;
            if (this.shouldWrapXml) {
                highlightPrompt = wrapXml(
                    fileHighlights.length > 1 ? `highlight-${index}` : 'highlight',
                    highlightPrompt,
                );
            }
            prompt += highlightPrompt;
            index++;
        }
        return prompt;
    }

    getSummaryPrompt() {
        let prompt = '';

        if (this.shouldWrapXml) {
            prompt += wrapXml('summary-rules', SUMMARY_PROMPTS.rules);
            prompt += wrapXml('summary-guidelines', SUMMARY_PROMPTS.guidelines);
            prompt += wrapXml('summary-format', SUMMARY_PROMPTS.format);
            prompt += wrapXml('summary-reminder', SUMMARY_PROMPTS.reminder);

            prompt += wrapXml('example-conversation', this.getSummaryExampleConversation());
            prompt += wrapXml(
                'example-summary-output',
                'EXAMPLE SUMMARY:\n' + SUMMARY_PROMPTS.summary,
            );
        } else {
            prompt += SUMMARY_PROMPTS.rules + '\n\n';
            prompt += SUMMARY_PROMPTS.guidelines + '\n\n';
            prompt += SUMMARY_PROMPTS.format + '\n\n';
            prompt += SUMMARY_PROMPTS.reminder + '\n\n';
            prompt += this.getSummaryExampleConversation();
            prompt += 'EXAMPLE SUMMARY:\n' + SUMMARY_PROMPTS.summary + '\n\n';
        }

        return prompt;
    }

    getSummaryExampleConversation() {
        let prompt = 'EXAMPLE CONVERSATION:\n';
        for (const message of SEARCH_REPLACE_EXAMPLE_CONVERSATION) {
            prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
        }
        return prompt;
    }

    getProjectContext(project: ProjectMessageContext) {
        const content = `${CONTEXT_PROMPTS.projectContextPrefix} ${project.path}`;
        if (this.shouldWrapXml) {
            return wrapXml('project-info', content);
        }
        return content;
    }
}
