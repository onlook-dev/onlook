import type { ComponentType } from 'react';
import { MessageContextType, type MessageContext } from '@onlook/models';

export interface ContextIcon {
    className?: string;
}

export abstract class BaseContext {
    static readonly contextType: MessageContextType;
    static readonly displayName: string;
    static readonly icon: ComponentType<ContextIcon>;
    
    /**
     * Generate formatted prompt content for this context type
     */
    static getPrompt(context: MessageContext): string {
        throw new Error('getPrompt must be implemented by subclass');
    }
    
    /**
     * Generate display label for UI
     */
    static getLabel(context: MessageContext): string {
        throw new Error('getLabel must be implemented by subclass');
    }
}