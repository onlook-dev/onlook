import { MessageContextType, type MessageContext } from '@onlook/models';
import { AgentRuleContext } from './classes/agent-rule-context';
import { BranchContext } from './classes/branch-context';
import { ErrorContext } from './classes/error-context';
import { FileContext } from './classes/file-context';
import { HighlightContext } from './classes/highlight-context';
import { ImageContext } from './classes/image-context';
import type { ContextClass } from './models/base';

const CONTEXT_CLASSES: Record<MessageContextType, ContextClass> = {
    [MessageContextType.FILE]: FileContext,
    [MessageContextType.HIGHLIGHT]: HighlightContext,
    [MessageContextType.ERROR]: ErrorContext,
    [MessageContextType.BRANCH]: BranchContext,
    [MessageContextType.IMAGE]: ImageContext,
    [MessageContextType.AGENT_RULE]: AgentRuleContext,
} as const;

// Utility functions for cases where type is determined at runtime
export function getContextPrompt(context: MessageContext): string {
    const contextClass = CONTEXT_CLASSES[context.type];
    return contextClass.getPrompt(context);
}

export function getContextLabel(context: MessageContext): string {
    const contextClass = CONTEXT_CLASSES[context.type];
    return contextClass.getLabel(context);
}

export function getContextClass(type: MessageContextType) {
    return CONTEXT_CLASSES[type];
}

export {
    AgentRuleContext, BranchContext, ErrorContext, FileContext,
    HighlightContext, ImageContext
};

