import {
    MessageContextType,
    type AgentRuleMessageContext,
    type BranchMessageContext,
    type ChatMessage,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type MessageContext
} from '@onlook/models';
import type { FileUIPart } from 'ai';
import { ASK_MODE_SYSTEM_PROMPT, CODE_FENCE, CONTEXT_PROMPTS, CREATE_NEW_PAGE_SYSTEM_PROMPT, SHELL_PROMPT, SUGGESTION_SYSTEM_PROMPT, SUMMARY_PROMPTS, SYSTEM_PROMPT } from './constants';
import { wrapXml } from './helpers';
import { AgentRuleContext } from '../contexts/classes/agent-rule-context';
import { BranchContext } from '../contexts/classes/branch-context';
import { ErrorContext } from '../contexts/classes/error-context';
import { FileContext } from '../contexts/classes/file-context';
import { HighlightContext } from '../contexts/classes/highlight-context';

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
    const images = context.filter((c) => c.type === MessageContextType.IMAGE).map((c) => c);
    const branches = context.filter((c) => c.type === MessageContextType.BRANCH).map((c) => c);

    // If there are 50 user messages in the contexts, we can trim all of them except
    // the last one. The logic could be adjusted to trim more or less messages.
    const truncateFileContext = opt.currentMessageIndex < opt.lastUserMessageIndex;
    // Should the code need to trim other types of contexts, it can be done here.

    let prompt = '';
    if (truncateFileContext) {
        const contextPrompt = getTruncatedFilesContent(files);
        if (contextPrompt) {
            prompt += wrapXml('truncated-context', contextPrompt);
        }
    } else {
        const contextPrompt = getFilesContent(files, highlights);
        if (contextPrompt) {
            prompt += wrapXml('context', contextPrompt);
        }
    }

    if (errors.length > 0) {
        const errorPrompt = getErrorsContent(errors);
        prompt += errorPrompt;
    }

    if (agentRules.length > 0) {
        const agentRulePrompt = getAgentRulesContent(agentRules);
        prompt += agentRulePrompt;
    }

    if (branches.length > 0) {
        const branchPrompt = getBranchesContent(branches);
        prompt += branchPrompt;
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

export function getTruncatedFilesContent(files: FileMessageContext[]) {
    return FileContext.getTruncatedFilesContent(files);
}

export function getFilesContent(
    files: FileMessageContext[],
    highlights: HighlightMessageContext[],
) {
    return FileContext.getFilesContent(files, highlights);
}

export function getErrorsContent(errors: ErrorMessageContext[]) {
    return ErrorContext.getErrorsContent(errors);
}

export function getLanguageFromFilePath(filePath: string): string {
    return filePath.split('.').pop() ?? '';
}

export function getHighlightsContent(filePath: string, highlights: HighlightMessageContext[]) {
    return HighlightContext.getHighlightsContent(filePath, highlights);
}

export function getBranchesContent(branches: BranchMessageContext[]) {
    return BranchContext.getBranchesContent(branches);
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

export function getAgentRulesContent(agentRules: AgentRuleMessageContext[]) {
    return AgentRuleContext.getAgentRulesContent(agentRules);
}
