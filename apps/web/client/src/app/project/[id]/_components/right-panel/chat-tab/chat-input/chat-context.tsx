'use client';

import { MODEL_MAX_TOKENS, OPENROUTER_MODELS } from '@onlook/models';
import {
    Context,
    ContextContent,
    ContextTrigger
} from '@onlook/ui/ai-elements/context';
import { Button } from '@onlook/ui/button';
import type { LanguageModelUsage } from 'ai';
import { useMemo } from 'react';
import { useEditorEngine } from '@/components/store/editor';

export const ChatContextWindow = ({ usage }: { usage: LanguageModelUsage }) => {
    const editorEngine = useEditorEngine();
    
    // Hardcoded for now, but should be dynamic based on the model used
    const maxTokens = MODEL_MAX_TOKENS[OPENROUTER_MODELS.CLAUDE_4_5_SONNET];
    const usedTokens = useMemo(() => {
        if (!usage) return 0;
        const input = usage.inputTokens ?? 0;
        const cached = usage.cachedInputTokens ?? 0;
        return input + cached;
    }, [usage]);

    const handleNewChat = () => {
        editorEngine.chat.conversation.startNewConversation();
        editorEngine.chat.focusChatInput();
    };

    return (
        <Context
            maxTokens={maxTokens}
            usedTokens={usedTokens}
            usage={usage}
        >
            <ContextTrigger />
            <ContextContent>
                <div className="flex flex-col gap-2 p-3">
                    <p className="text-sm text-foreground">Context available</p>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNewChat}
                        className="w-full"
                    >
                        New Chat
                    </Button>
                </div>
            </ContextContent>
        </Context>
    );
};