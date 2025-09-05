import type {
    ErrorMessageContext,
    FileMessageContext,
    HighlightMessageContext,
    MessageContext,
    ProjectMessageContext,
} from '@onlook/models';
import type { FileUIPart, UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai';
import { ASK_MODE_SYSTEM_PROMPT } from './ask';
import { CONTEXT_PROMPTS } from './context';
import { CREATE_NEW_PAGE_SYSTEM_PROMPT } from './create';
import { CODE_FENCE } from './format';
import { wrapXml } from './helpers';
import { SHELL_PROMPT } from './shell';
import { SUGGESTION_SYSTEM_PROMPT } from './suggest';
import { SUMMARY_PROMPTS } from './summary';
import { SYSTEM_PROMPT } from './system';

export interface HydrateMessageOptions {
    totalMessages: number;
    currentMessageIndex: number;
    lastUserMessageIndex: number;
    lastAssistantMessageIndex: number;
}

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

export function getSuggestionSystemPrompt() {
    let prompt = '';
    prompt += wrapXml('role', SUGGESTION_SYSTEM_PROMPT);
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
    parts: UIMessagePart<UIDataTypes, UITools>[],
    context: MessageContext[],
    opt: HydrateMessageOptions,
): UIMessage {
    let userParts: UIMessagePart<UIDataTypes, UITools>[] = [];
    const files = context.filter((c) => c.type === 'file').map((c) => c);
    const highlights = context.filter((c) => c.type === 'highlight').map((c) => c);
    const errors = context.filter((c) => c.type === 'error').map((c) => c);
    const project = context.filter((c) => c.type === 'project').map((c) => c);
    const images = context.filter((c) => c.type === 'image').map((c) => c);
    const branches = context.filter((c) => c.type === 'branch').map((c) => c);

    // Create branch lookup for easy access to branch info
    const branchLookup = new Map<string, { id: string; name: string }>();
    branches.forEach((branch) => {
        branchLookup.set(branch.branch.id, {
            id: branch.branch.id,
            name: branch.branch.name || branch.branch.id,
        });
    });

    // If there are 50 user messages in the contexts, we can trim all of them except
    // the last one. The logic could be adjusted to trim more or less messages.
    const truncateFileContext = opt.currentMessageIndex < opt.lastUserMessageIndex;
    // Should the code need to trim other types of contexts, it can be done here.

    let prompt = '';
    if (truncateFileContext) {
        const contextPrompt = getTruncatedFilesContent(files, branchLookup);
        if (contextPrompt) {
            prompt += wrapXml('truncated-context', contextPrompt);
        }
    } else {
        const contextPrompt = getFilesContent(files, highlights, branchLookup);
        if (contextPrompt) {
            prompt += wrapXml('context', contextPrompt);
        }
    }

    if (errors.length > 0) {
        let errorPrompt = getErrorsContent(errors, branchLookup);
        prompt += errorPrompt;
    }

    if (project.length > 0) {
        const projectContext = project[0];
        if (projectContext) {
            prompt += getProjectContext(projectContext);
        }
    }

    const textContent = parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
    prompt += wrapXml('instruction', textContent);

    userParts.push({ type: 'text', text: prompt });

    if (images.length > 0) {
        const attachments: FileUIPart[] = images.map((i) => ({
            type: 'file',
            mediaType: i.mimeType,
            url: i.content,
        }));
        userParts = userParts.concat(attachments);
    }

    return {
        id,
        role: 'user',
        parts: userParts,
    };
}

export function getTruncatedFilesContent(
    files: FileMessageContext[],
    branchLookup: Map<string, { id: string; name: string }>,
) {
    if (files.length === 0) {
        return '';
    }
    let prompt = '';
    prompt += `${CONTEXT_PROMPTS.truncatedFilesContentPrefix}\n`;
    let index = 1;
    for (const file of files) {
        const branchInfo = branchLookup.get(file.branchId);
        const branchDisplay = branchInfo ? getBranchesContent(branchInfo.id, branchInfo.name) : '';
        const pathDisplay = wrapXml('path', file.path);
        let filePrompt = `${pathDisplay}\n${branchDisplay}\n`;
        filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
        prompt += filePrompt;
        index++;
    }

    return prompt;
}

export function getFilesContent(
    files: FileMessageContext[],
    highlights: HighlightMessageContext[],
    branchLookup: Map<string, { id: string; name: string }>,
) {
    if (files.length === 0) {
        return '';
    }
    let prompt = '';
    prompt += `${CONTEXT_PROMPTS.filesContentPrefix}\n`;
    let index = 1;
    for (const file of files) {
        const branchInfo = branchLookup.get(file.branchId);
        const branchDisplay = branchInfo ? getBranchesContent(branchInfo.id, branchInfo.name) : '';
        const pathDisplay = wrapXml('path', file.path);
        let filePrompt = `${pathDisplay}\n${branchDisplay}\n`;
        filePrompt += `${CODE_FENCE.start}${getLanguageFromFilePath(file.path)}\n`;
        filePrompt += file.content;
        filePrompt += `\n${CODE_FENCE.end}\n`;
        filePrompt += getHighlightsContent(file.path, highlights, branchLookup);

        filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
        prompt += filePrompt;
        index++;
    }

    return prompt;
}

export function getErrorsContent(
    errors: ErrorMessageContext[],
    branchLookup: Map<string, { id: string; name: string }>,
) {
    if (errors.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.errorsContentPrefix}\n`;
    for (const error of errors) {
        const branchInfo = branchLookup.get(error.branchId);
        const branchDisplay = branchInfo ? getBranchesContent(branchInfo.id, branchInfo.name) : '';
        const errorDisplay = wrapXml('error', error.content);
        prompt += `${branchDisplay}\n${errorDisplay}\n`;
    }

    prompt = wrapXml('errors', prompt);
    return prompt;
}

export function getLanguageFromFilePath(filePath: string): string {
    return filePath.split('.').pop() || '';
}

export function getHighlightsContent(
    filePath: string,
    highlights: HighlightMessageContext[],
    branchLookup: Map<string, { id: string; name: string }>,
) {
    const fileHighlights = highlights.filter((h) => h.path === filePath);
    if (fileHighlights.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.highlightPrefix}\n`;
    let index = 1;
    for (const highlight of fileHighlights) {
        const branchInfo = branchLookup.get(highlight.branchId);
        const branchDisplay = branchInfo ? getBranchesContent(branchInfo.id, branchInfo.name) : '';
        const pathDisplay = wrapXml('path', filePath);
        let highlightPrompt = `${pathDisplay}#L${highlight.start}:L${highlight.end}\n${branchDisplay}\n`;
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

export function getBranchesContent(id: string, name: string) {
    return wrapXml('branch', `id: "${id}" - name: "${name}"`);
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
