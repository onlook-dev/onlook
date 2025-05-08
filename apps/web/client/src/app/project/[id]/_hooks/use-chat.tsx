// Required context in order to use the useChat hook

import { useEditorEngine } from '@/components/store/editor';
import type { EditorEngine } from '@/components/store/editor/engine';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import {
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_FILES_TOOL_PARAMETERS,
} from '@onlook/ai';
import type { ToolCall } from 'ai';
import { createContext, useContext } from 'react';
import { z } from 'zod';

const ChatContext = createContext<UseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, config) => {
            if (config.finishReason === 'stop') {
                editorEngine.chat.conversation.addAssistantMessage(message);
            }
        },
    });
    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}

function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    switch (toolCall.toolName) {
        case LIST_FILES_TOOL_NAME:
            return handleListFilesTool(
                toolCall.args as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
        case READ_FILES_TOOL_NAME:
            return handleReadFilesTool(
                toolCall.args as z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
        case ONLOOK_INSTRUCTIONS_TOOL_NAME:
            return ONLOOK_INSTRUCTIONS;
        default:
            console.error(`Unknown tool call: ${toolCall.toolName}`);
            return 'unknown tool call';
    }
}

function handleListFilesTool(
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    return editorEngine.sandbox.listFiles(args.path);
}

function handleReadFilesTool(
    args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    return editorEngine.sandbox.readFiles(args.paths);
}
