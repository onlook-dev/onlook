import { MessageContextType, type MessageContext } from '@onlook/models';
import type { ComponentType } from 'react';

export interface ContextIcon {
    className?: string;
}

/**
 * Base abstract class for context implementations
 * Provides type-safe static method signatures that subclasses must implement
 */
export abstract class BaseContext {
    static readonly contextType: MessageContextType;
    static readonly displayName: string;
    static readonly icon: ComponentType<ContextIcon>;

    /**
     * Generate formatted prompt content for this context type
     * Subclasses should override with specific context types
     */
    static getPrompt(context: MessageContext): string {
        throw new Error('getPrompt must be implemented by subclass');
    }

    /**
     * Generate display label for UI
     * Subclasses should override with specific context types
     */
    static getLabel(context: MessageContext): string {
        throw new Error('getLabel must be implemented by subclass');
    }
}

/**
 * Type for context classes with proper static method signatures
 */
export type ContextClass = typeof BaseContext & {
    getPrompt(context: MessageContext): string;
    getLabel(context: MessageContext): string;
};
