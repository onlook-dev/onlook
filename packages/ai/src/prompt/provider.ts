import type {
    ChatMessageContext,
    ErrorMessageContext,
    FileMessageContext,
    HighlightMessageContext,
    ProjectMessageContext,
} from '@onlook/models';
import type { Attachment, Message, UserContent } from 'ai';
import { ASK_MODE_SYSTEM_PROMPT } from './ask';
import { CONTEXT_PROMPTS } from './context';
import { CREATE_NEW_PAGE_SYSTEM_PROMPT } from './create';
import { CODE_FENCE } from './format';
import { wrapXml } from './helpers';
import { SHELL_PROMPT } from './shell';
import { SUMMARY_PROMPTS } from './summary';
import { SYSTEM_PROMPT } from './system';

export function getSystemPrompt() {
    let prompt = '';
    prompt += wrapXml('role', SYSTEM_PROMPT);
    prompt += wrapXml('shell', SHELL_PROMPT);
    return prompt;
}

export function getCreatePageSystemPrompt() {
    let prompt = getSystemPrompt() + '\n\n';
    prompt += wrapXml('create-system-prompt', CREATE_NEW_PAGE_SYSTEM_PROMPT);
    return prompt;
}

export function getAskModeSystemPrompt() {
    let prompt = '';
    prompt += wrapXml('role', ASK_MODE_SYSTEM_PROMPT);
    return prompt;
}

export function getExampleConversation(
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

export function getHydratedUserMessage(
    id: string,
    content: UserContent,
    context: ChatMessageContext[],
): Message {
    const files = context.filter((c) => c.type === 'file').map((c) => c);
    const highlights = context.filter((c) => c.type === 'highlight').map((c) => c);
    const errors = context.filter((c) => c.type === 'error').map((c) => c);
    const project = context.filter((c) => c.type === 'project').map((c) => c);
    const images = context.filter((c) => c.type === 'image').map((c) => c);

    let prompt = '';
    let contextPrompt = getFilesContent(files, highlights);
    if (contextPrompt) {
        contextPrompt = wrapXml('context', contextPrompt);
        prompt += contextPrompt;
    }

    if (errors.length > 0) {
        let errorPrompt = getErrorsContent(errors);
        prompt += errorPrompt;
    }

    if (project.length > 0) {
        const projectContext = project[0];
        if (projectContext) {
            prompt += getProjectContext(projectContext);
        }
    }

    const textContent =
        typeof content === 'string'
            ? content
            : content
                  .filter((c) => c.type === 'text')
                  .map((c) => c.text)
                  .join('\n');
    prompt += wrapXml('instruction', textContent);

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

export function getFilesContent(
    files: FileMessageContext[],
    highlights: HighlightMessageContext[],
) {
    if (files.length === 0) {
        return '';
    }
    let prompt = '';
    prompt += `${CONTEXT_PROMPTS.filesContentPrefix}\n`;
    let index = 1;
    for (const file of files) {
        let filePrompt = `${file.path}\n`;
        filePrompt += `${CODE_FENCE.start}${getLanguageFromFilePath(file.path)}\n`;
        filePrompt += file.content;
        filePrompt += `\n${CODE_FENCE.end}\n`;
        filePrompt += getHighlightsContent(file.path, highlights);

        filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
        prompt += filePrompt;
        index++;
    }

    return prompt;
}

export function getErrorsContent(errors: ErrorMessageContext[]) {
    if (errors.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.errorsContentPrefix}\n`;
    for (const error of errors) {
        prompt += `${error.content}\n`;
    }

    prompt = wrapXml('errors', prompt);
    return prompt;
}

export function getLanguageFromFilePath(filePath: string): string {
    return filePath.split('.').pop() || '';
}

export function getHighlightsContent(filePath: string, highlights: HighlightMessageContext[]) {
    const fileHighlights = highlights.filter((h) => h.path === filePath);
    if (fileHighlights.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.highlightPrefix}\n`;
    let index = 1;
    for (const highlight of fileHighlights) {
        let highlightPrompt = `${filePath}#L${highlight.start}:L${highlight.end}\n`;
        highlightPrompt += `${CODE_FENCE.start}\n`;
        highlightPrompt += highlight.content;
        highlightPrompt += `\n${CODE_FENCE.end}\n`;
        highlightPrompt = wrapXml(
            fileHighlights.length > 1 ? `highlight-${index}` : 'highlight',
            highlightPrompt,
        );
        prompt += highlightPrompt;
        index++;
    }
    return prompt;
}

export function getSummaryPrompt() {
    let prompt = '';

    prompt += wrapXml('summary-rules', SUMMARY_PROMPTS.rules);
    prompt += wrapXml('summary-guidelines', SUMMARY_PROMPTS.guidelines);
    prompt += wrapXml('summary-format', SUMMARY_PROMPTS.format);
    prompt += wrapXml('summary-reminder', SUMMARY_PROMPTS.reminder);

    prompt += wrapXml('example-summary-output', 'EXAMPLE SUMMARY:\n' + SUMMARY_PROMPTS.summary);
    return prompt;
}

export function getProjectContext(project: ProjectMessageContext) {
    const content = `${CONTEXT_PROMPTS.projectContextPrefix} ${project.path}`;
    return wrapXml('project-info', content);
}
