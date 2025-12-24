import {
    MessageContextType,
    type ChatMessage,
    type MessageContext
} from '@onlook/models';
import type { FileUIPart } from 'ai';
import { AgentRuleContext, BranchContext, ErrorContext, FileContext, ImageContext } from '../contexts/classes';
import { ASK_MODE_SYSTEM_PROMPT, CREATE_NEW_PAGE_SYSTEM_PROMPT, SHELL_PROMPT, SUGGESTION_SYSTEM_PROMPT, SUMMARY_PROMPTS, SYSTEM_PROMPT } from './constants';
import { wrapXml } from './helpers';

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
    parts: ChatMessage['parts'],
    context: MessageContext[],
    opt: HydrateMessageOptions,
): ChatMessage {
    let userParts: ChatMessage['parts'] = [];
    const files = context.filter((c) => c.type === MessageContextType.FILE).map((c) => c);
    const highlights = context.filter((c) => c.type === MessageContextType.HIGHLIGHT).map((c) => c);
    const errors = context.filter((c) => c.type === MessageContextType.ERROR).map((c) => c);
    const agentRules = context.filter((c) => c.type === MessageContextType.AGENT_RULE).map((c) => c);
    const allImages = context.filter((c) => c.type === MessageContextType.IMAGE).map((c) => c);
    const externalImages = allImages.filter((img) => img.source === 'external');
    const localImages = allImages.filter((img) => img.source === 'local');
    const branches = context.filter((c) => c.type === MessageContextType.BRANCH).map((c) => c);

    // If there are 50 user messages in the contexts, we can trim all of them except
    // the last one. The logic could be adjusted to trim more or less messages.
    const truncateFileContext = opt.currentMessageIndex < opt.lastUserMessageIndex;
    // Should the code need to trim other types of contexts, it can be done here.

    let prompt = '';
    if (truncateFileContext) {
        const contextPrompt = FileContext.getTruncatedFilesContent(files);
        if (contextPrompt) {
            prompt += wrapXml('truncated-context', contextPrompt);
        }
    } else {
        const contextPrompt = FileContext.getFilesContent(files, highlights);
        if (contextPrompt) {
            prompt += wrapXml('context', contextPrompt);
        }
    }

    if (errors.length > 0) {
        const errorPrompt = ErrorContext.getErrorsContent(errors);
        prompt += errorPrompt;
    }

    if (agentRules.length > 0) {
        const agentRulePrompt = AgentRuleContext.getAgentRulesContent(agentRules);
        prompt += agentRulePrompt;
    }

    if (branches.length > 0) {
        const branchPrompt = BranchContext.getBranchesContent(branches);
        prompt += branchPrompt;
    }

    if (localImages.length > 0) {
        const localImageList = localImages
            .map((img) => `- ${img.displayName}: ${img.path} (branch: ${img.branchId})`)
            .join('\n');
        prompt += wrapXml('local-images',
            'These images already exist in the project at the specified paths. Reference them directly in your code without uploading:\n' + localImageList
        );
    }

    if (externalImages.length > 0) {
        const imageList = externalImages
            .map((img, idx) => `${idx + 1}. ${img.displayName} (ID: ${img.id || 'unknown'})`)
            .join('\n');
        prompt += wrapXml('available-images',
            'These are new images that need to be uploaded to the project using the upload_image tool:\n' + imageList
        );
    }

    const textContent = parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('\n');
    prompt += wrapXml('instruction', textContent);

    userParts.push({ type: 'text', text: prompt });

    if (allImages.length > 0) {
        const fileParts: FileUIPart[] = ImageContext.toFileUIParts(allImages);
        userParts = userParts.concat(fileParts);
    }

    return {
        id,
        role: 'user',
        parts: userParts,
    };
}

export function getLanguageFromFilePath(filePath: string): string {
    return filePath.split('.').pop() ?? '';
}

export function getBranchContent(id: string) {
    return wrapXml('branch', `id: "${id}"`);
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
