import { MessageContextType, type MessageContext } from '@onlook/models';
import { AgentRuleContext } from './classes/agent-rule-context';
import { BranchContext } from './classes/branch-context';
import { ErrorContext } from './classes/error-context';
import { FileContext } from './classes/file-context';
import { HighlightContext } from './classes/highlight-context';
import { ImageContext } from './classes/image-context';
import type { ContextClass } from './models/base';

const CONTEXT_CLASSES: Record<MessageContextType, ContextClass | undefined> = {
    [MessageContextType.FILE]: FileContext,
    [MessageContextType.HIGHLIGHT]: HighlightContext,
    [MessageContextType.ERROR]: ErrorContext,
    [MessageContextType.BRANCH]: BranchContext,
    [MessageContextType.IMAGE]: ImageContext,
    [MessageContextType.AGENT_RULE]: AgentRuleContext,
} as const;

// Utility functions for cases where type is determined at runtime
export function getContextPrompt(context: MessageContext): string {
    try {
        const contextClass = CONTEXT_CLASSES[context.type];
        if (!contextClass) {
            throw new Error(`No context class found for type: ${context.type}`);
        }
        return contextClass.getPrompt(context);
    } catch (error) {
        console.error('Error getting context prompt:', error);
        return 'unknown context';
    }
}

export function getContextLabel(context: MessageContext): string {
    try {
        const contextClass = CONTEXT_CLASSES[context.type];
        if (!contextClass) {
            throw new Error(`No context class found for type: ${context.type}`);
        }
        return contextClass.getLabel(context);
    } catch (error) {
        console.error('Error getting context label:', error);
        return 'unknown context';
    }
}

export function getContextClass(type: MessageContextType) {
    return CONTEXT_CLASSES[type];
}

export {
    AgentRuleContext, BranchContext, ErrorContext, FileContext,
    HighlightContext, ImageContext
};

