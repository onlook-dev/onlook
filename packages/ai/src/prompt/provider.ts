import type {
    ErrorMessageContext,
    FileMessageContext,
    HighlightMessageContext,
    ProjectMessageContext,
} from '@onlook/models/chat';
import { CONTEXT_PROMPTS } from './context';
import { CREATE_PAGE_EXAMPLE_CONVERSATION, PAGE_SYSTEM_PROMPT } from './create';
import { EDIT_PROMPTS, SEARCH_REPLACE_EXAMPLE_CONVERSATION } from './edit';
import { FENCE } from './format';
import { wrapXml } from './helpers';
import { PLATFORM_SIGNATURE } from './signatures';

export class PromptProvider {
    shouldWrapXml: boolean;
    constructor(shouldWrapXml = true) {
        this.shouldWrapXml = shouldWrapXml;
    }

    getSystemPrompt(platform: NodeJS.Platform) {
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
        prompt = prompt.replace(PLATFORM_SIGNATURE, platform);
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

    getUserMessage(
        message: string,
        context: {
            files: FileMessageContext[];
            highlights: HighlightMessageContext[];
            errors: ErrorMessageContext[];
            project?: ProjectMessageContext;
        },
    ) {
        if (message.length === 0) {
            throw new Error('Message is required');
        }

        let prompt = '';
        let contextPrompt = this.getFilesContent(context.files, context.highlights);
        if (contextPrompt) {
            if (this.shouldWrapXml) {
                contextPrompt = wrapXml('context', contextPrompt);
            }
            prompt += contextPrompt;
        }

        if (context.errors.length > 0) {
            let errorPrompt = this.getErrorsContent(context.errors);
            prompt += errorPrompt;
        }

        if (context.project) {
            prompt += this.getProjectContext(context.project);
        }

        if (this.shouldWrapXml) {
            prompt += wrapXml('instruction', message);
        } else {
            prompt += message;
        }
        return prompt;
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

    getProjectContext(project: ProjectMessageContext) {
        const content = `${CONTEXT_PROMPTS.projectContextPrefix} ${project.path}`;
        if (this.shouldWrapXml) {
            return wrapXml('project-info', content);
        }
        return content;
    }
}
