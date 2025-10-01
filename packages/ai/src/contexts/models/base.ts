import type { ComponentType } from 'react';
import { MessageContextType, type MessageContext } from '@onlook/models';

export interface ContextIcon {
    className?: string;
}

export interface BaseContext {
    readonly contextType: MessageContextType;
    readonly displayName: string;
    readonly icon: ComponentType<ContextIcon>;
    
    /**
     * Generate formatted prompt content for this context type
     */
    getPrompt(context: MessageContext): string;
    
    /**
     * Generate display label for UI
     */
    getLabel(context: MessageContext): string;
}