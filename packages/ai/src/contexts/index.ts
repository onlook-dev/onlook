import { MessageContextType, type MessageContext } from '@onlook/models';
import { AgentRuleContext } from './classes/agent-rule-context';
import { BranchContext } from './classes/branch-context';
import { ErrorContext } from './classes/error-context';
import { FileContext } from './classes/file-context';
import { HighlightContext } from './classes/highlight-context';
import { ImageContext } from './classes/image-context';

const CONTEXT_CLASSES = {
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
    return contextClass.getPrompt(context as any);
}

export function getContextLabel(context: MessageContext): string {
    const contextClass = CONTEXT_CLASSES[context.type];
    return contextClass.getLabel(context as any);
}

export function getContextClass(type: MessageContextType) {
    return CONTEXT_CLASSES[type];
}

export type { BaseContext } from './models/base';
export {
    AgentRuleContext, BranchContext, ErrorContext, FileContext,
    HighlightContext, ImageContext
};

